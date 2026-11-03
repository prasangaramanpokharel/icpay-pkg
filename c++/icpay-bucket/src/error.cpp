#include "icbucket/error.hpp"

namespace icbucket {

std::string error_code_to_string(ErrorCode code) {
    switch (code) {
        case ErrorCode::AuthenticationFailed: return "AUTHENTICATION_FAILED";
        case ErrorCode::PermissionDenied: return "PERMISSION_DENIED";
        case ErrorCode::BucketNotFound: return "BUCKET_NOT_FOUND";
        case ErrorCode::FileNotFound: return "FILE_NOT_FOUND";
        case ErrorCode::InvalidPath: return "INVALID_PATH";
        case ErrorCode::InvalidRequest: return "INVALID_REQUEST";
        case ErrorCode::CapacityExceeded: return "CAPACITY_EXCEEDED";
        case ErrorCode::BucketExpired: return "BUCKET_EXPIRED";
        case ErrorCode::UploadFailed: return "UPLOAD_FAILED";
        case ErrorCode::ChunkFailed: return "CHUNK_FAILED";
        case ErrorCode::RateLimited: return "RATE_LIMITED";
        case ErrorCode::NetworkError: return "NETWORK_ERROR";
        case ErrorCode::InternalError:
        default: return "INTERNAL_ERROR";
    }
}

ICBucketError::ICBucketError(ErrorCode code, const std::string& message, std::optional<int> status)
    : std::runtime_error("[" + error_code_to_string(code) + "] " + message),
      code_(code),
      status_(status) {}

ErrorCode ICBucketError::code() const noexcept {
    return code_;
}

std::optional<int> ICBucketError::status() const noexcept {
    return status_;
}

}
