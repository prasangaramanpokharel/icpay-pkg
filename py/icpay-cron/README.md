# icpay-cron (Python SDK)

Official zero-dependency Python SDK for **icCron** (`w2fxo-5qaaa-aaaan-q6zxq-cai`).

## Installation

```bash
pip install icpay-cron
```

## Quick Start

```python
import os
from icpay_cron import IcCronClient

client = IcCronClient(api_key=os.environ["ICCRON_API_KEY"])
```

## Methods

### `create_job(label, cron_expression, target, max_retries=None)`

Creates a new scheduled HTTP webhook or inter-canister job inside the API key's project.

```python
job = client.create_job(
    label="Hourly Sync",
    cron_expression="0 * * * *",
    target={
        "type": "HttpWebhook",
        "url": "https://example.com/api/cron",
        "method": "POST",
        "body": '{"event":"sync"}',
    },
)
```

### `list_jobs()`

Returns all jobs in the API key's project.

```python
jobs = client.list_jobs()
```

### `trigger(project_id, job_id)`

Immediately executes a job on-chain.

```python
res = client.trigger(1, 1)
```

### `pause_job(job_id)`

Pauses an active job.

```python
client.pause_job(1)
```

### `resume_job(job_id)`

Resumes a paused job.

```python
client.resume_job(1)
```

### `delete_job(job_id)`

Deletes a job and its execution logs.

```python
client.delete_job(1)
```

### `get_job_logs(job_id)`

Returns recent execution logs for a specific job.

```python
logs = client.get_job_logs(1)
```

### `get_project_logs()`

Returns up to 100 recent execution logs across all jobs in the API key's project, sorted newest first.

```python
project_logs = client.get_project_logs()
```
