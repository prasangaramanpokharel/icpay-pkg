# icpay-bucket (Rust)

Rust client library for [ICPay Bucket](https://icpay.app) on-chain storage.

**Version:** 1.1.0 · **Edition:** 2021

---

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
icpay-bucket = "1.1.0"
tokio = { version = "1.0", features = ["full"] }
```

---

## Quick Start

```rust
use icpay_bucket::client::ICBucket;
use icpay_bucket::types::{ClientConfig, UploadPayload};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bucket = ICBucket::new(ClientConfig {
        api_key: std::env::var("ICBUCKET_API_KEY")?,
        bucket_id: "icp".to_string(),
        endpoint: None,
        cdn_host: None,
        timeout_ms: None,
    })?;

    let file = bucket
        .files
        .upload(UploadPayload {
            path: "documents/report.pdf".to_string(),
            data: bytes::Bytes::from_static(b"Sample PDF bytes"),
            content_type: Some("application/pdf".to_string()),
            tags: Some(vec!["report".to_string()]),
            visibility: Some("public".to_string()),
        })
        .await?;

    println!("Uploaded URL: {}", file.url);
    println!("CDN URL: {}", bucket.files.url("documents/report.pdf"));

    bucket.files.delete("documents/report.pdf").await?;

    Ok(())
}
```

---

## License

MIT
