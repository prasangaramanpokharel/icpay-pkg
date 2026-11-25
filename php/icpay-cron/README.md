# icpay/cron (PHP SDK)

Official PHP SDK for **icCron** (`w2fxo-5qaaa-aaaan-q6zxq-cai`).

## Installation

```bash
composer require icpay/cron
```

## Quick Start

```php
<?php

require 'vendor/autoload.php';

use ICPay\Cron\IcCronClient;

$client = new IcCronClient(getenv('ICCRON_API_KEY'));
```

## Methods

### `createJob($label, $cronExpression, $target, $maxRetries = null)`

Creates a new scheduled HTTP webhook or inter-canister job inside the API key's project.

```php
$job = $client->createJob('Hourly Sync', '0 * * * *', [
    'type' => 'HttpWebhook',
    'url' => 'https://example.com/api/cron',
    'method' => 'POST',
    'body' => '{"event":"sync"}',
]);
```

### `listJobs()`

Returns all jobs in the API key's project.

```php
$jobs = $client->listJobs();
```

### `trigger($projectId, $jobId)`

Immediately executes a job on-chain.

```php
$res = $client->trigger(1, 1);
```

### `pauseJob($jobId)`

Pauses an active job.

```php
$client->pauseJob(1);
```

### `resumeJob($jobId)`

Resumes a paused job.

```php
$client->resumeJob(1);
```

### `deleteJob($jobId)`

Deletes a job and its execution logs.

```php
$client->deleteJob(1);
```

### `getJobLogs($jobId)`

Returns recent execution logs for a specific job.

```php
$logs = $client->getJobLogs(1);
```

### `getProjectLogs()`

Returns up to 100 recent execution logs across all jobs in the API key's project, sorted newest first.

```php
$projectLogs = $client->getProjectLogs();
```
