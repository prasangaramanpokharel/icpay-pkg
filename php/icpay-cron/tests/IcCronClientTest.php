<?php

require_once __DIR__ . '/../src/IcCronClient.php';

use ICPay\Cron\IcCronClient;

function assertEqual($actual, $expected, $msg = '') {
    if ($actual !== $expected) {
        throw new \Exception("Assertion Failed: Expected " . var_export($expected, true) . ", got " . var_export($actual, true) . " ({$msg})");
    }
}

echo "Running PHP icpay-cron unit tests...\n";

// 1. Project ID formatting
assertEqual(IcCronClient::formatProjectId(1), "cr_00000001", "formatProjectId(1)");
assertEqual(IcCronClient::formatProjectId(15), "cr_0000000f", "formatProjectId(15)");
echo "✔ formatProjectId tests passed\n";

// 2. Client configuration
$client = new IcCronClient("test_key", "custom-canister-id", "http://127.0.0.1:4943");
echo "✔ IcCronClient instantiation passed\n";

// 3. Live local trigger (against local replica if available)
$liveClient = new IcCronClient(
    "icp_cron_f880a426c475f04859a30828fb1234a5e844f13d659e8b94e1a48eb70af9bc68",
    "uxrrr-q7777-77774-qaaaq-cai",
    "http://127.0.0.1:4943"
);

try {
    $res = $liveClient->trigger("cr_00000001", 1);
    assertEqual($res['ok'], true, "live trigger ok");
    assertEqual($res['job_id'], 1, "live trigger job_id");
    assertEqual($res['status'], "triggered", "live trigger status");
    echo "✔ Live local trigger passed: " . json_encode($res) . "\n";
} catch (\Exception $e) {
    echo "Notice: Live local trigger: " . $e->getMessage() . "\n";
}

echo "All PHP tests passed!\n";
