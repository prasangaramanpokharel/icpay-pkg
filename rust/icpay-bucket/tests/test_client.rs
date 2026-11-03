use icpay_bucket::{ClientConfig, ICBucket};

#[test]
fn test_client_initialization() {
    let config = ClientConfig {
        api_key: "test_key".to_string(),
        bucket_id: "my-bucket".to_string(),
        endpoint: None,
        cdn_host: None,
        timeout_ms: None,
    };
    let client = ICBucket::new(config);
    assert!(client.is_ok());
}

#[test]
fn test_empty_api_key_fails() {
    let config = ClientConfig {
        api_key: "".to_string(),
        bucket_id: "my-bucket".to_string(),
        endpoint: None,
        cdn_host: None,
        timeout_ms: None,
    };
    let client = ICBucket::new(config);
    assert!(client.is_err());
}

#[test]
fn test_url_builder() {
    let config = ClientConfig {
        api_key: "test_key".to_string(),
        bucket_id: "my-bucket".to_string(),
        endpoint: None,
        cdn_host: Some("https://cloud.icpay.app".to_string()),
        timeout_ms: None,
    };
    let client = ICBucket::new(config).unwrap();
    let url = client.files.url("/photos/nature.png");
    assert_eq!(url, "https://cloud.icpay.app/cloud/my-bucket/photos/nature.png");
}
