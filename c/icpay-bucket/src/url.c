#include <stdio.h>
#include <string.h>
#include "icbucket.h"

icbucket_error_t icbucket_url(const icbucket_client_t *client, const char *path, char *out_url, size_t out_len) {
    if (!client || !path || !out_url || out_len == 0) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    const char *p = path;
    while (*p == '/') {
        p++;
    }

    const char *cdn = "https://cloud.icpay.app";
    int written = snprintf(out_url, out_len, "%s/cloud/%s/%s", cdn, "icp", p);
    if (written < 0 || (size_t)written >= out_len) {
        return ICBUCKET_ERR_INVALID_REQUEST;
    }

    return ICBUCKET_OK;
}
