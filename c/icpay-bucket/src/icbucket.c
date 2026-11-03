#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "icbucket.h"

struct icbucket_client {
    char api_key[128];
    char bucket_id[64];
    char endpoint[256];
    char cdn_host[256];
    long timeout_ms;
};

struct memory_chunk {
    char *memory;
    size_t size;
};

static size_t write_memory_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct memory_chunk *mem = (struct memory_chunk *)userp;

    char *ptr = (char *)realloc(mem->memory, mem->size + realsize + 1);
    if (!ptr) {
        return 0;
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

icbucket_error_t icbucket_client_init(icbucket_client_t **client, const icbucket_config_t *config) {
    if (!client || !config) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    if (strlen(config->api_key) == 0 || strlen(config->bucket_id) == 0) {
        return ICBUCKET_ERR_AUTHENTICATION_FAILED;
    }

    icbucket_client_t *c = (icbucket_client_t *)malloc(sizeof(icbucket_client_t));
    if (!c) {
        return ICBUCKET_ERR_INTERNAL;
    }

    memset(c, 0, sizeof(icbucket_client_t));
    strncpy(c->api_key, config->api_key, sizeof(c->api_key) - 1);
    strncpy(c->bucket_id, config->bucket_id, sizeof(c->bucket_id) - 1);

    if (strlen(config->endpoint) > 0) {
        strncpy(c->endpoint, config->endpoint, sizeof(c->endpoint) - 1);
    } else {
        strncpy(c->endpoint, ICBUCKET_DEFAULT_ENDPOINT, sizeof(c->endpoint) - 1);
    }

    if (strlen(config->cdn_host) > 0) {
        strncpy(c->cdn_host, config->cdn_host, sizeof(c->cdn_host) - 1);
    } else {
        strncpy(c->cdn_host, ICBUCKET_DEFAULT_CDN, sizeof(c->cdn_host) - 1);
    }

    c->timeout_ms = config->timeout_ms > 0 ? config->timeout_ms : 30000;

    *client = c;
    return ICBUCKET_OK;
}

void icbucket_client_free(icbucket_client_t *client) {
    if (client) {
        free(client);
    }
}

static icbucket_error_t execute_request(
    const icbucket_client_t *client,
    const char *method,
    const char *path,
    const uint8_t *body,
    size_t body_len,
    const char *content_type,
    struct memory_chunk *chunk,
    long *out_status
) {
    CURL *curl = curl_easy_init();
    if (!curl) {
        return ICBUCKET_ERR_INTERNAL;
    }

    char url[512];
    snprintf(url, sizeof(url), "%s%s%s", client->endpoint, (path[0] == '/' ? "" : "/"), path);

    struct curl_slist *headers = NULL;
    char auth_header[192];
    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", client->api_key);
    headers = curl_slist_append(headers, auth_header);
    headers = curl_slist_append(headers, "Accept: application/json");

    if (content_type) {
        char ct_header[128];
        snprintf(ct_header, sizeof(ct_header), "Content-Type: %s", content_type);
        headers = curl_slist_append(headers, ct_header);
    }

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_memory_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)chunk);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, client->timeout_ms);

    if (body && body_len > 0) {
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, (const char *)body);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)body_len);
    }

    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);

    if (res != CURLE_OK) {
        curl_easy_cleanup(curl);
        return ICBUCKET_ERR_NETWORK;
    }

    long status_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status_code);
    curl_easy_cleanup(curl);

    if (out_status) {
        *out_status = status_code;
    }

    if (status_code == 401) return ICBUCKET_ERR_AUTHENTICATION_FAILED;
    if (status_code == 403) return ICBUCKET_ERR_PERMISSION_DENIED;
    if (status_code == 404) return ICBUCKET_ERR_FILE_NOT_FOUND;
    if (status_code == 413) return ICBUCKET_ERR_CAPACITY_EXCEEDED;
    if (status_code == 429) return ICBUCKET_ERR_RATE_LIMITED;
    if (status_code >= 400) return ICBUCKET_ERR_INTERNAL;

    return ICBUCKET_OK;
}

icbucket_error_t icbucket_upload(
    icbucket_client_t *client,
    const char *path,
    const uint8_t *data,
    size_t len,
    const char *content_type,
    icbucket_file_metadata_t *out_meta
) {
    if (!client || !path || !data) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    const char *clean_path = path;
    while (*clean_path == '/') clean_path++;

    char req_path[384];
    snprintf(req_path, sizeof(req_path), "/api/v1/buckets/%s/files/%s", client->bucket_id, clean_path);

    struct memory_chunk chunk = {0};
    long status = 0;
    icbucket_error_t err = execute_request(
        client,
        "PUT",
        req_path,
        data,
        len,
        content_type ? content_type : "application/octet-stream",
        &chunk,
        &status
    );

    if (err == ICBUCKET_OK && out_meta) {
        memset(out_meta, 0, sizeof(icbucket_file_metadata_t));
        strncpy(out_meta->path, clean_path, sizeof(out_meta->path) - 1);
        out_meta->size = len;
        if (content_type) {
            strncpy(out_meta->content_type, content_type, sizeof(out_meta->content_type) - 1);
        }
        icbucket_url(client, clean_path, out_meta->url, sizeof(out_meta->url));
    }

    if (chunk.memory) {
        free(chunk.memory);
    }

    return err;
}

