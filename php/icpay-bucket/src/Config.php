<?php

declare(strict_types=1);

namespace ICPay\Bucket;

final class Config
{
    public function __construct(
        public readonly string $apiKey,
        public readonly string $bucketId,
        public readonly string $endpoint = "https://api.icpay.app",
        public readonly string $cdnHost = "https://cloud.icpay.app",
        public readonly float $timeout = 30.0,
    ) {
    }
}
