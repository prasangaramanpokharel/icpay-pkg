from __future__ import annotations

from typing import Any, Optional


class ErrorCode:
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    BUCKET_NOT_FOUND = "BUCKET_NOT_FOUND"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    INVALID_PATH = "INVALID_PATH"
    INVALID_REQUEST = "INVALID_REQUEST"
    CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED"
    BUCKET_EXPIRED = "BUCKET_EXPIRED"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    CHUNK_FAILED = "CHUNK_FAILED"
    RATE_LIMITED = "RATE_LIMITED"
    NETWORK_ERROR = "NETWORK_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ICBucketError(Exception):
    def __init__(
        self,
        code_or_message: str,
        message_or_code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Any = None,
    ) -> None:
        is_code = (
            (code_or_message.isupper() and "_" in code_or_message)
            or hasattr(ErrorCode, code_or_message)
        )
        if is_code:
            code = code_or_message
            message = message_or_code if message_or_code is not None else code_or_message
        else:
            code = message_or_code if message_or_code is not None else "INTERNAL_ERROR"
            message = code_or_message

        super().__init__(f"[{code}] {message}" if code != "INTERNAL_ERROR" else message)
        self.code = code
        self.message = message
        self.status = status
        self.request_id = request_id
        self.details = details

    @classmethod
    def from_error(cls, err: Any, code: str = "INTERNAL_ERROR") -> "ICBucketError":
        if isinstance(err, ICBucketError):
            return err
        msg = str(err)
        return cls(code=code, message=msg)


def unwrap_result(res: Any, default_code: str = "INTERNAL_ERROR") -> Any:
    if isinstance(res, dict) and "err" in res:
        raise ICBucketError(default_code, res["err"])
    if isinstance(res, dict) and "ok" in res:
        return res["ok"]
    return res
