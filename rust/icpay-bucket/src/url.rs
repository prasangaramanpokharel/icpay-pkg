pub struct UrlBuilder {
    cdn_host: String,
    bucket_id: String,
}

impl UrlBuilder {
    pub fn new(cdn_host: String, bucket_id: String) -> Self {
        Self {
            cdn_host: cdn_host.trim_end_matches('/').to_string(),
            bucket_id,
        }
    }

    pub fn file_url(&self, path: &str) -> String {
        let clean_path = path.trim_start_matches('/');
        let encoded_segments: Vec<String> = clean_path
            .split('/')
            .map(|seg| urlencoding::encode(seg).into_owned())
            .collect();
        format!("{}/cloud/{}/{}", self.cdn_host, self.bucket_id, encoded_segments.join("/"))
    }
}
