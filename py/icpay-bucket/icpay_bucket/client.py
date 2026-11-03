from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from ic.agent import Agent
from ic.candid import Types, encode
from ic.client import Client
from ic.identity import Identity

_orig_query_endpoint = Agent.query_endpoint
def _safe_query_endpoint(self: Agent, canister_id: Any, data: Any) -> Any:
    ret = _orig_query_endpoint(self, canister_id, data)
    if not isinstance(ret, dict) and hasattr(ret, "items"):
        return dict(ret)
    return ret
Agent.query_endpoint = _safe_query_endpoint

from .candid_types import (
    bucket_visibility,
    encode_blob,
    encode_nat,
    encode_opt_text,
    encode_text,
    encode_vec_text,
    file_list_page,
    file_path_op,
    file_public,
    ok_err,
)
from .errors import ICBucketError
from .types import SINGLE_MAX_BYTES, FilePathOp
from .url import CDN_BASE_URL, DEFAULT_CANISTER_ID, UrlBuilder, public_file_url


class FileOperations:
    def __init__(self, client: BucketClient) -> None:
        self.client = client

    def url(self, path: str, bucket_id: Optional[str] = None, gateway: str = "cdn") -> str:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.public_url(target_bucket, path, gateway=gateway)

    def upload(
        self,
        path: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        bucket_id: Optional[str] = None,
        api_key: Optional[str] = None,
        auto_chunk: bool = True,
        chunk_size: int = 1_500_000,
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.upload_file(
            bucket_id=target_bucket,
            path=path,
            data=data,
            content_type=content_type,
            api_key=api_key,
            auto_chunk=auto_chunk,
            chunk_size=chunk_size,
        )

    def get(
        self, path: str, bucket_id: Optional[str] = None, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.get_file(target_bucket, path, api_key=api_key)

    def list(
        self,
        page: int = 0,
        page_size: int = 20,
        prefix: Optional[str] = None,
        search_query: Optional[str] = None,
        bucket_id: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        if prefix:
            return self.client.list_folder(
                target_bucket, prefix, page=page, page_size=page_size, api_key=api_key
            )
        if search_query:
            return self.client.search_files(
                target_bucket, search_query, page=page, page_size=page_size, api_key=api_key
            )
        return self.client.list_files(
            target_bucket, page=page, page_size=page_size, api_key=api_key
        )

    def exists(
        self, path: str, bucket_id: Optional[str] = None, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.file_exists(target_bucket, path, api_key=api_key)

    def download(
        self, path: str, bucket_id: Optional[str] = None, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.download_file(target_bucket, path, api_key=api_key)

    def delete(
        self, path: str, bucket_id: Optional[str] = None, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.delete_file(target_bucket, path, api_key=api_key)

    def copy(
        self,
        source_path: str,
        destination_path: str,
        bucket_id: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.copy_file(
            target_bucket, source_path, destination_path, api_key=api_key
        )

    def move(
        self,
        source_path: str,
        destination_path: str,
        bucket_id: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        target_bucket = self.client.resolve_bucket_id(bucket_id)
        return self.client.move_file(
            target_bucket, source_path, destination_path, api_key=api_key
        )


class BucketClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        bucket_id: Optional[str] = None,
        canister_id: str = DEFAULT_CANISTER_ID,
        host: str = "https://icp0.io",
        cdn_host: str = CDN_BASE_URL,
    ) -> None:
        self.api_key = api_key
        self.bucket_id = bucket_id
        self.canister_id = canister_id
        self.cdn_host = cdn_host
        self._agent = Agent(Identity(), Client(host))
        self.files = FileOperations(self)

    def __enter__(self) -> BucketClient:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass

    def resolve_bucket_id(self, explicit: Optional[str] = None) -> str:
        resolved = explicit or self.bucket_id
        if not resolved:
            raise ICBucketError("INVALID_REQUEST", "bucket_id is required")
        return resolved

    def _opt_key(self, explicit: Optional[str] = None) -> dict[str, Any]:
        key = explicit if explicit is not None else self.api_key
        return encode_opt_text(key)

    def _query(self, method: str, fields: List[dict[str, Any]], ret: Any) -> Dict[str, Any]:
        args = encode(fields)
        raw = self._agent.query_raw(self.canister_id, method, args, return_type=ret)
        return raw[0]["value"]

    def _update(self, method: str, fields: List[dict[str, Any]], ret: Any) -> Dict[str, Any]:
        args = encode(fields)
        raw = self._agent.update_raw(self.canister_id, method, args, return_type=ret)
        return raw[0]["value"]

    def public_url(self, bucket_name: str, path: str, gateway: str = "cdn") -> str:
        return public_file_url(self.canister_id, bucket_name, path, gateway=gateway)

    def usage(self, bucket_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        return self.get_bucket_stats(target)

    def get_bucket_price(self, capacity_gb: int) -> Dict[str, Any]:
        return self._query(
            "getBucketPrice",
            [encode_nat(capacity_gb)],
            ok_err(Types.Nat),
        )

    def create_bucket(
        self, name: str, capacity_gb: int, visibility: str = "Public"
    ) -> Dict[str, Any]:
        vis = {"Public": None} if visibility == "Public" else {"Private": None}
        return self._update(
            "createBucket",
            [
                encode_text(name),
                encode_nat(capacity_gb),
                {"type": bucket_visibility(), "value": vis},
            ],
            ok_err(Types.Text),
        )

    def get_bucket(self, bucket_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        return self._query("getBucket", [encode_text(target)], ok_err(Types.Record({})))

    def get_bucket_stats(self, bucket_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        return self._query("getBucketStats", [encode_text(target)], ok_err(Types.Record({})))

    def get_renew_quote(self, bucket_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        return self._query("getRenewQuote", [encode_text(target)], ok_err(Types.Record({})))

    def list_buckets(self) -> Dict[str, Any]:
        return self._query("listBuckets", [], ok_err(Types.Vec(Types.Record({}))))

    def renew_bucket(self, bucket_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        return self._update("renewBucket", [encode_text(target)], ok_err(Types.Record({})))

    def update_bucket(
        self,
        bucket_id: Optional[str] = None,
        name: Optional[str] = None,
        visibility: Optional[str] = None,
    ) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        vis_val: Any = []
        if visibility:
            vis_val = [{"Public": None} if visibility == "Public" else {"Private": None}]
        return self._update(
            "updateBucket",
            [
                encode_text(target),
                encode_opt_text(name),
                {"type": Types.Opt(bucket_visibility()), "value": vis_val},
            ],
            ok_err(Types.Record({})),
        )

    def delete_bucket(self, bucket_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.resolve_bucket_id(bucket_id)
        return self._update("deleteBucket", [encode_text(target)], ok_err(Types.Null))

    def get_bucket_cycle_status(self) -> Dict[str, Any]:
        return self._query("getBucketCycleStatus", [], ok_err(Types.Record({})))

    def upload_file(
        self,
        bucket_id: Optional[str] = None,
        path: str = "",
        data: bytes = b"",
        content_type: str = "application/octet-stream",
        api_key: Optional[str] = None,
        auto_chunk: bool = True,
        chunk_size: int = 1_500_000,
    ) -> Dict[str, Any]:
        target_bucket = self.resolve_bucket_id(bucket_id)
        if len(data) > SINGLE_MAX_BYTES:
            if not auto_chunk:
                return {"err": "File too large for single upload"}

            begin = self.begin_file_upload(
                bucket_id=target_bucket,
                path=path,
                content_type=content_type,
                total_size=len(data),
                api_key=api_key,
            )
            if "err" in begin:
                return begin

            upload_id = begin["ok"]
            total_chunks = math.ceil(len(data) / chunk_size)

            for i in range(total_chunks):
                start = i * chunk_size
                end = min(start + chunk_size, len(data))
                chunk_data = data[start:end]
                chunk_res = self.upload_file_chunk_indexed(upload_id, i, chunk_data)
                if "err" in chunk_res:
                    try:
                        self.cancel_upload(upload_id)
                    except Exception:
                        pass
                    return {"err": f"Chunk {i} failed: {chunk_res['err']}"}

            return self.complete_file_upload(upload_id, api_key=api_key)

        return self._update(
            "uploadFile",
            [
                encode_text(target_bucket),
                encode_text(path),
                encode_blob(data),
                encode_text(content_type),
                self._opt_key(api_key),
            ],
            ok_err(Types.Text),
        )

    def begin_file_upload(
        self,
        bucket_id: str,
        path: str,
        content_type: str,
        total_size: int,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "beginFileUpload",
            [
                encode_text(bucket_id),
                encode_text(path),
                encode_text(content_type),
                encode_nat(total_size),
                self._opt_key(api_key),
            ],
            ok_err(Types.Text),
        )

    def upload_file_chunk_indexed(
        self, upload_id: str, chunk_index: int, data: bytes
    ) -> Dict[str, Any]:
        return self._update(
            "uploadFileChunkIndexed",
            [encode_text(upload_id), encode_nat(chunk_index), encode_blob(data)],
            ok_err(Types.Nat),
        )

    def complete_file_upload(self, upload_id: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        return self._update(
            "completeFileUpload",
            [encode_text(upload_id), self._opt_key(api_key)],
            ok_err(Types.Text),
        )

    def get_upload(self, upload_id: str) -> Dict[str, Any]:
        return self._query("getUpload", [encode_text(upload_id)], ok_err(Types.Record({})))

    def cancel_upload(self, upload_id: str) -> Dict[str, Any]:
        return self._update("cancelUpload", [encode_text(upload_id)], ok_err(Types.Null))

    def download_file(
        self, bucket_id: str, path: str, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        value = self._update(
            "downloadFile",
            [
                encode_text(bucket_id),
                encode_text(path),
                self._opt_key(api_key),
            ],
            ok_err(Types.Vec(Types.Nat8)),
        )
        if "ok" in value:
            return {"ok": bytes(value["ok"])}
        return value

    def get_public_file_url(self, bucket_id: str, path: str) -> Dict[str, Any]:
        return self._query(
            "getPublicFileUrl",
            [encode_text(bucket_id), encode_text(path)],
            ok_err(Types.Text),
        )

    def list_files(
        self,
        bucket_id: str,
        page: int = 0,
        page_size: int = 20,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._query(
            "listFiles",
            [
                encode_text(bucket_id),
                encode_nat(page),
                encode_nat(page_size),
                self._opt_key(api_key),
            ],
            ok_err(file_list_page()),
        )

    def get_file(
        self, bucket_id: str, path: str, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return self._query(
            "getFile",
            [encode_text(bucket_id), encode_text(path), self._opt_key(api_key)],
            ok_err(file_public()),
        )

    def file_exists(
        self, bucket_id: str, path: str, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return self._query(
            "fileExists",
            [encode_text(bucket_id), encode_text(path), self._opt_key(api_key)],
            ok_err(Types.Bool),
        )

    def list_folder(
        self,
        bucket_id: str,
        prefix: str,
        page: int = 0,
        page_size: int = 20,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._query(
            "listFolder",
            [
                encode_text(bucket_id),
                encode_text(prefix),
                encode_nat(page),
                encode_nat(page_size),
                self._opt_key(api_key),
            ],
            ok_err(file_list_page()),
        )

    def search_files(
        self,
        bucket_id: str,
        query: str,
        page: int = 0,
        page_size: int = 20,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._query(
            "searchFiles",
            [
                encode_text(bucket_id),
                encode_text(query),
                encode_nat(page),
                encode_nat(page_size),
                self._opt_key(api_key),
            ],
            ok_err(file_list_page()),
        )

    def get_file_metadata(
        self, bucket_id: str, path: str, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return self._query(
            "getFileMetadata",
            [encode_text(bucket_id), encode_text(path), self._opt_key(api_key)],
            ok_err(Types.Text),
        )

    def delete_file(
        self, bucket_id: str, path: str, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return self._update(
            "deleteFile",
            [encode_text(bucket_id), encode_text(path), self._opt_key(api_key)],
            ok_err(Types.Null),
        )

    def update_file(
        self,
        bucket_id: str,
        path: str,
        name: Optional[str] = None,
        content_type: Optional[str] = None,
        metadata: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "updateFile",
            [
                encode_text(bucket_id),
                encode_text(path),
                encode_opt_text(name),
                encode_opt_text(content_type),
                encode_opt_text(metadata),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def move_file(
        self,
        bucket_id: str,
        source_path: str,
        destination_path: str,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "moveFile",
            [
                encode_text(bucket_id),
                encode_text(source_path),
                encode_text(destination_path),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def copy_file(
        self,
        bucket_id: str,
        source_path: str,
        destination_path: str,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "copyFile",
            [
                encode_text(bucket_id),
                encode_text(source_path),
                encode_text(destination_path),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def set_file_tags(
        self,
        bucket_id: str,
        path: str,
        tags: List[str],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "setFileTags",
            [
                encode_text(bucket_id),
                encode_text(path),
                encode_vec_text(tags),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def add_file_tags(
        self,
        bucket_id: str,
        path: str,
        tags: List[str],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "addFileTags",
            [
                encode_text(bucket_id),
                encode_text(path),
                encode_vec_text(tags),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def remove_file_tags(
        self,
        bucket_id: str,
        path: str,
        tags: List[str],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "removeFileTags",
            [
                encode_text(bucket_id),
                encode_text(path),
                encode_vec_text(tags),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def set_file_metadata(
        self,
        bucket_id: str,
        path: str,
        metadata: str,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "setFileMetadata",
            [
                encode_text(bucket_id),
                encode_text(path),
                encode_text(metadata),
                self._opt_key(api_key),
            ],
            ok_err(file_public()),
        )

    def bulk_delete_files(
        self,
        bucket_id: str,
        paths: List[str],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._update(
            "bulkDeleteFiles",
            [
                encode_text(bucket_id),
                encode_vec_text(paths),
                self._opt_key(api_key),
            ],
            ok_err(Types.Nat),
        )

    def bulk_move_files(
        self,
        bucket_id: str,
        operations: List[FilePathOp],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        ops_candid = [
            {"source": op["source"], "destination": op["destination"]} for op in operations
        ]
        return self._update(
            "bulkMoveFiles",
            [
                encode_text(bucket_id),
                {"type": Types.Vec(file_path_op()), "value": ops_candid},
                self._opt_key(api_key),
            ],
            ok_err(Types.Nat),
        )

    def bulk_copy_files(
        self,
        bucket_id: str,
        operations: List[FilePathOp],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        ops_candid = [
            {"source": op["source"], "destination": op["destination"]} for op in operations
        ]
        return self._update(
            "bulkCopyFiles",
            [
                encode_text(bucket_id),
                {"type": Types.Vec(file_path_op()), "value": ops_candid},
                self._opt_key(api_key),
            ],
            ok_err(Types.Nat),
        )
