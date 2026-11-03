# icpay-bucket

Python client for [ICPay Bucket](https://icpay.app) — on-chain encrypted file storage on the Internet Computer.

**Canister:** `6vbhm-nqaaa-aaaan-q6muq-cai` · **Version:** 1.2.1

**Docs:** [Package guide](https://icpay.app/icpay-bucket-sdk) · [API reference](https://icpay.app/bucket/docs)

---

## Installation

```bash
pip install icpay-bucket
```

---

## Quick Start

```python
import os
from icpay_bucket import BucketClient, unwrap_result

with BucketClient(api_key=os.environ["BUCKET_API_KEY"], bucket_id="icp") as client:
    file_id = unwrap_result(client.files.upload(
        path="/documents/report.pdf",
        data=b"%PDF-1.4 ...",
        content_type="application/pdf",
    ))
    print(f"Uploaded: {file_id}")

    print(client.files.url("/documents/report.pdf"))

    exists = unwrap_result(client.files.exists("/documents/report.pdf"))
    file_meta = unwrap_result(client.files.get("/documents/report.pdf"))

    page = unwrap_result(client.files.list(page=0, page_size=20))

    unwrap_result(client.files.delete("/documents/report.pdf"))
```

---

## Error Handling

```python
res = client.files.get("/data.json")
if "err" in res:
    print("Error:", res["err"])
else:
    print("File:", res["ok"])
```

```python
from icpay_bucket import unwrap_result, ICBucketError

try:
    file = unwrap_result(client.files.get("/data.json"))
except ICBucketError as err:
    print(f"[{err.code}] {err.message}")
```

---

## Authentication Scopes

| Caller | Access |
|---|---|
| **Bucket owner** (Internet Identity) | All methods, bucket management, renewal, API keys |
| **Read API key** | `list`, `download`, `get`, `exists`, `list_folder`, `search` |
| **Write API key** | `upload`, `update`, `move`, `copy`, tags, metadata, chunked upload |
| **Delete API key** | `delete`, `bulk_delete_files` |

---

## API Reference

### Modern Sub-Resource (`client.files.*`)

| Method | Description |
|---|---|
| `client.files.upload(path, data, content_type?, bucket_id?, ...)` | Uploads bytes (auto-chunks if payload > 1.85 MB) |
| `client.files.get(path, bucket_id?, api_key?)` | Get file metadata record |
| `client.files.list(page?, page_size?, prefix?, search_query?)` | List, search, or filter files |
| `client.files.exists(path, bucket_id?, api_key?)` | Check if a path exists |
| `client.files.download(path, bucket_id?, api_key?)` | Download raw file bytes |
| `client.files.delete(path, bucket_id?, api_key?)` | Delete single file |
| `client.files.copy(source, dest, bucket_id?, api_key?)` | Copy file to new destination |
| `client.files.move(source, dest, bucket_id?, api_key?)` | Move/rename file |
| `client.files.url(path, bucket_id?, gateway="cdn")` | Edge CDN / Raw URL generator |
| `client.usage(bucket_id?)` | Bucket storage and file count statistics |

### Direct Methods (Full Canister API)

| Method | Description |
|---|---|
| `get_bucket_price(capacity_gb)` | Price quote for storage tier |
| `create_bucket(name, capacity_gb, visibility)` | Create new canister bucket |
| `get_bucket(bucket_id?)` | Bucket details |
| `get_bucket_stats(bucket_id?)` | Detailed usage metrics |
| `list_buckets()` | List buckets owned by caller |
| `get_bucket_cycle_status()` | Canister cycle health (public) |
| `bulk_delete_files(bucket_id, paths, api_key?)` | Batch delete paths |
| `bulk_move_files(bucket_id, operations, api_key?)` | Batch move `[{"source": ..., "destination": ...}]` |
| `bulk_copy_files(bucket_id, operations, api_key?)` | Batch copy `[{"source": ..., "destination": ...}]` |

---

## License

MIT
