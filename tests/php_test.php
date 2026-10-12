<?php
require __DIR__ . '/../skills/autogopay-payment-gateway/assets/php/verify.php';
$raw = '{"event":"transaction.received"}';
$key = 'fixture-only-secret';
$sig = hash_hmac('sha256', $raw, $key);
$cases = [
    ['original bytes', verifyAutoGoPaySignature($raw, $sig, $key), true],
    ['uppercase hex', verifyAutoGoPaySignature($raw, strtoupper($sig), $key), true],
    ['changed bytes', verifyAutoGoPaySignature($raw . ' ', $sig, $key), false],
    ['wrong secret', verifyAutoGoPaySignature($raw, $sig, 'other'), false],
    ['missing signature', verifyAutoGoPaySignature($raw, '', $key), false],
    ['invalid hex', verifyAutoGoPaySignature($raw, str_repeat('z', 64), $key), false],
    ['short signature', verifyAutoGoPaySignature($raw, 'aa', $key), false],
    ['missing key', verifyAutoGoPaySignature($raw, $sig, ''), false],
];
foreach ($cases as [$name, $actual, $expected]) {
    if ($actual !== $expected) {
        fwrite(STDERR, "FAIL: $name\n"); exit(1);
    }
}
echo 'PHP signature fixtures PASS (' . count($cases) . ")\n";
