<?php

declare(strict_types=1);

namespace ICPay\Bucket\Model;

final class FileListPage
{
    public function __construct(
        public readonly array $items,
        public readonly int $total,
        public readonly int $page,
        public readonly int $pageSize,
    ) {
    }

    public static function fromArray(array $data): self
    {
        $rawItems = is_array($data["items"] ?? null) ? $data["items"] : [];
        $items = array_map(
            static fn(array $item): FileMetadata => FileMetadata::fromArray($item),
            $rawItems
        );

        return new self(
            items: $items,
            total: (int)($data["total"] ?? 0),
            page: (int)($data["page"] ?? 0),
            pageSize: (int)($data["pageSize"] ?? 20),
        );
    }
}
