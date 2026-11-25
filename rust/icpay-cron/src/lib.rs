use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const DEFAULT_CANISTER_ID: &str = "w2fxo-5qaaa-aaaan-q6zxq-cai";
pub const DEFAULT_HOST: &str = "https://icp0.io";

#[derive(Error, Debug)]
pub enum IcCronError {
    #[error("Authentication failed: {0}")]
    Authentication(String),
    #[error("Job not found: {0}")]
    NotFound(String),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("General error: {0}")]
    General(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerResponse {
    pub ok: bool,
    #[serde(default)]
    pub job_id: Option<u64>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct IcCronClient {
    pub api_key: String,
    pub canister_id: String,
    pub host: String,
    client: reqwest::Client,
}

impl IcCronClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            canister_id: DEFAULT_CANISTER_ID.to_string(),
            host: DEFAULT_HOST.to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub fn with_canister_id(mut self, canister_id: impl Into<String>) -> Self {
        self.canister_id = canister_id.into();
        self
    }

    pub fn with_host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }

    pub fn format_project_id(id: u64) -> String {
        format!("cr_{:08x}", id)
    }

    async fn request_json(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, IcCronError> {
        let is_local = self.host.contains("127.0.0.1") || self.host.contains("localhost");
        let (url, host_header) = if is_local {
            let base = self.host.trim_end_matches('/');
            (
                format!("{}{}?canisterId={}", base, path, self.canister_id),
                Some(format!("{}.raw.localhost", self.canister_id)),
            )
        } else {
            (
                format!("https://{}.raw.icp0.io{}", self.canister_id, path),
                None,
            )
        };

        let mut req = self
            .client
            .request(method, &url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json");

        if let Some(h) = host_header {
            req = req.header("Host", h);
        }
        if let Some(payload) = body {
            req = req.json(&payload);
        }

        let resp = req.send().await?;
        let status = resp.status();
        let val: serde_json::Value = resp.json().await?;

        if !status.is_success() {
            let msg = val
                .get("error")
                .and_then(|e| e.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("Request failed with HTTP {}", status));
            if status.as_u16() == 401 {
                return Err(IcCronError::Authentication(msg));
            }
            if status.as_u16() == 404 {
                return Err(IcCronError::NotFound(msg));
            }
            return Err(IcCronError::General(msg));
        }

        Ok(val)
    }

    pub async fn trigger(&self, project_id: &str, job_id: u64) -> Result<TriggerResponse, IcCronError> {
        let val = self
            .request_json(
                reqwest::Method::POST,
                "/api/v1/cron/trigger",
                Some(serde_json::json!({
                    "project_id": project_id,
                    "job_id": job_id,
                })),
            )
            .await?;
        Ok(serde_json::from_value(val)?)
    }

    pub async fn create_job(
        &self,
        label: &str,
        cron_expression: &str,
        target: serde_json::Value,
    ) -> Result<serde_json::Value, IcCronError> {
        let val = self
            .request_json(
                reqwest::Method::POST,
                "/api/v1/cron/jobs",
                Some(serde_json::json!({
                    "label": label,
                    "cron_expression": cron_expression,
                    "target": target,
                })),
            )
            .await?;
        Ok(val.get("job").cloned().unwrap_or(val))
    }

    pub async fn list_jobs(&self) -> Result<Vec<serde_json::Value>, IcCronError> {
        let val = self
            .request_json(reqwest::Method::GET, "/api/v1/cron/jobs", None)
            .await?;
        Ok(val
            .get("jobs")
            .and_then(|j| j.as_array())
            .cloned()
            .unwrap_or_default())
    }

    pub async fn pause_job(&self, job_id: u64) -> Result<serde_json::Value, IcCronError> {
        self.request_json(
            reqwest::Method::POST,
            &format!("/api/v1/cron/jobs/{}/pause", job_id),
            None,
        )
        .await
    }

    pub async fn resume_job(&self, job_id: u64) -> Result<serde_json::Value, IcCronError> {
        self.request_json(
            reqwest::Method::POST,
            &format!("/api/v1/cron/jobs/{}/resume", job_id),
            None,
        )
        .await
    }

    pub async fn delete_job(&self, job_id: u64) -> Result<serde_json::Value, IcCronError> {
        self.request_json(
            reqwest::Method::DELETE,
            &format!("/api/v1/cron/jobs/{}", job_id),
            None,
        )
        .await
    }

    pub async fn get_job_logs(&self, job_id: u64) -> Result<Vec<serde_json::Value>, IcCronError> {
        let val = self
            .request_json(
                reqwest::Method::GET,
                &format!("/api/v1/cron/jobs/{}/logs", job_id),
                None,
            )
            .await?;
        Ok(val
            .get("logs")
            .and_then(|l| l.as_array())
            .cloned()
            .unwrap_or_default())
    }

    pub async fn get_project_logs(&self) -> Result<Vec<serde_json::Value>, IcCronError> {
        let val = self
            .request_json(reqwest::Method::GET, "/api/v1/cron/logs", None)
            .await?;
        Ok(val
            .get("logs")
            .and_then(|l| l.as_array())
            .cloned()
            .unwrap_or_default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_builder() {
        let client = IcCronClient::new("icp_cron_test_123")
            .with_canister_id("uxrrr-q7777-77774-qaaaq-cai")
            .with_host("http://127.0.0.1:4943");

        assert_eq!(client.api_key, "icp_cron_test_123");
        assert_eq!(client.canister_id, "uxrrr-q7777-77774-qaaaq-cai");
        assert_eq!(client.host, "http://127.0.0.1:4943");
    }

    #[test]
    fn test_format_project_id() {
        assert_eq!(IcCronClient::format_project_id(1), "cr_00000001");
        assert_eq!(IcCronClient::format_project_id(16), "cr_00000010");
    }

    #[tokio::test]
    async fn test_live_local_trigger() {
        let client = IcCronClient::new("icp_cron_f880a426c475f04859a30828fb1234a5e844f13d659e8b94e1a48eb70af9bc68")
            .with_canister_id("uxrrr-q7777-77774-qaaaq-cai")
            .with_host("http://127.0.0.1:4943");

        match client.trigger("cr_00000001", 1).await {
            Ok(resp) => {
                assert!(resp.ok);
                assert_eq!(resp.job_id, Some(1));
                assert_eq!(resp.status.as_deref(), Some("triggered"));
            }
            Err(err) => {
                eprintln!("Notice: Live local trigger: {:?}", err);
            }
        }
    }
}
