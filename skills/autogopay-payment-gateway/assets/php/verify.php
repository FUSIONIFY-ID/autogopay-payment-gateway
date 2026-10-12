<?php
/** Reusable signature helper only, not a complete payment/fulfillment route. */
function verifyAutoGoPaySignature(string $rawBody, string $signature, string $apiKey): bool
{
    if ($apiKey === '' || preg_match('/\A[0-9a-fA-F]{64}\z/', $signature) !== 1) {
        return false;
    }
    return hash_equals(hash_hmac('sha256', $rawBody, $apiKey), strtolower($signature));
}
// Read raw bytes using file_get_contents('php://input'). Verify before json_decode.
// Obtain the key from secure server configuration, not hardcoded source.
