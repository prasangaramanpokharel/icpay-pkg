#include <curl/curl.h>
#include "icbucket/client.hpp"

namespace icbucket {

namespace {

size_t write_cb(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total = size * nmemb;
    auto* str = static_cast<std::string*>(userp);
    str->append(static_cast<char*>(contents), total);
    return total;
}

}

Client::Client(ClientConfig config)
    : config_(std::move(config)),
      url_builder_(config_.bucket_id, config_.cdn_host),
      files(this, url_builder_) {
    if (config_.api_key.empty()) {
        throw ICBucketError(ErrorCode::AuthenticationFailed, "apiKey is required");
    }
    if (config_.bucket_id.empty()) {
        throw ICBucketError(ErrorCode::InvalidRequest, "bucketId is required");
    }
}

Client::~Client() = default;

Client::Client(Client&&) noexcept = default;
Client& Client::operator=(Client&&) noexcept = default;

const ClientConfig& Client::config() const noexcept {
    return config_;
}

BucketUsage Client::usage() {
    std::string endpoint = "/api/v1/buckets/" + config_.bucket_id + "/usage";
    send_request("GET", endpoint);
    return BucketUsage{};
}

std::string Client::send_request(
    const std::string& method,
    const std::string& path,
    const std::vector<uint8_t>& body,
    const std::string& content_type
) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw ICBucketError(ErrorCode::InternalError, "Failed to initialize curl");
    }

    std::string url = config_.endpoint;
    if (!url.empty() && url.back() == '/') {
        url.pop_back();
    }
    if (path.empty() || path.front() != '/') {
        url += "/";
    }
    url += path;

    struct curl_slist* headers = nullptr;
    std::string auth = "Authorization: Bearer " + config_.api_key;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Accept: application/json");

    if (!content_type.empty()) {
        std::string ct = "Content-Type: " + content_type;
        headers = curl_slist_append(headers, ct.c_str());
    }

    std::string response_buffer;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_buffer);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, config_.timeout_ms);

    if (!body.empty()) {
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, reinterpret_cast<const char*>(body.data()));
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(body.size()));
    }

    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);

    if (res != CURLE_OK) {
        curl_easy_cleanup(curl);
        throw ICBucketError(ErrorCode::NetworkError, curl_easy_strerror(res));
    }

    long status = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
    curl_easy_cleanup(curl);

    if (status >= 400) {
        ErrorCode ec = ErrorCode::InternalError;
        if (status == 401) ec = ErrorCode::AuthenticationFailed;
        else if (status == 403) ec = ErrorCode::PermissionDenied;
        else if (status == 404) ec = ErrorCode::FileNotFound;
        else if (status == 413) ec = ErrorCode::CapacityExceeded;
        else if (status == 429) ec = ErrorCode::RateLimited;

        throw ICBucketError(ec, response_buffer.empty() ? "HTTP error" : response_buffer, static_cast<int>(status));
    }

    return response_buffer;
}

}
