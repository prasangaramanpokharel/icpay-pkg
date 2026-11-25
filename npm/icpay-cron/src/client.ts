import { Actor, HttpAgent, type Identity } from "@icp-sdk/core/agent"
import { Principal } from "@icp-sdk/core/principal"
import { cronIdl } from "./idl.js"
import {
  AuthenticationError,
  IcCronError,
  JobNotFoundError,
  ValidationError,
} from "./errors.js"
import { formatProjectId, parseProjectId } from "./utils.js"
import type {
  CreateJobOptions,
  IcCronClientConfig,
  RemoteApiKeySummary,
  RemoteCreateJobArgs,
  RemoteCreditBalance,
  RemoteCronAuditStats,
  RemoteExecutionLog,
  RemoteJobRecord,
  RemoteJobSummary,
  RemotePackQuote,
  RemoteProjectRecord,
  RemoteUpdateJobArgs,
  TriggerJobOptions,
  TriggerJobResponse,
  UpdateJobOptions,
} from "./types.js"

export const DEFAULT_CANISTER_ID = "w2fxo-5qaaa-aaaan-q6zxq-cai"
export const DEFAULT_HOST = "https://icp0.io"

type RawCronActor = {
  create_project: (name: string) => Promise<{ Ok: RemoteProjectRecord } | { Err: string }>
  rename_project: (projectId: bigint, newName: string) => Promise<{ Ok: RemoteProjectRecord } | { Err: string }>
  pause_project: (projectId: bigint) => Promise<{ Ok: bigint } | { Err: string }>
  resume_project: (projectId: bigint) => Promise<{ Ok: bigint } | { Err: string }>
  list_my_projects: () => Promise<RemoteProjectRecord[]>

  create_job: (args: RemoteCreateJobArgs) => Promise<{ Ok: RemoteJobRecord } | { Err: string }>
  update_job: (args: RemoteUpdateJobArgs) => Promise<{ Ok: RemoteJobRecord } | { Err: string }>
  delete_job: (jobId: bigint) => Promise<{ Ok: null } | { Err: string }>
  pause_job: (jobId: bigint) => Promise<{ Ok: null } | { Err: string }>
  resume_job: (jobId: bigint) => Promise<{ Ok: null } | { Err: string }>
  trigger_job: (jobId: bigint) => Promise<{ Ok: null } | { Err: string }>
  list_jobs: (projectId: [] | [bigint]) => Promise<RemoteJobSummary[]>
  get_job: (jobId: bigint) => Promise<{ Ok: RemoteJobRecord } | { Err: string }>
  get_job_logs: (jobId: bigint, limit: [] | [bigint]) => Promise<RemoteExecutionLog[]>

  create_api_key: (projectId: bigint, label: string) => Promise<{ Ok: string } | { Err: string }>
  revoke_api_key: (keyHash: Uint8Array | number[]) => Promise<{ Ok: null } | { Err: string }>
  list_api_keys: (projectId: bigint) => Promise<{ Ok: RemoteApiKeySummary[] } | { Err: string }>

  get_my_credits: () => Promise<RemoteCreditBalance>
  get_pack_quotes: () => Promise<RemotePackQuote[]>
  buy_pack: (tier: number, blockIndex: bigint) => Promise<{ Ok: bigint } | { Err: string }>
  quote_credits: (credits: bigint) => Promise<RemotePackQuote>
  buy_credits: (credits: bigint, blockIndex: bigint) => Promise<{ Ok: bigint } | { Err: string }>
  set_rate_per_run: (usdMicros: bigint) => Promise<{ Ok: bigint } | { Err: string }>
  get_rate_per_run: () => Promise<bigint>
  get_audit_stats: () => Promise<RemoteCronAuditStats>
}

export class IcCronClient {
  public readonly apiKey?: string
  public readonly canisterId: string
  public readonly host: string
  private readonly identity?: Identity
  private readonly customFetch: typeof fetch
  private actorPromise?: Promise<RawCronActor>

  constructor(config: IcCronClientConfig = {}) {
    this.apiKey = config.apiKey
    this.canisterId = config.canisterId?.trim() || DEFAULT_CANISTER_ID
    this.host = config.host?.trim() || DEFAULT_HOST
    this.identity = config.identity
    this.customFetch = config.fetch || globalThis.fetch.bind(globalThis)
  }

