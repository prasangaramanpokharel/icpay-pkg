# icpay-cron (Rust SDK)

Official async Rust SDK for **icCron** (`w2fxo-5qaaa-aaaan-q6zxq-cai`).

## Installation

```toml
[dependencies]
icpay-cron = "0.1"
tokio = { version = "1", features = ["full"] }
```

## Quick Start

```rust
use icpay_cron::IcCronClient;

let client = IcCronClient::new(std::env::var("ICCRON_API_KEY")?);
```

## Methods

### `create_job(label, cron_expression, target)`

Creates a new scheduled HTTP webhook or inter-canister job inside the API key's project.

```rust
let job = client
    .create_job(
        "Hourly Sync",
        "0 * * * *",
        serde_json::json!({
            "type": "HttpWebhook",
            "url": "https://example.com/api/cron",
            "method": "POST",
            "body": "{\"event\":\"sync\"}"
        }),
    )
    .await?;
```

### `list_jobs()`

Returns all jobs in the API key's project.

```rust
let jobs = client.list_jobs().await?;
```

### `trigger(project_id, job_id)`

Immediately executes a job on-chain.

```rust
let res = client.trigger(&IcCronClient::format_project_id(1), 1).await?;
```

### `pause_job(job_id)`

Pauses an active job.

```rust
client.pause_job(1).await?;
```

### `resume_job(job_id)`

Resumes a paused job.

```rust
client.resume_job(1).await?;
```

### `delete_job(job_id)`

Deletes a job and its execution logs.

```rust
client.delete_job(1).await?;
```

### `get_job_logs(job_id)`

Returns recent execution logs for a specific job.

```rust
let logs = client.get_job_logs(1).await?;
```

### `get_project_logs()`

Returns up to 100 recent execution logs across all jobs in the API key's project, sorted newest first.

```rust
let project_logs = client.get_project_logs().await?;
```
