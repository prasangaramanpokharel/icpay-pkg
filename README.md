# ICPay Client SDKs (`icpay-pkg`)

Official client SDKs for ICPay Cloud / icBucket decentralized on-chain storage on the Internet Computer.

---

## Supported Languages

| Language / Framework | Directory | Registry / Module |
|---|---|---|
| **TypeScript / Node.js** | [`npm/icpay-bucket`](npm/icpay-bucket) | `npm i icpay-bucket` |
| **Python** | [`py/icpay-bucket`](py/icpay-bucket) | `pip install icpay-bucket` |
| **Rust** | [`rust/icpay-bucket`](rust/icpay-bucket) | `cargo add icpay-bucket` |
| **Go** | [`go/icpay-bucket`](go/icpay-bucket) | `go get github.com/prasangapokharel/icpay-bucket-go` |
| **Flutter / Dart** | [`flutter/icpay-bucket`](flutter/icpay-bucket) | `icpay_bucket` |
| **Java** | [`java/icpay-bucket`](java/icpay-bucket) | `app.icpay:icpay-bucket` |
| **PHP** | [`php/icpay-bucket`](php/icpay-bucket) | `composer require prasangapokharel/icpay-bucket` |
| **C (C11)** | [`c/icpay-bucket`](c/icpay-bucket) | `libicbucket.a` |
| **C++ (C++17)** | [`c++/icpay-bucket`](c++/icpay-bucket) | `libicbucket_cpp.a` |
| **Motoko** | [`motoko/icpay-bucket`](motoko/icpay-bucket) | `mops add icpay-bucket` |

---

## Quickstart by Language

### TypeScript / Node.js

```typescript
import { BucketClient } from "icpay-bucket"

const client = new BucketClient({ apiKey: process.env.BUCKET_API_KEY })

const res = await client.files.upload({
  bucketId: "my-bucket",
  path: "/documents/report.pdf",
  data: fileBuffer,
  contentType: "application/pdf"
})
```

### Python

```python
from icpay_bucket import BucketClient

with BucketClient(api_key="YOUR_API_KEY", bucket_id="my-bucket") as client:
    res = client.files.upload(
        path="/documents/report.pdf",
        data=b"file payload",
        content_type="application/pdf"
    )
```

### Rust

```rust
use icpay_bucket::{ClientConfig, ICBucket, UploadPayload};

let config = ClientConfig {
    api_key: "YOUR_API_KEY".to_string(),
    bucket_id: "my-bucket".to_string(),
    endpoint: None,
    cdn_host: None,
    timeout_ms: None,
};
let client = ICBucket::new(config)?;

let uploaded = client.files.upload(UploadPayload {
    path: "/documents/report.pdf".to_string(),
    data: bytes::Bytes::from("file payload"),
    content_type: Some("application/pdf".to_string()),
    tags: None,
    visibility: None,
}).await?;
```

### Go

```go
package main

import (
    "context"
    icbucket "github.com/prasangapokharel/icpay-bucket-go"
)

func main() {
    client, err := icbucket.NewClient(icbucket.Config{
        APIKey:        "YOUR_API_KEY",
        DefaultBucket: "my-bucket",
    })
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    res, err := client.UploadFile(ctx, icbucket.UploadFileParams{
        Path:        "/documents/report.pdf",
        Data:        []byte("file payload"),
        ContentType: "application/pdf",
    })
}
```

### Flutter & Dart

```dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:icpay_bucket/icpay_bucket.dart';

void main() async {
  final client = ICBucketClient(
    apiKey: 'YOUR_API_KEY',
    bucketId: 'my-bucket',
  );

  final data = Uint8List.fromList(utf8.encode('file payload'));
  final uploaded = await client.files.upload(
    path: '/documents/notes.txt',
    data: data,
    contentType: 'text/plain',
  );
}
```

### Java

```java
import app.icpay.bucket.Client;
import app.icpay.bucket.model.FileMetadata;
import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) {
        Client client = new Client("YOUR_API_KEY", "my-bucket");
        byte[] data = "file payload".getBytes(StandardCharsets.UTF_8);

        FileMetadata uploaded = client.files.upload(
            "/documents/notes.txt",
            data,
            "text/plain",
            null,
            null
        );
    }
}
```

### PHP

```php
use ICPay\Bucket\Client;

$client = new Client('YOUR_API_KEY', 'my-bucket');

$uploaded = $client->files->upload(
    '/documents/notes.txt',
    'file payload',
    'text/plain'
);
```

### C

```c
#include "icbucket.h"

int main() {
    icbucket_config_t config = {0};
    strncpy(config.api_key, "YOUR_API_KEY", sizeof(config.api_key) - 1);
    strncpy(config.bucket_id, "my-bucket", sizeof(config.bucket_id) - 1);

    icbucket_client_t client;
    icbucket_init(&client, &config);

    icbucket_file_metadata_t meta;
    icbucket_upload_file(&client, "/documents/notes.txt", "file payload", 12, "text/plain", &meta);
    icbucket_free(&client);
    return 0;
}
```

### C++

```cpp
#include <icbucket/client.hpp>

int main() {
    icbucket::ClientConfig config;
    config.api_key = "YOUR_API_KEY";
    config.bucket_id = "my-bucket";

    icbucket::Client client(config);
    std::string payload = "file payload";
    auto meta = client.files.upload("/documents/notes.txt", payload, "text/plain");
    return 0;
}
```

### Motoko

```motoko
import Principal "mo:core/Principal";
import BucketClient "mo:icpay-bucket";

actor {
  let client = BucketClient.Client({
    canisterId = Principal.fromText("6vbhm-nqaaa-aaaan-q6muq-cai");
    apiKey = null;
  });
};
```

---

## License

MIT
