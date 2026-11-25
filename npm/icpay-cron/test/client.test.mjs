import test from "node:test"
import assert from "node:assert/strict"
import {
  IcCronClient,
  IcCron,
  icCron,
  IcCronError,
  AuthenticationError,
  JobNotFoundError,
  ValidationError,
  formatProjectId,
  parseProjectId,
  isValidCron,
  CRON_PRESETS,
  DEFAULT_CANISTER_ID,
  DEFAULT_HOST,
} from "../dist/index.js"

test("icCron and IcCron export aliases", () => {
  const c1 = icCron({ apiKey: "key_1" })
  assert.ok(c1 instanceof IcCronClient)
  assert.equal(c1.apiKey, "key_1")

  const c2 = new IcCron({ apiKey: "key_2" })
  assert.ok(c2 instanceof IcCronClient)
  assert.equal(c2.apiKey, "key_2")
})

test("IcCronClient defaults", () => {
  const client = new IcCronClient()
  assert.equal(client.canisterId, DEFAULT_CANISTER_ID)
  assert.equal(client.host, DEFAULT_HOST)
  assert.equal(client.apiKey, undefined)
})

test("IcCronClient custom config", () => {
  const client = new IcCronClient({
    apiKey: "icp_cron_custom_key",
    canisterId: "uxrrr-q7777-77774-qaaaq-cai",
    host: "http://127.0.0.1:4943",
  })
  assert.equal(client.apiKey, "icp_cron_custom_key")
  assert.equal(client.canisterId, "uxrrr-q7777-77774-qaaaq-cai")
  assert.equal(client.host, "http://127.0.0.1:4943")
})

test("formatProjectId & parseProjectId roundtrip", () => {
  assert.equal(formatProjectId(1), "cr_00000001")
  assert.equal(formatProjectId(15), "cr_0000000f")
  assert.equal(parseProjectId("cr_00000001"), 1n)
  assert.equal(parseProjectId("cr_0000000f"), 15n)
  assert.equal(parseProjectId("123"), 123n)
  assert.equal(parseProjectId("invalid"), null)
})

test("isValidCron validations", () => {
  assert.equal(isValidCron("* * * * *"), true)
  assert.equal(isValidCron("*/5 * * * *"), true)
  assert.equal(isValidCron("0 0 * * *"), true)
  assert.equal(isValidCron("@hourly"), true)
  assert.equal(isValidCron("@daily"), true)
  assert.equal(isValidCron("invalid cron"), false)
  assert.equal(isValidCron(""), false)
  assert.equal(isValidCron("* * * *"), false)
})

test("CRON_PRESETS constants", () => {
  assert.equal(CRON_PRESETS.EVERY_MINUTE, "* * * * *")
  assert.equal(CRON_PRESETS.HOURLY, "0 * * * *")
  assert.equal(CRON_PRESETS.DAILY, "0 0 * * *")
})

test("HTTP trigger missing apiKey throws AuthenticationError", async () => {
  const client = new IcCronClient()
  await assert.rejects(
    async () => {
      await client.trigger({ projectId: 1, jobId: 1 })
    },
    (err) => err instanceof AuthenticationError
  )
})

test("HTTP trigger mock success", async () => {
  const mockFetch = async (url, opts) => {
    assert.ok(url.includes("/api/v1/cron/trigger"))
    assert.equal(opts.method, "POST")
    assert.equal(opts.headers.Authorization, "Bearer icp_cron_test")
    const body = JSON.parse(opts.body)
    assert.equal(body.job_id, 1)
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, job_id: 1, status: "triggered" }),
    }
  }

  const client = new IcCronClient({
    apiKey: "icp_cron_test",
    fetch: mockFetch,
  })

  const res = await client.trigger({ projectId: 1, jobId: 1 })
  assert.equal(res.ok, true)
  assert.equal(res.job_id, 1)
  assert.equal(res.status, "triggered")
})

test("HTTP trigger mock 401 unauthorized", async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ ok: false, error: "Invalid or revoked API key" }),
  })

  const client = new IcCronClient({
    apiKey: "icp_cron_invalid",
    fetch: mockFetch,
  })

  await assert.rejects(
    async () => {
      await client.trigger({ projectId: 1, jobId: 1 })
    },
    (err) => err instanceof AuthenticationError && err.statusCode === 401
  )
})

test("HTTP trigger mock 404 job not found", async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ ok: false, error: "Job 999 not found" }),
  })

  const client = new IcCronClient({
    apiKey: "icp_cron_valid",
    fetch: mockFetch,
  })

  await assert.rejects(
    async () => {
      await client.trigger({ projectId: 1, jobId: 999 })
    },
    (err) => err instanceof JobNotFoundError && err.statusCode === 404
  )
})

