#pragma once

#include <string>

namespace icbucket {

class UrlBuilder {
public:
    UrlBuilder(std::string bucket_id, std::string cdn_host = "https://cloud.icpay.app");

    std::string file_url(const std::string& path) const;

private:
    std::string bucket_id_;
    std::string cdn_host_;
};

}
