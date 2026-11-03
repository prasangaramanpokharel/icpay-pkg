#pragma once

#include <string>
#include <vector>
#include "types.hpp"
#include "error.hpp"
#include "url.hpp"
#include "files.hpp"

namespace icbucket {

class Client {
private:
    ClientConfig config_;
    UrlBuilder url_builder_;

public:
    explicit Client(ClientConfig config);
    ~Client();

    Client(const Client&) = delete;
    Client& operator=(const Client&) = delete;
    Client(Client&&) noexcept;
    Client& operator=(Client&&) noexcept;

    BucketUsage usage();
    const ClientConfig& config() const noexcept;

    std::string send_request(
        const std::string& method,
        const std::string& path,
        const std::vector<uint8_t>& body = {},
        const std::string& content_type = "application/json"
    );

    FileOperations files;
};

using ICBucket = Client;

}
