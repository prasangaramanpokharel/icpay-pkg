#include <stdio.h>
#include <string.h>
#include <assert.h>
#include "icbucket.h"

static void test_initialization_and_url(void) {
    icbucket_config_t cfg;
    memset(&cfg, 0, sizeof(cfg));
    strncpy(cfg.api_key, "test_api_key_123", sizeof(cfg.api_key) - 1);
    strncpy(cfg.bucket_id, "icp", sizeof(cfg.bucket_id) - 1);

    icbucket_client_t *client = NULL;
    icbucket_error_t err = icbucket_client_init(&client, &cfg);
    assert(err == ICBUCKET_OK);
    assert(client != NULL);

    char url[512];
    err = icbucket_url(client, "test.png", url, sizeof(url));
    assert(err == ICBUCKET_OK);
    assert(strcmp(url, "https://cloud.icpay.app/cloud/icp/test.png") == 0);

    err = icbucket_url(client, "/nested/report.pdf", url, sizeof(url));
    assert(err == ICBUCKET_OK);
    assert(strcmp(url, "https://cloud.icpay.app/cloud/icp/nested/report.pdf") == 0);

    icbucket_client_free(client);
}

static void test_error_strings(void) {
    assert(strcmp(icbucket_error_str(ICBUCKET_OK), "OK") == 0);
    assert(strcmp(icbucket_error_str(ICBUCKET_ERR_AUTHENTICATION_FAILED), "AUTHENTICATION_FAILED") == 0);
    assert(strcmp(icbucket_error_str(ICBUCKET_ERR_FILE_NOT_FOUND), "FILE_NOT_FOUND") == 0);
    assert(strcmp(icbucket_error_str(ICBUCKET_ERR_RATE_LIMITED), "RATE_LIMITED") == 0);
}

int main(void) {
    printf("Running C SDK unit tests...\n");
    test_initialization_and_url();
    test_error_strings();
    printf("All C SDK unit tests passed!\n");
    return 0;
}
