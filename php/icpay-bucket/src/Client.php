<?php

declare(strict_types=1);

namespace ICPay\Bucket;

use ICPay\Bucket\Error\ErrorCode;
use ICPay\Bucket\Error\ICBucketException;
use ICPay\Bucket\Model\BucketUsage;

final class Client
{
    public readonly Files $files;
    private readonly HttpTransport $transport;
    private readonly Config $config;

    public function __construct(
        string $apiKey,
        string $bucketId,
        string $endpoint = "https://api.icpay.app",
        string $cdnHost = "https://cloud.icpay.app",
        float $timeout = 30.0,
    ) {
        $cleanApiKey = trim($apiKey);
        $cleanBucketId = trim($bucketId);

        if ($cleanApiKey === "") {
            throw new ICBucketException(ErrorCode::AUTHENTICATION_FAILED, "apiKey is required");
        }
        if ($cleanBucketId === "") {
            throw new ICBucketException(ErrorCode::INVALID_REQUEST, "bucketId is required");
        }

        $this->config = new Config(
            apiKey: $cleanApiKey,
            bucketId: $cleanBucketId,
            endpoint: $endpoint,
            cdnHost: $cdnHost,
            timeout: $timeout
        );

        $this->transport = new HttpTransport($this->config);
        $urlBuilder = new UrlBuilder($cleanBucketId, $cdnHost);
        $this->files = new Files($this->transport, $urlBuilder, $cleanBucketId);
    }

    public function usage(): BucketUsage
    {
        $endpoint = sprintf("/api/v1/buckets/%s/usage", rawurlencode($this->config->bucketId));
        $response = $this->transport->send("GET", $endpoint);

        return BucketUsage::fromArray($response ?? []);
    }
}