icbucket_error_t icbucket_get(icbucket_client_t *client, const char *path, icbucket_file_metadata_t *out_meta) {
    if (!client || !path || !out_meta) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    const char *clean_path = path;
    while (*clean_path == '/') clean_path++;

    char req_path[384];
    snprintf(req_path, sizeof(req_path), "/api/v1/buckets/%s/files/%s/metadata", client->bucket_id, clean_path);

    struct memory_chunk chunk = {0};
    long status = 0;
    icbucket_error_t err = execute_request(client, "GET", req_path, NULL, 0, NULL, &chunk, &status);

    if (err == ICBUCKET_OK) {
        memset(out_meta, 0, sizeof(icbucket_file_metadata_t));
        strncpy(out_meta->path, clean_path, sizeof(out_meta->path) - 1);
        icbucket_url(client, clean_path, out_meta->url, sizeof(out_meta->url));
    }

    if (chunk.memory) {
        free(chunk.memory);
    }

    return err;
}

icbucket_error_t icbucket_delete(icbucket_client_t *client, const char *path) {
    if (!client || !path) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    const char *clean_path = path;
    while (*clean_path == '/') clean_path++;

    char req_path[384];
    snprintf(req_path, sizeof(req_path), "/api/v1/buckets/%s/files/%s", client->bucket_id, clean_path);

    struct memory_chunk chunk = {0};
    long status = 0;
    icbucket_error_t err = execute_request(client, "DELETE", req_path, NULL, 0, NULL, &chunk, &status);

    if (chunk.memory) {
        free(chunk.memory);
    }

    return err;
}

icbucket_error_t icbucket_copy(
    icbucket_client_t *client,
    const char *src_path,
    const char *dest_path,
    icbucket_file_metadata_t *out_meta
) {
    if (!client || !src_path || !dest_path) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    char req_path[384];
    snprintf(req_path, sizeof(req_path), "/api/v1/buckets/%s/actions/copy", client->bucket_id);

    char body[512];
    snprintf(body, sizeof(body), "{\"sourcePath\":\"%s\",\"targetPath\":\"%s\"}", src_path, dest_path);

    struct memory_chunk chunk = {0};
    long status = 0;
    icbucket_error_t err = execute_request(
        client,
        "POST",
        req_path,
        (const uint8_t *)body,
        strlen(body),
        "application/json",
        &chunk,
        &status
    );

    if (err == ICBUCKET_OK && out_meta) {
        memset(out_meta, 0, sizeof(icbucket_file_metadata_t));
        strncpy(out_meta->path, dest_path, sizeof(out_meta->path) - 1);
        icbucket_url(client, dest_path, out_meta->url, sizeof(out_meta->url));
    }

    if (chunk.memory) {
        free(chunk.memory);
    }

    return err;
}

icbucket_error_t icbucket_move(
    icbucket_client_t *client,
    const char *src_path,
    const char *dest_path,
    icbucket_file_metadata_t *out_meta
) {
    if (!client || !src_path || !dest_path) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    char req_path[384];
    snprintf(req_path, sizeof(req_path), "/api/v1/buckets/%s/actions/move", client->bucket_id);

    char body[512];
    snprintf(body, sizeof(body), "{\"sourcePath\":\"%s\",\"targetPath\":\"%s\"}", src_path, dest_path);

    struct memory_chunk chunk = {0};
    long status = 0;
    icbucket_error_t err = execute_request(
        client,
        "POST",
        req_path,
        (const uint8_t *)body,
        strlen(body),
        "application/json",
        &chunk,
        &status
    );

    if (err == ICBUCKET_OK && out_meta) {
        memset(out_meta, 0, sizeof(icbucket_file_metadata_t));
        strncpy(out_meta->path, dest_path, sizeof(out_meta->path) - 1);
        icbucket_url(client, dest_path, out_meta->url, sizeof(out_meta->url));
    }

    if (chunk.memory) {
        free(chunk.memory);
    }

    return err;
}

icbucket_error_t icbucket_usage(icbucket_client_t *client, icbucket_usage_t *out_usage) {
    if (!client || !out_usage) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    char req_path[384];
    snprintf(req_path, sizeof(req_path), "/api/v1/buckets/%s/usage", client->bucket_id);

    struct memory_chunk chunk = {0};
    long status = 0;
    icbucket_error_t err = execute_request(client, "GET", req_path, NULL, 0, NULL, &chunk, &status);

    if (err == ICBUCKET_OK) {
        memset(out_usage, 0, sizeof(icbucket_usage_t));
    }

    if (chunk.memory) {
        free(chunk.memory);
    }

    return err;
}
