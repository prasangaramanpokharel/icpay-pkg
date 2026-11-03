#include "icbucket.h"

const char* icbucket_error_str(icbucket_error_t err) {
    switch (err) {
        case ICBUCKET_OK:
            return "OK";
        case ICBUCKET_ERR_AUTHENTICATION_FAILED:
            return "AUTHENTICATION_FAILED";
        case ICBUCKET_ERR_PERMISSION_DENIED:
            return "PERMISSION_DENIED";
        case ICBUCKET_ERR_BUCKET_NOT_FOUND:
            return "BUCKET_NOT_FOUND";
        case ICBUCKET_ERR_FILE_NOT_FOUND:
            return "FILE_NOT_FOUND";
        case ICBUCKET_ERR_INVALID_PATH:
            return "INVALID_PATH";
        case ICBUCKET_ERR_INVALID_REQUEST:
            return "INVALID_REQUEST";
        case ICBUCKET_ERR_CAPACITY_EXCEEDED:
            return "CAPACITY_EXCEEDED";
        case ICBUCKET_ERR_BUCKET_EXPIRED:
            return "BUCKET_EXPIRED";
        case ICBUCKET_ERR_UPLOAD_FAILED:
            return "UPLOAD_FAILED";
        case ICBUCKET_ERR_CHUNK_FAILED:
            return "CHUNK_FAILED";
        case ICBUCKET_ERR_RATE_LIMITED:
            return "RATE_LIMITED";
        case ICBUCKET_ERR_NETWORK:
            return "NETWORK_ERROR";
        case ICBUCKET_ERR_INTERNAL:
        default:
            return "INTERNAL_ERROR";
    }
}
