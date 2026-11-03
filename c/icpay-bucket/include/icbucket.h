#ifndef ICBUCKET_H
#define ICBUCKET_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

#define ICBUCKET_DEFAULT_ENDPOINT "https://api.icpay.app"
#define ICBUCKET_DEFAULT_CDN "https://cloud.icpay.app"
#define ICBUCKET_DEFAULT_CANISTER "6vbhm-nqaaa-aaaan-q6muq-cai"

typedef enum {
    ICBUCKET_OK = 0,
    ICBUCKET_ERR_AUTHENTICATION_FAILED,
    ICBUCKET_ERR_PERMISSION_DENIED,
    ICBUCKET_ERR_BUCKET_NOT_FOUND,
    ICBUCKET_ERR_FILE_NOT_FOUND,
    ICBUCKET_ERR_INVALID_PATH,
    ICBUCKET_ERR_INVALID_REQUEST,
    ICBUCKET_ERR_CAPACITY_EXCEEDED,
    ICBUCKET_ERR_BUCKET_EXPIRED,
    ICBUCKET_ERR_UPLOAD_FAILED,
    ICBUCKET_ERR_CHUNK_FAILED,
    ICBUCKET_ERR_RATE_LIMITED,
    ICBUCKET_ERR_NETWORK,
    ICBUCKET_ERR_INTERNAL
} icbucket_error_t;

typedef struct {
    char id[64];
    char path[256];
    char name[128];
    size_t size;
    char content_type[64];
    char created_at[32];
    char updated_at[32];
    char url[512];
} icbucket_file_metadata_t;

typedef struct {
    size_t used_bytes;
    size_t capacity_bytes;
    size_t remaining_bytes;
    size_t file_count;
} icbucket_usage_t;

typedef struct {
    char api_key[128];
    char bucket_id[64];
    char endpoint[256];
    char cdn_host[256];
    long timeout_ms;
} icbucket_config_t;

typedef struct icbucket_client icbucket_client_t;

icbucket_error_t icbucket_client_init(icbucket_client_t **client, const icbucket_config_t *config);
void icbucket_client_free(icbucket_client_t *client);
const char* icbucket_error_str(icbucket_error_t err);

icbucket_error_t icbucket_url(const icbucket_client_t *client, const char *path, char *out_url, size_t out_len);
icbucket_error_t icbucket_upload(icbucket_client_t *client, const char *path, const uint8_t *data, size_t len, const char *content_type, icbucket_file_metadata_t *out_meta);
icbucket_error_t icbucket_get(icbucket_client_t *client, const char *path, icbucket_file_metadata_t *out_meta);
icbucket_error_t icbucket_delete(icbucket_client_t *client, const char *path);
icbucket_error_t icbucket_copy(icbucket_client_t *client, const char *src_path, const char *dest_path, icbucket_file_metadata_t *out_meta);
icbucket_error_t icbucket_move(icbucket_client_t *client, const char *src_path, const char *dest_path, icbucket_file_metadata_t *out_meta);
icbucket_error_t icbucket_usage(icbucket_client_t *client, icbucket_usage_t *out_usage);

#ifdef __cplusplus
}
#endif

#endif
