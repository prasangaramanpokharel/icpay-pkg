from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Optional, TypedDict, Union


class FilePublic(TypedDict):
    id: str
    path: str
    name: str
    size: int
    contentType: str
    createdAt: int
    updatedAt: Optional[int]
    metadata: Optional[str]
    tags: List[str]
    publicUrl: Optional[str]


class FileListPage(TypedDict):
    items: List[FilePublic]
    total: int
    page: int
    pageSize: int


class FilePathOp(TypedDict):
    source: str
    destination: str


class ApiKeyPermissions(TypedDict):
    read: bool
    write: bool
    delete: bool


@dataclass
class UploadPayload:
    path: str
    data: bytes
    content_type: Optional[str] = None
    bucket_id: Optional[str] = None
    api_key: Optional[str] = None
    tags: Optional[List[str]] = None
    auto_chunk: bool = True
    chunk_size: int = 1_500_000


@dataclass
class ListFilesQuery:
    prefix: Optional[str] = None
    search_query: Optional[str] = None
    page: int = 0
    page_size: int = 20
    bucket_id: Optional[str] = None
    api_key: Optional[str] = None


@dataclass
class BucketUsage:
    used_bytes: int
    capacity_bytes: int
    remaining_bytes: int
    file_count: int


SINGLE_MAX_BYTES = 1_850_000
ApiResult = Union[dict, str, bytes, int, bool, None, list]
