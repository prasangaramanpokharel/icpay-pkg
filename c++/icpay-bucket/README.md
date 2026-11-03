# icpay-bucket (C++)

Modern C++ client library for [ICPay Bucket](https://icpay.app) on-chain storage.

**Version:** 1.0.0 · **Standard:** C++17 · **Dependencies:** libcurl

---

## Build

```bash
make
make test
```

---

## Quick Start

```cpp
#include <iostream>
#include <string>
#include <vector>
#include "icbucket/client.hpp"

int main() {
    using namespace icbucket;

    ClientConfig config;
    config.api_key = "icp_cloud_...";
    config.bucket_id = "icp";

    ICBucket bucket(config);

    std::string text = "Hello from C++ SDK!";
    UploadPayload payload;
    payload.path = "documents/hello.txt";
    payload.data = std::vector<uint8_t>(text.begin(), text.end());
    payload.content_type = "text/plain";

    FileMetadata meta = bucket.files.upload(payload);
    std::cout << "Uploaded: " << meta.url << std::endl;

    std::cout << "CDN URL: " << bucket.files.url("documents/hello.txt") << std::endl;

    bucket.files.delete_file("documents/hello.txt");

    return 0;
}
```

---

## License

MIT
