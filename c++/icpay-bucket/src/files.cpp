#include "icbucket/files.hpp"
#include "icbucket/client.hpp"
#include "icbucket/error.hpp"

namespace icbucket {

FileOperations::FileOperations(Client* client, UrlBuilder url_builder)
    : client_(client), url_builder_(std::move(url_builder)) {}

std::string FileOperations::url(const std::string& path) const {
    return url_builder_.file_url(path);
}

FileMetadata FileOperations::upload(const UploadPayload& payload) {
    if (payload.path.empty()) {
        throw ICBucketError(ErrorCode::InvalidPath, "Upload path cannot be empty");
    }

    size_t start = 0;
    while (start < payload.path.size() && payload.path[start] == '/') {
        start++;
    }
    std::string clean_path = payload.path.substr(start);

    std::string endpoint = "/api/v1/buckets/" + client_->config().bucket_id + "/files/" + clean_path;
    client_->send_request("PUT", endpoint, payload.data, payload.content_type);

    FileMetadata meta;
    meta.path = clean_path;
    meta.size = payload.data.size();
    meta.content_type = payload.content_type;
    meta.url = url(clean_path);
    meta.tags = payload.tags;
    return meta;
}

FileMetadata FileOperations::get(const std::string& path) {
    size_t start = 0;
    while (start < path.size() && path[start] == '/') {
        start++;
    }
    std::string clean_path = path.substr(start);

    std::string endpoint = "/api/v1/buckets/" + client_->config().bucket_id + "/files/" + clean_path + "/metadata";
    client_->send_request("GET", endpoint);

    FileMetadata meta;
    meta.path = clean_path;
    meta.url = url(clean_path);
    return meta;
}

FileListPage FileOperations::list(const ListFilesQuery& query) {
    std::string endpoint = "/api/v1/buckets/" + client_->config().bucket_id + "/files";
    std::string sep = "?";

    if (query.prefix.has_value()) {
        endpoint += sep + "prefix=" + query.prefix.value();
        sep = "&";
    }
    if (query.cursor.has_value()) {
        endpoint += sep + "cursor=" + query.cursor.value();
        sep = "&";
    }
    if (query.limit.has_value()) {
        endpoint += sep + "limit=" + std::to_string(query.limit.value());
    }

    client_->send_request("GET", endpoint);

    FileListPage page;
    return page;
}

void FileOperations::delete_file(const std::string& path) {
    size_t start = 0;
    while (start < path.size() && path[start] == '/') {
        start++;
    }
    std::string clean_path = path.substr(start);

    std::string endpoint = "/api/v1/buckets/" + client_->config().bucket_id + "/files/" + clean_path;
    client_->send_request("DELETE", endpoint);
}

FileMetadata FileOperations::copy(const std::string& source_path, const std::string& target_path) {
    std::string endpoint = "/api/v1/buckets/" + client_->config().bucket_id + "/actions/copy";
    std::string body_str = "{\"sourcePath\":\"" + source_path + "\",\"targetPath\":\"" + target_path + "\"}";
    std::vector<uint8_t> body(body_str.begin(), body_str.end());

    client_->send_request("POST", endpoint, body, "application/json");

    FileMetadata meta;
    meta.path = target_path;
    meta.url = url(target_path);
    return meta;
}

FileMetadata FileOperations::move(const std::string& source_path, const std::string& target_path) {
    std::string endpoint = "/api/v1/buckets/" + client_->config().bucket_id + "/actions/move";
    std::string body_str = "{\"sourcePath\":\"" + source_path + "\",\"targetPath\":\"" + target_path + "\"}";
    std::vector<uint8_t> body(body_str.begin(), body_str.end());

    client_->send_request("POST", endpoint, body, "application/json");

    FileMetadata meta;
    meta.path = target_path;
    meta.url = url(target_path);
    return meta;
}

bool FileOperations::exists(const std::string& path) {
    try {
        get(path);
        return true;
    } catch (const ICBucketError& e) {
        if (e.code() == ErrorCode::FileNotFound) {
            return false;
        }
        throw;
    }
}

}
