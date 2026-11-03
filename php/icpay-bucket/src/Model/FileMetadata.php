<?php

declare(strict_types=1);

namespace ICPay\Bucket\Model;

final class FileMetadata
{
    public function __construct(
        public readonly string $id,
        public readonly string $path,
        public readonly int $size,
        public readonly string $contentType,
        public readonly string $createdAt,
        public readonly string $updatedAt,
        public readonly string $url,
        public readonly array $tags = [],
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id: (string)($data["id"] ?? ""),
            path: (string)($data["path"] ?? ""),
            size: (int)($data["size"] ?? 0),
            contentType: (string)($data["contentType"] ?? "application/octet-stream"),
            createdAt: (string)($data["createdAt"] ?? ""),
            updatedAt: (string)($data["updatedAt"] ?? ""),
            url: (string)($data["url"] ?? ""),
            tags: is_array($data["tags"] ?? null) ? $data["tags"] : [],
        );
    }
}
