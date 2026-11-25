<?php

namespace ICPay\Cron;

class IcCronClient
{
    public const DEFAULT_CANISTER_ID = 'w2fxo-5qaaa-aaaan-q6zxq-cai';
    public const DEFAULT_HOST = 'https://icp0.io';

    protected string $apiKey;
    protected string $canisterId;
    protected string $host;

    public function __construct(string $apiKey, string $canisterId = self::DEFAULT_CANISTER_ID, string $host = self::DEFAULT_HOST)
    {
        $this->apiKey = $apiKey;
        $this->canisterId = $canisterId;
        $this->host = rtrim($host, '/');
    }

    public static function formatProjectId(int $id): string
    {
        return sprintf('cr_%08x', $id);
    }

    protected function request(string $method, string $path, ?array $payload = null): array
    {
        $isLocal = str_contains($this->host, '127.0.0.1') || str_contains($this->host, 'localhost');

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
        ];

        if ($isLocal) {
            $url = $this->host . $path . '?canisterId=' . $this->canisterId;
            $headers[] = 'Host: ' . $this->canisterId . '.raw.localhost';
        } else {
            $url = 'https://' . $this->canisterId . '.raw.icp0.io' . $path;
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (curl_errno($ch)) {
            $err = curl_error($ch);
            throw new \Exception("icCron cURL Error: " . $err);
        }

        $data = json_decode($response, true) ?? [];

        if ($httpCode >= 400) {
            $msg = $data['error'] ?? "Request failed with HTTP status {$httpCode}";
            throw new \Exception("icCron Error ({$httpCode}): " . $msg);
        }

        return $data;
    }

    public function trigger(string|int $projectId, int $jobId): array
    {
        $formattedProjectId = is_int($projectId) ? self::formatProjectId($projectId) : $projectId;
        return $this->request('POST', '/api/v1/cron/trigger', [
            'project_id' => $formattedProjectId,
            'job_id' => $jobId,
        ]);
    }

    public function createJob(string $label, string $cronExpression, array $target, ?int $maxRetries = null): array
    {
        $payload = [
            'label' => $label,
            'cron_expression' => $cronExpression,
            'target' => $target,
        ];
        if ($maxRetries !== null) {
            $payload['max_retries'] = $maxRetries;
        }
        $data = $this->request('POST', '/api/v1/cron/jobs', $payload);
        return $data['job'] ?? $data;
    }

    public function listJobs(): array
    {
        $data = $this->request('GET', '/api/v1/cron/jobs');
        return $data['jobs'] ?? [];
    }

    public function pauseJob(int $jobId): array
    {
        return $this->request('POST', "/api/v1/cron/jobs/{$jobId}/pause");
    }

    public function resumeJob(int $jobId): array
    {
        return $this->request('POST', "/api/v1/cron/jobs/{$jobId}/resume");
    }

    public function deleteJob(int $jobId): array
    {
        return $this->request('DELETE', "/api/v1/cron/jobs/{$jobId}");
    }

    public function getJobLogs(int $jobId): array
    {
        $data = $this->request('GET', "/api/v1/cron/jobs/{$jobId}/logs");
        return $data['logs'] ?? [];
    }

    public function getProjectLogs(): array
    {
        $data = $this->request('GET', '/api/v1/cron/logs');
        return $data['logs'] ?? [];
    }
}
