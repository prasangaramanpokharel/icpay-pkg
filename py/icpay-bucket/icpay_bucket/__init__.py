from __future__ import annotations

from .client import BucketClient, FileOperations
from .errors import ErrorCode, ICBucketError, unwrap_result
from .types import (
    SINGLE_MAX_BYTES,
    ApiKeyPermissions,
    BucketUsage,
    FileListPage,
    FilePathOp,
    FilePublic,
    ListFilesQuery,
    UploadPayload,
)
from .url import CDN_BASE_URL, DEFAULT_CANISTER_ID, DEFAULT_CDN_HOST, UrlBuilder, public_file_url

ICBucket = BucketClient

__all__ = [
    "BucketClient",
    "ICBucket",
    "FileOperations",
    "UrlBuilder",
    "ICBucketError",
    "ErrorCode",
    "unwrap_result",
    "FilePublic",
    "FileListPage",
    "FilePathOp",
    "ApiKeyPermissions",
    "UploadPayload",
    "ListFilesQuery",
    "BucketUsage",
    "SINGLE_MAX_BYTES",
    "DEFAULT_CANISTER_ID",
    "DEFAULT_CDN_HOST",
    "CDN_BASE_URL",
    "public_file_url",
]

__version__ = "1.2.1"
