# icpay-bucket (PHP)

PHP client for [ICPay Bucket](https://icpay.app) on-chain storage.

**Version:** 1.0.0 · **PHP:** >= 8.1

---

## Installation

```bash
composer require icpay/icpay-bucket
```

---

## Quick Start

```php
use ICPay\Bucket\Client;
use ICPay\Bucket\Error\ICBucketException;

$bucket = new Client(
    apiKey: getenv("ICBUCKET_API_KEY"),
    bucketId: "icp"
);

try {
    $file = $bucket->files->upload(
        path: "documents/report.pdf",
        data: file_get_contents(__DIR__ . "/report.pdf"),
        contentType: "application/pdf"
    );

    echo $bucket->files->url("documents/report.pdf") . PHP_EOL;

    $list = $bucket->files->list(limit: 20);

    $usage = $bucket->usage();

    $bucket->files->delete("documents/report.pdf");
} catch (ICBucketException $e) {
    echo $e->getMessage() . PHP_EOL;
}
```

---

## License

MIT
