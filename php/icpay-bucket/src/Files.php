<?php

declare(strict_types=1);

namespace ICPay\Bucket;

use ICPay\Bucket\Error\ErrorCode;
use ICPay\Bucket\Error\ICBucketException;
use ICPay\Bucket\Model\FileListPage;
use ICPay\Bucket\Model\FileMetadata;

final class Files
{
    public function __construct(
        private readonly HttpTransport $transport,
        private readonly UrlBuilder $urlBuilder,
        private readonly string $bucketId,
    ) {
    }

    public function url(string $path): string
    {
        return $this->urlBuilder->fileUrl($path);
    }

    public function upload(
        string $path,
        string $data,
        string $contentType = "application/octet-stream",
        array $tags = [],
        ?string $visibility = null
    ): FileMetadata {
        $cleanPath = ltrim($path, "/");
        if ($cleanPath === "") {
            throw new ICBucketException(ErrorCode::INVALID_PATH, "Upload path cannot be empty");
        }

        $headers = [
            "Content-Type" => $contentType,
            "x-bucket-id" => $this->bucketId,
            "x-file-path" => $cleanPath,
        ];

        if ($visibility !== null) {
            $headers["x-visibility"] = $visibility;
        }

        if (!empty($tags)) {
            $headers["x-file-tags"] = implode(",", $tags);
        }

        $endpoint = sprintf(
            "/api/v1/buckets/%s/files/%s",
            rawurlencode($this->bucketId),
            rawurlencode($cleanPath)
        );

        $response = $this->transport->send("PUT", $endpoint, $headers, $data);

        return FileMetadata::fromArray($response ?? []);
    }

    public function get(string $path): FileMetadata
    {
        $cleanPath = ltrim($path, "/");
        $endpoint = sprintf(
            "/api/v1/buckets/%s/files/%s/metadata",
            rawurlencode($this->bucketId),
            rawurlencode($cleanPath)
        );

        $response = $this->transport->send("GET", $endpoint);

        return FileMetadata::fromArray($response ?? []);
    }

    public function list(?string $prefix = null, ?string $cursor = null, int $limit = 20): FileListPage
    {
        $params = [];
        if ($prefix !== null && $prefix !== "") {
            $params["prefix"] = $prefix;
        }
        if ($cursor !== null && $cursor !== "") {
            $params["cursor"] = $cursor;
        }
        if ($limit > 0) {
            $params["limit"] = (string)$limit;
        }

        $queryString = http_build_query($params);
        $endpoint = sprintf(
            "/api/v1/buckets/%s/files%s",
            rawurlencode($this->bucketId),
            $queryString !== "" ? "?" . $queryString : ""
        );

        $response = $this->transport->send("GET", $endpoint);

        return FileListPage::fromArray($response ?? []);
    }

    public function delete(string $path): void
    {
        $cleanPath = ltrim($path, "/");
        $endpoint = sprintf(
            "/api/v1/buckets/%s/files/%s",
            rawurlencode($this->bucketId),
            rawurlencode($cleanPath)
        );

        $this->transport->send("DELETE", $endpoint);
    }

    public function copy(string $sourcePath, string $targetPath): FileMetadata
    {
        $endpoint = sprintf("/api/v1/buckets/%s/actions/copy", rawurlencode($this->bucketId));
        $body = json_encode([
            "sourcePath" => ltrim($sourcePath, "/"),
            "targetPath" => ltrim($targetPath, "/"),
        ], JSON_THROW_ON_ERROR);

        $response = $this->transport->send(
            "POST",
            $endpoint,
            ["Content-Type" => "application/json"],
            $body
        );

        return FileMetadata::fromArray($response ?? []);
    }

    public function move(string $sourcePath, string $targetPath): FileMetadata
    {
        $endpoint = sprintf("/api/v1/buckets/%s/actions/move", rawurlencode($this->bucketId));
        $body = json_encode([
            "sourcePath" => ltrim($sourcePath, "/"),
            "targetPath" => ltrim($targetPath, "/"),
        ], JSON_THROW_ON_ERROR);

        $response = $this->transport->send(
            "POST",
            $endpoint,
            ["Content-Type" => "application/json"],
            $body
        );

        return FileMetadata::fromArray($response ?? []);
    }

    public function exists(string $path): bool
    {
        try {
            $this->get($path);
            return true;
        } catch (ICBucketException $e) {
            if ($e->errorCode === ErrorCode::FILE_NOT_FOUND) {
                return false;
            }
            throw $e;
        }
    }
}
