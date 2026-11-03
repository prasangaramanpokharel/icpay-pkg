# icpay-bucket (C)

C client library for [ICPay Bucket](https://icpay.app) on-chain storage.

**Version:** 1.0.0 · **Standard:** C11 / C99 · **Dependencies:** libcurl

---

## Build

```bash
make
make test
```

---

## Quick Start

```c
#include <stdio.h>
#include <string.h>
#include "icbucket.h"

int main(void) {
    icbucket_config_t config;
    memset(&config, 0, sizeof(config));
    strncpy(config.api_key, "icp_cloud_...", sizeof(config.api_key) - 1);
    strncpy(config.bucket_id, "icp", sizeof(config.bucket_id) - 1);

    icbucket_client_t *client = NULL;
    icbucket_error_t err = icbucket_client_init(&client, &config);
    if (err != ICBUCKET_OK) {
        fprintf(stderr, "Init failed: %s\n", icbucket_error_str(err));
        return 1;
    }

    const char *data = "Hello from C SDK!";
    icbucket_file_metadata_t meta;
    err = icbucket_upload(client, "hello.txt", (const uint8_t *)data, strlen(data), "text/plain", &meta);
    if (err == ICBUCKET_OK) {
        printf("Uploaded: %s\n", meta.url);
    }

    char url[512];
    icbucket_url(client, "hello.txt", url, sizeof(url));
    printf("CDN URL: %s\n", url);

    icbucket_delete(client, "hello.txt");

    icbucket_client_free(client);
    return 0;
}
```

---

## License

MIT
