# icpay-cron-go (Go SDK)

Official Go SDK for **icCron** (`w2fxo-5qaaa-aaaan-q6zxq-cai`).

## Installation

```bash
go get github.com/prasangaramanpokharel/icpay-cron-go
```

## Quick Start

```go
package main

import (
	"os"

	iccron "github.com/prasangaramanpokharel/icpay-cron-go"
)

func main() {
	client := iccron.NewClient(os.Getenv("ICCRON_API_KEY"))
	_ = client
}
```

## Methods

### `CreateJob(label, cronExpression, target)`

Creates a new scheduled HTTP webhook or inter-canister job inside the API key's project.

```go
job, err := client.CreateJob("Hourly Sync", "0 * * * *", map[string]interface{}{
	"type":   "HttpWebhook",
	"url":    "https://example.com/api/cron",
	"method": "POST",
	"body":   `{"event":"sync"}`,
})
```

### `ListJobs()`

Returns all jobs in the API key's project.

```go
jobs, err := client.ListJobs()
```

### `Trigger(projectID, jobID)`

Immediately executes a job on-chain.

```go
res, err := client.Trigger(iccron.FormatProjectID(1), 1)
```

### `PauseJob(jobID)`

Pauses an active job.

```go
err := client.PauseJob(1)
```

### `ResumeJob(jobID)`

Resumes a paused job.

```go
err := client.ResumeJob(1)
```

### `DeleteJob(jobID)`

Deletes a job and its execution logs.

```go
err := client.DeleteJob(1)
```

### `GetJobLogs(jobID)`

Returns recent execution logs for a specific job.

```go
logs, err := client.GetJobLogs(1)
```

### `GetProjectLogs()`

Returns up to 100 recent execution logs across all jobs in the API key's project, sorted newest first.

```go
projectLogs, err := client.GetProjectLogs()
```
