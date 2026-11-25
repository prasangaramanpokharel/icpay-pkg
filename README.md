# ICPay Client SDKs (`icpay-pkg`)

Official client SDKs for ICPay Cloud:
- **icBucket**: Decentralized on-chain file storage on the Internet Computer
- **icCron**: Autonomous on-chain scheduled triggers and webhook dispatcher

---

## 1. icBucket SDKs (Decentralized Storage)

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

### TypeScript Quickstart

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

### Python Quickstart

```python
from icpay_bucket import BucketClient

with BucketClient(api_key="YOUR_API_KEY", bucket_id="my-bucket") as client:
    res = client.files.upload(
        path="/documents/report.pdf",
        data=b"file payload",
        content_type="application/pdf"
    )
```

---

## 2. icCron SDKs (Autonomous Scheduler)

| Language | Directory | Registry / Module |
|---|---|---|
| **TypeScript / Node.js** | [`npm/icpay-cron`](npm/icpay-cron) | `npm i icpay-cron` |
| **Python** | [`py/icpay-cron`](py/icpay-cron) | `pip install icpay-cron` |
| **Rust** | [`rust/icpay-cron`](rust/icpay-cron) | `cargo add icpay-cron` |
| **Go** | [`go/icpay-cron`](go/icpay-cron) | `go get github.com/prasangaramanpokharel/icpay-pkg/go/icpay-cron` |
| **PHP** | [`php/icpay-cron`](php/icpay-cron) | `composer require prasangapokharel/icpay-cron` |

### TypeScript Quickstart

```typescript
import { IcCronClient } from "icpay-cron"

const client = new IcCronClient({
  apiKey: process.env.ICCRON_API_KEY
})

const job = await client.createJob({
  projectId: 1,
  label: "Hourly Sync",
  cronExpression: "0 * * * *",
  target: {
    type: "HttpWebhook",
    url: "https://example.com/api/cron",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "sync" })
  }
})
```

### Python Quickstart

```python
from icpay_cron import IcCronClient

client = IcCronClient(api_key="YOUR_API_KEY")
res = client.trigger(project_id="PROJ_ID", job_id=1)
```

### Rust Quickstart

```rust
use icpay_cron::IcCronClient;

let client = IcCronClient::new("YOUR_API_KEY", None, None);
let res = client.trigger("PROJ_ID", 1).await?;
```

---

## License

MIT
