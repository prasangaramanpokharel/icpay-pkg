from __future__ import annotations

from typing import Any

from ic.candid import Types


def file_public() -> Any:
    return Types.Record(
        {
            "id": Types.Text,
            "path": Types.Text,
            "name": Types.Text,
            "size": Types.Nat,
            "contentType": Types.Text,
            "createdAt": Types.Int,
            "updatedAt": Types.Opt(Types.Int),
            "metadata": Types.Opt(Types.Text),
            "tags": Types.Vec(Types.Text),
            "publicUrl": Types.Opt(Types.Text),
        }
    )


def file_list_page() -> Any:
    return Types.Record(
        {
            "items": Types.Vec(file_public()),
            "total": Types.Nat,
            "page": Types.Nat,
            "pageSize": Types.Nat,
        }
    )


def bucket_visibility() -> Any:
    return Types.Variant({"Public": Types.Null, "Private": Types.Null})


def api_key_permissions() -> Any:
    return Types.Record({"read": Types.Bool, "write": Types.Bool, "delete": Types.Bool})


def file_path_op() -> Any:
    return Types.Record({"source": Types.Text, "destination": Types.Text})


def ok_err(ok_type: Any) -> Any:
    return Types.Variant({"ok": ok_type, "err": Types.Text})


def opt_text(value: str | None) -> list[str]:
    return [value] if value else []


def encode_text(value: str) -> dict[str, Any]:
    return {"type": Types.Text, "value": value}


def encode_nat(value: int) -> dict[str, Any]:
    return {"type": Types.Nat, "value": value}


def encode_blob(data: bytes) -> dict[str, Any]:
    return {"type": Types.Vec(Types.Nat8), "value": list(data)}


def encode_opt_text(value: str | None) -> dict[str, Any]:
    return {"type": Types.Opt(Types.Text), "value": opt_text(value)}


def encode_vec_text(values: list[str]) -> dict[str, Any]:
    return {"type": Types.Vec(Types.Text), "value": values}
