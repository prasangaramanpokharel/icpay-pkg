import type { Identity } from "@icp-sdk/core/agent"
import type { Principal } from "@icp-sdk/core/principal"

export interface IcCronClientConfig {
  apiKey?: string
  canisterId?: string
  host?: string
  identity?: Identity
  fetch?: typeof fetch
}

export type HttpMethodType = "GET" | "POST" | "HEAD"

export interface WebhookTargetOptions {
  type: "HttpWebhook"
  url: string
  method?: HttpMethodType
  headers?: Record<string, string> | [string, string][]
  body?: string | Uint8Array
}

export interface CanisterTargetOptions {
  type: "CanisterCall"
  canisterId: Principal | string
  method: string
  payload?: Uint8Array | string
}

export type JobTargetOptions = WebhookTargetOptions | CanisterTargetOptions

export interface CreateJobOptions {
  projectId: bigint | number | string
  label?: string
  name?: string
  cronExpression?: string
  cronExpr?: string
  schedule?: string
  target: JobTargetOptions
  maxRetries?: number
}

export interface UpdateJobOptions {
  jobId: bigint | number
  label?: string
  name?: string
  cronExpression?: string
  cronExpr?: string
  schedule?: string
  target?: JobTargetOptions
  maxRetries?: number
}

export interface TriggerJobOptions {
  projectId: string | number | bigint
  jobId: number | bigint
  apiKey?: string
}

export interface TriggerJobResponse {
  ok: boolean
  job_id?: number
  status?: string
  error?: string
}

export type RemoteJobTarget =
  | {
      CanisterCall: {
        canister_id: Principal
        method: string
        payload: Uint8Array
      }
    }
  | {
      HttpWebhook: {
        url: string
        method: { GET: null } | { POST: null } | { HEAD: null }
        headers: [string, string][]
        body: [] | [Uint8Array]
      }
    }

export interface RemoteCompiledCron {
  minutes: bigint
  hours: number
  days: number
  months: number
  weekdays: number
}

export type RemoteJobStatus =
  | { Active: null }
  | { Paused: null }
  | { Completed: null }
  | { ExhaustedCredits: null }
  | { DeadLetterQueue: null }
  | { AutoPausedDormant: null }
  | { TargetUnavailable: null }

export interface RemoteJobRecord {
  id: bigint
  project_id: bigint
  owner: Principal
  label: string
  target: RemoteJobTarget
  cron_expression: string
  compiled_cron: RemoteCompiledCron
  status: RemoteJobStatus
  max_retries: number
  consecutive_failures: number
  total_runs: bigint
  next_run_at: [] | [bigint]
  last_run_at: [] | [bigint]
  created_at: bigint
  updated_at: bigint
}

export interface RemoteProjectRecord {
  id: bigint
  owner: Principal
  name: string
  created_at: bigint
}

export interface RemoteCreateJobArgs {
  project_id: bigint
  label: string
  target: RemoteJobTarget
  cron_expression: string
  max_retries: [] | [number]
}

export interface RemoteUpdateJobArgs {
  job_id: bigint
  label: [] | [string]
  target: [] | [RemoteJobTarget]
  cron_expression: [] | [string]
  max_retries: [] | [number]
}

export interface RemoteJobSummary {
  id: bigint
  project_id: bigint
  label: string
  cron_expression: string
  target_type: string
  target_preview: string
  status: string
  consecutive_failures: number
  total_runs: bigint
  next_run_at: [] | [bigint]
  last_run_at: [] | [bigint]
}

export interface RemoteExecutionLog {
  log_id: bigint
  job_id: bigint
  started_at: bigint
  duration_ms: number
  success: boolean
  status_code: [] | [number]
  response_snippet: string
  error: [] | [string]
}

export interface RemoteApiKeySummary {
  key_hash: Uint8Array
  project_id: bigint
  label: string
  revoked: boolean
  created_at: bigint
  raw_key?: string
}

export interface RemoteCreditBalance {
  free_runs_remaining: bigint
  prepaid_credits: bigint
  total_available: bigint
  total_used: bigint
}

export interface RemotePackQuote {
  pack_tier: number
  credits: bigint
  usd_cents: number
  icp_e8s: bigint
  treasury_principal: string
}

export interface RemoteCronAuditStats {
  total_projects: bigint
  total_jobs: bigint
  active_jobs: bigint
  paused_jobs: bigint
  other_jobs: bigint
  total_runs_executed: bigint
  total_api_keys: bigint
  active_api_keys: bigint
  revoked_api_keys: bigint
  rate_per_run_usd_micros: bigint
  treasury_principal: string
  total_users_with_credits: bigint
  total_prepaid_credits_held: bigint
  total_lifetime_credits_purchased: bigint
  total_lifetime_credits_used: bigint
  cycles_balance: bigint
  memory_pages: bigint
}
