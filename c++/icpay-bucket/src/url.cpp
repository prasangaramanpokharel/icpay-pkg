#include "icbucket/url.hpp"

namespace icbucket {

UrlBuilder::UrlBuilder(std::string bucket_id, std::string cdn_host)
    : bucket_id_(std::move(bucket_id)), cdn_host_(std::move(cdn_host)) {
    while (!cdn_host_.empty() && cdn_host_.back() == '/') {
        cdn_host_.pop_back();
    }
}

std::string UrlBuilder::file_url(const std::string& path) const {
    size_t start = 0;
    while (start < path.size() && path[start] == '/') {
        start++;
    }
    return cdn_host_ + "/cloud/" + bucket_id_ + "/" + path.substr(start);
}

}