test("HTTP trigger live test against local canister with user API key", async () => {
  const apiKey = "icp_cron_f880a426c475f04859a30828fb1234a5e844f13d659e8b94e1a48eb70af9bc68"
  const client = icCron({
    apiKey,
    canisterId: "uxrrr-q7777-77774-qaaaq-cai",
    host: "http://127.0.0.1:4943",
  })

  try {
    const res = await client.trigger({ projectId: "cr_15js4d87v7", jobId: 1 })
    assert.equal(res.ok, true)
    assert.equal(res.job_id, 1)
    assert.equal(res.status, "triggered")
  } catch (err) {
    if (err.message && err.message.includes("ECONNREFUSED")) {
      console.log("Local replica skipped (offline).")
    } else {
      throw err
    }
  }
})

test("On-chain job lifecycle method signatures validation", () => {
  const client = icCron({ apiKey: "test" })
  assert.equal(typeof client.createProject, "function")
  assert.equal(typeof client.listProjects, "function")
  assert.equal(typeof client.renameProject, "function")
  assert.equal(typeof client.pauseProject, "function")
  assert.equal(typeof client.resumeProject, "function")
  assert.equal(client.deleteProject, undefined)
  assert.equal(typeof client.createJob, "function")
  assert.equal(typeof client.updateJob, "function")
  assert.equal(typeof client.pauseJob, "function")
  assert.equal(typeof client.resumeJob, "function")
  assert.equal(typeof client.deleteJob, "function")
  assert.equal(typeof client.listJobs, "function")
  assert.equal(typeof client.getJob, "function")
  assert.equal(typeof client.getJobLogs, "function")
  assert.equal(typeof client.createApiKey, "function")
  assert.equal(typeof client.listApiKeys, "function")
  assert.equal(typeof client.revokeApiKey, "function")
  assert.equal(client.deleteApiKey, undefined)
  assert.equal(typeof client.getMyCredits, "function")
  assert.equal(typeof client.getPackQuotes, "function")
  assert.equal(typeof client.getAuditStats, "function")
})

test("Live on-chain end-to-end lifecycle test against local canister", async () => {
  const { Ed25519KeyIdentity } = await import("@icp-sdk/core/identity")
  const identity = Ed25519KeyIdentity.generate()
  const client = icCron({
    canisterId: "uxrrr-q7777-77774-qaaaq-cai",
    host: "http://127.0.0.1:4943",
    identity,
  })

  const credits = await client.getMyCredits()
  assert.ok(credits.free_runs_remaining >= 0n)

  const proj = await client.createProject("E2E Test Project")
  assert.ok(proj.id >= 1n)
  assert.equal(proj.name, "E2E Test Project")

  const projects = await client.listProjects()
  assert.ok(projects.some((p) => p.id === proj.id))

  const job = await client.createJob({
    projectId: proj.id,
    label: "E2E Webhook Job",
    cronExpression: "* * * * *",
    target: {
      type: "HttpWebhook",
      url: "https://httpbin.org/status/200",
      method: "GET",
      headers: [["User-Agent", "icCron-Live-E2E"]],
    },
  })
  assert.ok(job.id >= 1n)
  assert.equal(job.label, "E2E Webhook Job")
  assert.deepEqual(job.status, { Active: null })

  const fetched = await client.getJob(job.id)
  assert.equal(fetched.id, job.id)
  assert.equal(fetched.label, "E2E Webhook Job")

  const jobs = await client.listJobs(proj.id)
  assert.ok(jobs.some((j) => j.id === job.id))

  await client.pauseJob(job.id)
  const paused = await client.getJob(job.id)
  assert.deepEqual(paused.status, { Paused: null })

  await client.resumeJob(job.id)
  const resumed = await client.getJob(job.id)
  assert.deepEqual(resumed.status, { Active: null })

  const apiKey = await client.createApiKey(proj.id, "e2e-ci-key")
  assert.ok(typeof apiKey === "string" && apiKey.startsWith("icp_cron_"))

  const keys = await client.listApiKeys(proj.id)
  assert.ok(keys.length >= 1)

  const triggerRes = await client.trigger({
    projectId: proj.id,
    jobId: job.id,
    apiKey,
  })
  assert.equal(triggerRes.ok, true)
  assert.equal(triggerRes.job_id, Number(job.id))
  assert.equal(triggerRes.status, "triggered")

  const logs = await client.getJobLogs(job.id, 5)
  assert.ok(Array.isArray(logs))

  await client.revokeApiKey(keys[0].key_hash)
  const updatedKeys = await client.listApiKeys(proj.id)
  assert.equal(updatedKeys[0].revoked, true)

  await client.deleteJob(job.id)
  await assert.rejects(
    async () => {
      await client.getJob(job.id)
    },
    (err) => err instanceof JobNotFoundError
  )
})
