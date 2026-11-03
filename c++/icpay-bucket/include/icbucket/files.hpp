#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include "types.hpp"
#include "url.hpp"

namespace icbucket {

class Client;

class FileOperations {
public:
    FileOperations(Client* client, UrlBuilder url_builder);

    std::string url(const std::string& path) const;
    FileMetadata upload(const UploadPayload& payload);
    FileMetadata get(const std::string& path);
    FileListPage list(const ListFilesQuery& query = {});
    void delete_file(const std::string& path);
    FileMetadata copy(const std::string& source_path, const std::string& target_path);
    FileMetadata move(const std::string& source_path, const std::string& target_path);
    bool exists(const std::string& path);

private:
    Client* client_;
    UrlBuilder url_builder_;
};

}
