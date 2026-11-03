use crate::error::{BucketError, ErrorCode};
use crate::types::{FileMetadata, FilePathOperation, ListFilesQuery, ListFilesResult, UploadPayload};
use crate::url::UrlBuilder;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::sync::Arc;

pub struct FileOperations {
    http: reqwest::Client,
    base_url: String,
    bucket_id: String,
    api_key: String,
    url_builder: Arc<UrlBuilder>,
}

impl FileOperations {
    pub fn new(
        http: reqwest::Client,
        base_url: String,
        bucket_id: String,
        api_key: String,
        url_builder: Arc<UrlBuilder>,
    ) -> Self {
        Self {
            http,
            base_url,
            bucket_id,
            api_key,
            url_builder,
        }
    }

    pub fn url(&self, path: &str) -> String {
        self.url_builder.file_url(path)
    }

    pub async fn upload(&self, payload: UploadPayload) -> Result<FileMetadata, BucketError> {
        let clean_path = payload.path.trim_start_matches('/');
        if clean_path.is_empty() {
            return Err(BucketError::Validation("path cannot be empty".to_string()));
        }

        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", self.api_key)).map_err(|e| BucketError::Validation(e.to_string()))?);
        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_str(payload.content_type.as_deref().unwrap_or("application/octet-stream")).map_err(|e| BucketError::Validation(e.to_string()))?,
        );
        headers.insert("x-bucket-id", HeaderValue::from_str(&self.bucket_id).map_err(|e| BucketError::Validation(e.to_string()))?);
        headers.insert("x-file-path", HeaderValue::from_str(clean_path).map_err(|e| BucketError::Validation(e.to_string()))?);

        if let Some(visibility) = payload.visibility {
            headers.insert("x-visibility", HeaderValue::from_str(&visibility).map_err(|e| BucketError::Validation(e.to_string()))?);
        }

        if let Some(tags) = payload.tags {
            headers.insert("x-file-tags", HeaderValue::from_str(&tags.join(",")).map_err(|e| BucketError::Validation(e.to_string()))?);
        }

        let endpoint = format!("{}/api/v1/buckets/{}/files/{}", self.base_url, self.bucket_id, urlencoding::encode(clean_path));
        let response = self.http.put(&endpoint).headers(headers).body(payload.data).send().await?;

        self.handle_response(response).await
    }

    pub async fn get(&self, path: &str) -> Result<FileMetadata, BucketError> {
        let clean_path = path.trim_start_matches('/');
        let endpoint = format!(
            "{}/api/v1/buckets/{}/files/{}/metadata",
            self.base_url,
            self.bucket_id,
            urlencoding::encode(clean_path)
        );

        let response = self
            .http
            .get(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .send()
            .await?;

        self.handle_response(response).await
    }

    pub async fn list(&self, query: ListFilesQuery) -> Result<ListFilesResult, BucketError> {
        let mut endpoint = format!("{}/api/v1/buckets/{}/files", self.base_url, self.bucket_id);
        let mut query_params = Vec::new();

        if let Some(prefix) = query.prefix {
            query_params.push(format!("prefix={}", urlencoding::encode(&prefix)));
        }
        if let Some(cursor) = query.cursor {
            query_params.push(format!("cursor={}", urlencoding::encode(&cursor)));
        }
        if let Some(limit) = query.limit {
            query_params.push(format!("limit={}", limit));
        }

        if !query_params.is_empty() {
            endpoint.push('?');
            endpoint.push_str(&query_params.join("&"));
        }

        let response = self
            .http
            .get(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .send()
            .await?;

        self.handle_response(response).await
    }

    pub async fn delete(&self, path: &str) -> Result<(), BucketError> {
        let clean_path = path.trim_start_matches('/');
        let endpoint = format!("{}/api/v1/buckets/{}/files/{}", self.base_url, self.bucket_id, urlencoding::encode(clean_path));

        let response = self
            .http
            .delete(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let req_id = response.headers().get("x-request-id").and_then(|v| v.to_str().ok()).map(String::from);
            return Err(BucketError::api(ErrorCode::InternalError, "Delete operation failed", Some(status), req_id));
        }

        Ok(())
    }

    pub async fn copy(&self, op: FilePathOperation) -> Result<FileMetadata, BucketError> {
        let endpoint = format!("{}/api/v1/buckets/{}/actions/copy", self.base_url, self.bucket_id);
        let response = self
            .http
            .post(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .json(&op)
            .send()
            .await?;

        self.handle_response(response).await
    }

    pub async fn move_file(&self, op: FilePathOperation) -> Result<FileMetadata, BucketError> {
        let endpoint = format!("{}/api/v1/buckets/{}/actions/move", self.base_url, self.bucket_id);
        let response = self
            .http
            .post(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .json(&op)
            .send()
            .await?;

        self.handle_response(response).await
    }

    pub async fn exists(&self, path: &str) -> Result<bool, BucketError> {
        match self.get(path).await {
            Ok(_) => Ok(true),
            Err(BucketError::Api { code: ErrorCode::FileNotFound, .. }) => Ok(false),
            Err(err) => Err(err),
        }
    }

    async fn handle_response<T: serde::de::DeserializeOwned>(&self, response: reqwest::Response) -> Result<T, BucketError> {
        let status = response.status();
        let req_id = response.headers().get("x-request-id").and_then(|v| v.to_str().ok()).map(String::from);

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            let code = match status.as_u16() {
                401 => ErrorCode::AuthenticationFailed,
                403 => ErrorCode::PermissionDenied,
                404 => ErrorCode::FileNotFound,
                413 => ErrorCode::CapacityExceeded,
                429 => ErrorCode::RateLimited,
                _ => ErrorCode::InternalError,
            };
            return Err(BucketError::api(code, body, Some(status.as_u16()), req_id));
        }

        let data = response.json::<T>().await?;
        Ok(data)
    }
}
