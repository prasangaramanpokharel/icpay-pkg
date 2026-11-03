#pragma once

#include <string>
#include <stdexcept>
#include <optional>

namespace icbucket {

enum class ErrorCode {
    AuthenticationFailed,
    PermissionDenied,
    BucketNotFound,
    FileNotFound,
    InvalidPath,
    InvalidRequest,
    CapacityExceeded,
    BucketExpired,
    UploadFailed,
    ChunkFailed,
    RateLimited,
    NetworkError,
    InternalError
};

std::string error_code_to_string(ErrorCode code);

class ICBucketError : public std::runtime_error {
public:
    ICBucketError(ErrorCode code, const std::string& message, std::optional<int> status = std::nullopt);

    ErrorCode code() const noexcept;
    std::optional<int> status() const noexcept;

private:
    ErrorCode code_;
    std::optional<int> status_;
};

}
