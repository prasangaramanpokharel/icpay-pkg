#pragma once

#include <string>
#include <vector>
#include <optional>
#include <cstdint>

namespace icbucket {

struct ClientConfig {
    std::string api_key;
    std::string bucket_id;
    std::string endpoint = "https://api.icpay.app";
    std::string cdn_host = "https://cloud.icpay.app";
    long timeout_ms = 30000;
};

struct FileMetadata {
    std::string id;
    std::string path;
    std::string name;
    size_t size = 0;
    std::string content_type;
    std::string created_at;
    std::string updated_at;
    std::string url;
    std::vector<std::string> tags;
};

struct FileListPage {
    std::vector<FileMetadata> items;
    size_t total = 0;
    size_t page = 0;
    size_t page_size = 20;
};

struct BucketUsage {
    size_t used_bytes = 0;
    size_t capacity_bytes = 0;
    size_t remaining_bytes = 0;
    size_t file_count = 0;
};

struct UploadPayload {
    std::string path;
    std::vector<uint8_t> data;
    std::string content_type = "application/octet-stream";
    std::vector<std::string> tags;
    std::optional<std::string> visibility;
};

struct ListFilesQuery {
    std::optional<std::string> prefix;
    std::optional<std::string> cursor;
    std::optional<size_t> limit;
};

}
