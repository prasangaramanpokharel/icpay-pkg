<?php

declare(strict_types=1);

namespace ICPay\Bucket;

final class UrlBuilder
{
    private readonly string $cdnHost;

    public function __construct(
        private readonly string $bucketId,
        string $cdnHost = "https://cloud.icpay.app"
    ) {
        $this->cdnHost = rtrim($cdnHost, "/");
    }

    public function fileUrl(string $path): string
    {
        $cleanPath = ltrim($path, "/");
        $segments = explode("/", $cleanPath);
        $encodedSegments = array_map("rawurlencode", $segments);

        return sprintf(
            "%s/cloud/%s/%s",
            $this->cdnHost,
            rawurlencode($this->bucketId),
            implode("/", $encodedSegments)
        );
    }
}
