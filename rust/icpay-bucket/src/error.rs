#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    AuthenticationFailed,
    PermissionDenied,
    BucketNotFound,
    FileNotFound,
    InvalidPath,
    InvalidRequest,
    CapacityExceeded,
    BucketExpired,
    UploadFailed,
    ChunkFailed,
    RateLimited,
    NetworkError,
    InternalError,
}

#[derive(Debug, thiserror::Error)]
pub enum BucketError {
    #[error("API error [{code:?}]: {message}")]
    Api {
        code: ErrorCode,
        message: String,
        status: Option<u16>,
        request_id: Option<String>,
    },
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Validation error: {0}")]
    Validation(String),
}

impl BucketError {
    pub fn api(code: ErrorCode, message: impl Into<String>, status: Option<u16>, request_id: Option<String>) -> Self {
        Self::Api {
            code,
            message: message.into(),
            status,
            request_id,
        }
    }
}
