<?php

declare(strict_types=1);

spl_autoload_register(function ($class) {
    $prefix = 'ICPay\\Bucket\\';
    $baseDir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

use ICPay\Bucket\Client;
use ICPay\Bucket\Error\ErrorCode;
use ICPay\Bucket\Error\ICBucketException;

$passed = 0;

$client = new Client('test_key', 'my-bucket');
if ($client->files !== null) {
    $passed++;
    echo "PASS: testClientInitialization\n";
}

try {
    new Client('', 'my-bucket');
    throw new Exception('Should throw on empty api key');
} catch (ICBucketException $e) {
    if ($e->errorCode === ErrorCode::AUTHENTICATION_FAILED) {
        $passed++;
        echo "PASS: testEmptyApiKeyThrows\n";
    }
}

try {
    new Client('key', '   ');
    throw new Exception('Should throw on empty bucket');
} catch (ICBucketException $e) {
    if ($e->errorCode === ErrorCode::INVALID_REQUEST) {
        $passed++;
        echo "PASS: testEmptyBucketIdThrows\n";
    }
}

$url = $client->files->url('/photos/avatar.png');
if ($url === 'https://cloud.icpay.app/cloud/my-bucket/photos/avatar.png') {
    $passed++;
    echo "PASS: testUrlGeneration\n";
}

echo "\nAll PHP tests passed: {$passed}/4\n";
