# icpay-bucket (Motoko)

Motoko inter-canister client library for [ICPay Bucket](https://icpay.app) on-chain storage.

**Canister:** `6vbhm-nqaaa-aaaan-q6muq-cai` · **Version:** 1.0.0

---

## Installation

```bash
mops add icpay-bucket
```

---

## Quick Start

```motoko
import Principal "mo:base/Principal";
import ICBucket "mo:icpay-bucket";

actor {
  let bucketClient = ICBucket.Client(
    Principal.fromText("6vbhm-nqaaa-aaaan-q6muq-cai"),
    ?"icp",
    ?"icp_cloud_..."
  );

  public func storeFile(path : Text, content : [Nat8]) : async Text {
    let result = await bucketClient.upload(path, content, "text/plain", null, null);
    switch (result) {
      case (#ok(fileId)) fileId;
      case (#err(msg)) Debug.trap(msg);
    };
  };

  public func readFile(path : Text) : async [Nat8] {
    let result = await bucketClient.download(path, null, null);
    switch (result) {
      case (#ok(bytes)) bytes;
      case (#err(msg)) Debug.trap(msg);
    };
  };

  public func getCdnUrl(path : Text) : Text {
    bucketClient.url("icp", path);
  };
};
```

---

## License

MIT