  async trigger(options: TriggerJobOptions): Promise<TriggerJobResponse> {
    const key = options.apiKey || this.apiKey
    if (!key) {
      throw new AuthenticationError("No API key provided. Pass apiKey in client config or trigger options.")
    }

    const projectIdNum =
      typeof options.projectId === "string"
        ? parseProjectId(options.projectId) || BigInt(options.projectId)
        : BigInt(options.projectId)

    const jobIdNum = BigInt(options.jobId)
    const formattedProjectId = formatProjectId(projectIdNum)

    const isLocal = this.host.includes("127.0.0.1") || this.host.includes("localhost")
    let triggerUrl: string
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }

    if (isLocal) {
      triggerUrl = `${this.host.replace(/\/+$/, "")}/api/v1/cron/trigger?canisterId=${this.canisterId}`
      headers["Host"] = `${this.canisterId}.raw.localhost`
    } else {
      triggerUrl = `https://${this.canisterId}.raw.icp0.io/api/v1/cron/trigger`
    }

    const res = await this.customFetch(triggerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        project_id: formattedProjectId,
        job_id: Number(jobIdNum),
      }),
    })

    const data = (await res.json()) as TriggerJobResponse

    if (!res.ok) {
      if (res.status === 401) {
        throw new AuthenticationError(data.error || "Invalid or revoked API key", data)
      }
      if (res.status === 404) {
        throw new JobNotFoundError(Number(jobIdNum), data)
      }
      throw new IcCronError(data.error || `Trigger failed with HTTP ${res.status}`, "TRIGGER_FAILED", res.status, data)
    }

    return data
  }

  private async getActor(): Promise<RawCronActor> {
    if (!this.actorPromise) {
      this.actorPromise = (async () => {
        const isLocal = this.host.includes("127.0.0.1") || this.host.includes("localhost")
        const agent = HttpAgent.createSync({ identity: this.identity, host: this.host })
        if (isLocal) {
          await agent.fetchRootKey()
        }
        return Actor.createActor<RawCronActor>(cronIdl, {
          agent,
          canisterId: Principal.fromText(this.canisterId),
        })
      })()
    }
    return this.actorPromise
  }

  async listProjects(): Promise<RemoteProjectRecord[]> {
    const actor = await this.getActor()
    return actor.list_my_projects()
  }

  async createProject(name: string): Promise<RemoteProjectRecord> {
    const trimmed = name.trim()
    if (!trimmed) throw new ValidationError("Project name cannot be empty")
    const actor = await this.getActor()
    const res = await actor.create_project(trimmed)
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "CREATE_PROJECT_FAILED")
  }

  async renameProject(projectId: bigint | number, newName: string): Promise<RemoteProjectRecord> {
    const actor = await this.getActor()
    const res = await actor.rename_project(BigInt(projectId), newName)
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "RENAME_PROJECT_FAILED")
  }

  async pauseProject(projectId: bigint | number): Promise<bigint> {
    const actor = await this.getActor()
    const res = await actor.pause_project(BigInt(projectId))
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "PAUSE_PROJECT_FAILED")
  }

  async resumeProject(projectId: bigint | number): Promise<bigint> {
    const actor = await this.getActor()
    const res = await actor.resume_project(BigInt(projectId))
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "RESUME_PROJECT_FAILED")
  }

  private httpBaseUrl(): { baseUrl: string; headers: Record<string, string> } {
    const key = this.apiKey
    if (!key) {
      throw new AuthenticationError("No API key provided. Pass apiKey in client config.")
    }
    const isLocal = this.host.includes("127.0.0.1") || this.host.includes("localhost")
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }
    if (isLocal) {
      headers["Host"] = `${this.canisterId}.raw.localhost`
      return { baseUrl: this.host.replace(/\/+$/, ""), headers }
    }
    return { baseUrl: `https://${this.canisterId}.raw.icp0.io`, headers }
  }

  private httpEndpoint(path: string): { url: string; headers: Record<string, string> } {
    const { baseUrl, headers } = this.httpBaseUrl()
    const isLocal = this.host.includes("127.0.0.1") || this.host.includes("localhost")
    const url = isLocal ? `${baseUrl}${path}?canisterId=${this.canisterId}` : `${baseUrl}${path}`
    return { url, headers }
  }

  async createJob(options: CreateJobOptions): Promise<RemoteJobRecord> {
    const jobLabel = (options.label || options.name || "").trim()
    if (!jobLabel) throw new ValidationError("Job label is required")

    const cronExpr = (options.cronExpression || options.cronExpr || options.schedule || "").trim()
    if (!cronExpr) throw new ValidationError("Cron expression is required")

    if (this.apiKey && !this.identity) {
      const { url, headers } = this.httpEndpoint("/api/v1/cron/jobs")
      const targetPayload =
        options.target.type === "HttpWebhook"
          ? {
              type: "HttpWebhook",
              url: options.target.url,
              method: options.target.method || "POST",
              headers: Array.isArray(options.target.headers)
                ? options.target.headers
                : Object.entries(options.target.headers || {}),
              body:
                typeof options.target.body === "string"
                  ? options.target.body
                  : options.target.body
                    ? new TextDecoder().decode(options.target.body)
                    : undefined,
            }
          : {
              type: "CanisterCall",
              canister_id:
                typeof options.target.canisterId === "string"
                  ? options.target.canisterId
                  : options.target.canisterId.toText(),
              method: options.target.method,
              payload: options.target.payload
                ? Array.from(
                    typeof options.target.payload === "string"
                      ? new TextEncoder().encode(options.target.payload)
                      : options.target.payload
                  )
                : [],
            }

      const res = await this.customFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          label: jobLabel,
          cron_expression: cronExpr,
          max_retries: options.maxRetries,
          target: targetPayload,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; job?: RemoteJobRecord; error?: string }
      if (!res.ok || !data.job) {
        if (res.status === 401) {
          throw new AuthenticationError(data.error || "Invalid or revoked API key", data)
        }
        throw new IcCronError(data.error || `Create job failed with HTTP ${res.status}`, "CREATE_JOB_FAILED", res.status, data)
      }
      return data.job
    }

    const actor = await this.getActor()
    const projectIdNum =
      typeof options.projectId === "string"
        ? parseProjectId(options.projectId) || BigInt(options.projectId)
        : BigInt(options.projectId)

    let target: RemoteCreateJobArgs["target"]
    if (options.target.type === "HttpWebhook") {
      const headersArr: [string, string][] = Array.isArray(options.target.headers)
        ? options.target.headers
        : Object.entries(options.target.headers || {})

      let bodyBlob: [] | [Uint8Array] = []
      if (options.target.body) {
        bodyBlob = [
          typeof options.target.body === "string"
            ? new TextEncoder().encode(options.target.body)
            : options.target.body,
        ]
      }

      const methodType = options.target.method || "POST"
      const methodObj =
        methodType === "GET" ? { GET: null } : methodType === "HEAD" ? { HEAD: null } : { POST: null }

      target = {
        HttpWebhook: {
          url: options.target.url,
          method: methodObj,
          headers: headersArr,
          body: bodyBlob,
        },
      }
    } else {
      const canId =
        typeof options.target.canisterId === "string"
          ? Principal.fromText(options.target.canisterId)
          : options.target.canisterId

      let payloadBytes = new Uint8Array()
      if (options.target.payload) {
        payloadBytes =
          typeof options.target.payload === "string"
            ? new TextEncoder().encode(options.target.payload)
            : new Uint8Array(options.target.payload)
      }

      target = {
        CanisterCall: {
          canister_id: canId,
          method: options.target.method,
          payload: payloadBytes,
        },
      }
    }

    const res = await actor.create_job({
      project_id: projectIdNum,
      label: jobLabel,
      cron_expression: cronExpr,
      target,
      max_retries: options.maxRetries ? [options.maxRetries] : [],
    })

    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "CREATE_JOB_FAILED")
  }

  async listJobs(projectId?: bigint | number): Promise<RemoteJobSummary[]> {
    if (this.apiKey && !this.identity) {
      const { url, headers } = this.httpEndpoint("/api/v1/cron/jobs")
      const res = await this.customFetch(url, { method: "GET", headers })
      const data = (await res.json()) as { ok?: boolean; jobs?: RemoteJobSummary[]; error?: string }
      if (!res.ok) {
        if (res.status === 401) {
          throw new AuthenticationError(data.error || "Invalid or revoked API key", data)
        }
        throw new IcCronError(data.error || `List jobs failed with HTTP ${res.status}`, "LIST_JOBS_FAILED", res.status, data)
      }
      return data.jobs ?? []
    }
    const actor = await this.getActor()
    return actor.list_jobs(projectId !== undefined ? [BigInt(projectId)] : [])
  }

  async getJob(jobId: bigint | number): Promise<RemoteJobRecord> {
    const actor = await this.getActor()
    const res = await actor.get_job(BigInt(jobId))
    if ("Ok" in res) return res.Ok
    throw new JobNotFoundError(jobId, res.Err)
  }

  async updateJob(options: UpdateJobOptions): Promise<RemoteJobRecord> {
    const actor = await this.getActor()
    const labelVal = options.label || options.name
    const cronVal = options.cronExpression || options.cronExpr || options.schedule
    const res = await actor.update_job({
      job_id: BigInt(options.jobId),
      label: labelVal ? [labelVal.trim()] : [],
      cron_expression: cronVal ? [cronVal.trim()] : [],
      target: [],
      max_retries: options.maxRetries ? [options.maxRetries] : [],
    })
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "UPDATE_JOB_FAILED")
  }

  private async httpJobAction(path: string, method: "POST" | "DELETE" | "GET", errCode: string, jobId?: bigint | number) {
    const { url, headers } = this.httpEndpoint(path)
    const res = await this.customFetch(url, { method, headers })
    const data = (await res.json()) as Record<string, unknown> & { error?: string }
    if (!res.ok) {
      if (res.status === 401) {
        throw new AuthenticationError(data.error || "Invalid or revoked API key", data)
      }
      if (res.status === 404 && jobId !== undefined) {
        throw new JobNotFoundError(Number(jobId), data)
      }
      throw new IcCronError(data.error || `Request failed with HTTP ${res.status}`, errCode, res.status, data)
    }
    return data
  }

  async pauseJob(jobId: bigint | number): Promise<void> {
    if (this.apiKey && !this.identity) {
      const id = BigInt(jobId)
      await this.httpJobAction(`/api/v1/cron/jobs/${id.toString()}/pause`, "POST", "PAUSE_JOB_FAILED", id)
      return
    }
    const actor = await this.getActor()
    const res = await actor.pause_job(BigInt(jobId))
    if ("Ok" in res) return
    throw new IcCronError(res.Err, "PAUSE_JOB_FAILED")
  }

  async resumeJob(jobId: bigint | number): Promise<void> {
    if (this.apiKey && !this.identity) {
      const id = BigInt(jobId)
      await this.httpJobAction(`/api/v1/cron/jobs/${id.toString()}/resume`, "POST", "RESUME_JOB_FAILED", id)
      return
    }
    const actor = await this.getActor()
    const res = await actor.resume_job(BigInt(jobId))
    if ("Ok" in res) return
    throw new IcCronError(res.Err, "RESUME_JOB_FAILED")
  }

  async deleteJob(jobId: bigint | number): Promise<void> {
    if (this.apiKey && !this.identity) {
      const id = BigInt(jobId)
      await this.httpJobAction(`/api/v1/cron/jobs/${id.toString()}`, "DELETE", "DELETE_JOB_FAILED", id)
      return
    }
    const actor = await this.getActor()
    const res = await actor.delete_job(BigInt(jobId))
    if ("Ok" in res) return
    throw new IcCronError(res.Err, "DELETE_JOB_FAILED")
  }

  async getJobLogs(jobId: bigint | number, limit: number = 20): Promise<RemoteExecutionLog[]> {
    if (this.apiKey && !this.identity) {
      const id = BigInt(jobId)
      const data = await this.httpJobAction(`/api/v1/cron/jobs/${id.toString()}/logs`, "GET", "GET_LOGS_FAILED", id)
      return (data.logs as RemoteExecutionLog[] | undefined) ?? []
    }
    const actor = await this.getActor()
    return actor.get_job_logs(BigInt(jobId), [BigInt(limit)])
  }

  async getProjectLogs(): Promise<RemoteExecutionLog[]> {
    const data = await this.httpJobAction("/api/v1/cron/logs", "GET", "GET_PROJECT_LOGS_FAILED")
    return (data.logs as RemoteExecutionLog[] | undefined) ?? []
  }

  async createApiKey(projectId: bigint | number, label: string): Promise<string> {
    const actor = await this.getActor()
    const res = await actor.create_api_key(BigInt(projectId), label)
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "CREATE_API_KEY_FAILED")
  }

  async listApiKeys(projectId: bigint | number): Promise<RemoteApiKeySummary[]> {
    const actor = await this.getActor()
    const res = await actor.list_api_keys(BigInt(projectId))
    if ("Ok" in res) return res.Ok
    throw new IcCronError(res.Err, "LIST_API_KEYS_FAILED")
  }

  async revokeApiKey(keyHash: Uint8Array | number[]): Promise<void> {
    const actor = await this.getActor()
    const res = await actor.revoke_api_key(keyHash)
    if ("Ok" in res) return
    throw new IcCronError(res.Err, "REVOKE_API_KEY_FAILED")
  }

  async getMyCredits(): Promise<RemoteCreditBalance> {
    const actor = await this.getActor()
    return actor.get_my_credits()
  }

  async getPackQuotes(): Promise<RemotePackQuote[]> {
    const actor = await this.getActor()
    return actor.get_pack_quotes()
  }

  async getAuditStats(): Promise<RemoteCronAuditStats> {
    const actor = await this.getActor()
    return actor.get_audit_stats()
  }
}

export const icCron = (config?: IcCronClientConfig) => new IcCronClient(config)
export const IcCron = IcCronClient
