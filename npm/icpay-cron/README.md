# icpay-cron (npm / TypeScript SDK)

Official Node.js and TypeScript SDK for **icCron**, the autonomous on-chain cron and webhook dispatcher running on the Internet Computer (`w2fxo-5qaaa-aaaan-q6zxq-cai`).

## Installation

```bash
npm install icpay-cron
```

## Quick Start

```ts
import { IcCronClient } from "icpay-cron"

const client = new IcCronClient({
  apiKey: process.env.ICCRON_API_KEY,
})
```

## Methods

### `createJob(options)`

Creates a new scheduled HTTP webhook or inter-canister job inside the API key's project.

```ts
const job = await client.createJob({
  projectId: 1,
  label: "Hourly Sync",
  cronExpression: "0 * * * *",
  target: {
    type: "HttpWebhook",
    url: "https://example.com/api/cron",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "sync" }),
  },
})
```

### `listJobs(projectId?)`

Returns all jobs for the API key's project.

```ts
const jobs = await client.listJobs()
```

### `trigger(options)`

Immediately executes a job on-chain and logs the result.

```ts
const res = await client.trigger({
  projectId: 1,
  jobId: 1,
})
```

### `pauseJob(jobId)`

Pauses an active job and removes its next scheduled timer.

```ts
await client.pauseJob(1)
```

### `resumeJob(jobId)`

Resumes a paused job and schedules its next run.

```ts
await client.resumeJob(1)
```

### `deleteJob(jobId)`

Deletes a job and its stored execution logs.

```ts
await client.deleteJob(1)
```

### `getJobLogs(jobId, limit?)`

Returns recent execution logs for a specific job.

```ts
const logs = await client.getJobLogs(1)
```

### `getProjectLogs()`

Returns up to 100 recent execution logs across all jobs in the API key's project, sorted newest first.

```ts
const projectLogs = await client.getProjectLogs()
```
