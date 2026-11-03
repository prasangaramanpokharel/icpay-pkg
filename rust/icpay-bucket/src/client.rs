use crate::error::BucketError;
use crate::files::FileOperations;
use crate::types::{BucketUsage, ClientConfig};
use crate::url::UrlBuilder;
use reqwest::header::AUTHORIZATION;
use std::sync::Arc;
use std::time::Duration;

pub struct ICBucket {
    pub files: FileOperations,
    http: reqwest::Client,
    base_url: String,
    bucket_id: String,
    api_key: String,
}

impl ICBucket {
    pub fn new(config: ClientConfig) -> Result<Self, BucketError> {
        if config.api_key.trim().is_empty() {
            return Err(BucketError::Validation("api_key cannot be empty".to_string()));
        }
        if config.bucket_id.trim().is_empty() {
            return Err(BucketError::Validation("bucket_id cannot be empty".to_string()));
        }

        let timeout = Duration::from_millis(config.timeout_ms.unwrap_or(30000));
        let http = reqwest::Client::builder().timeout(timeout).build()?;

        let base_url = config.endpoint.unwrap_or_else(|| "https://api.icpay.app".to_string()).trim_end_matches('/').to_string();
        let cdn_host = config.cdn_host.unwrap_or_else(|| "https://cloud.icpay.app".to_string());
        let url_builder = Arc::new(UrlBuilder::new(cdn_host, config.bucket_id.clone()));

        let files = FileOperations::new(
            http.clone(),
            base_url.clone(),
            config.bucket_id.clone(),
            config.api_key.clone(),
            url_builder,
        );

        Ok(Self {
            files,
            http,
            base_url,
            bucket_id: config.bucket_id,
            api_key: config.api_key,
        })
    }

    pub async fn usage(&self) -> Result<BucketUsage, BucketError> {
        let endpoint = format!("{}/api/v1/buckets/{}/usage", self.base_url, self.bucket_id);
        let response = self
            .http
            .get(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .send()
            .await?;

        let status = response.status();
        let req_id = response.headers().get("x-request-id").and_then(|v| v.to_str().ok()).map(String::from);

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BucketError::api(crate::error::ErrorCode::InternalError, body, Some(status.as_u16()), req_id));
        }

        let usage = response.json::<BucketUsage>().await?;
        Ok(usage)
    }
}
