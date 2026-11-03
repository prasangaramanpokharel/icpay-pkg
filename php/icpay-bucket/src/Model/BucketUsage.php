<?php

declare(strict_types=1);

namespace ICPay\Bucket\Model;

final class BucketUsage
{
    public function __construct(
        public readonly int $usedBytes,
        public readonly int $capacityBytes,
        public readonly int $remainingBytes,
        public readonly int $fileCount,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            usedBytes: (int)($data["usedBytes"] ?? 0),
            capacityBytes: (int)($data["capacityBytes"] ?? 0),
            remainingBytes: (int)($data["remainingBytes"] ?? 0),
            fileCount: (int)($data["fileCount"] ?? 0),
        );
    }
}
