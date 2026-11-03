from __future__ import annotations

import urllib.parse

DEFAULT_CANISTER_ID = "6vbhm-nqaaa-aaaan-q6muq-cai"
CDN_BASE_URL = "https://cloud.icpay.app"
DEFAULT_CDN_HOST = CDN_BASE_URL


def public_file_url(
    canister_id: str,
    bucket_name: str,
    path: str,
    gateway: str = "cdn",
) -> str:
    clean_path = path if path.startswith("/") else "/" + path
    if gateway == "cdn":
        return f"{CDN_BASE_URL}/cloud/{bucket_name}{clean_path}"
    return f"https://{canister_id}.raw.icp0.io/cloud/{bucket_name}{clean_path}"


class UrlBuilder:
    def __init__(self, bucket_id: str, cdn_host: str = CDN_BASE_URL) -> None:
        self.bucket_id = bucket_id
        self.cdn_host = cdn_host.rstrip("/")

    def file_url(self, path: str) -> str:
        clean_path = path.lstrip("/")
        encoded_segments = [urllib.parse.quote(part) for part in clean_path.split("/")]
        return f"{self.cdn_host}/cloud/{self.bucket_id}/{'/'.join(encoded_segments)}"