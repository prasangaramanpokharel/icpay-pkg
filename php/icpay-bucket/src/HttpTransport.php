<?php

declare(strict_types=1);

namespace ICPay\Bucket;

use ICPay\Bucket\Error\ErrorCode;
use ICPay\Bucket\Error\ICBucketException;

final class HttpTransport
{
    public function __construct(private readonly Config $config)
    {
    }

    public function send(string $method, string $path, array $headers = [], ?string $body = null): ?array
    {
        $url = rtrim($this->config->endpoint, "/") . "/" . ltrim($path, "/");

        $defaultHeaders = [
            "Authorization: Bearer " . $this->config->apiKey,
            "Accept: application/json",
        ];

        $allHeaders = $defaultHeaders;
        foreach ($headers as $key => $value) {
            $allHeaders[] = $key . ": " . $value;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
        curl_setopt($ch, CURLOPT_TIMEOUT, (int)$this->config->timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HEADER, true);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $rawResponse = curl_exec($ch);

        if ($rawResponse === false) {
            $curlError = curl_error($ch);
            curl_close($ch);
            throw new ICBucketException(
                ErrorCode::NETWORK_ERROR,
                "HTTP request failed: " . $curlError
            );
        }

        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $headerStr = substr($rawResponse, 0, $headerSize);
        $bodyStr = substr($rawResponse, $headerSize);

        $requestId = null;
        if (preg_match('/x-request-id:\s*([^\r\n]+)/i', $headerStr, $matches)) {
            $requestId = trim($matches[1]);
        }

        if ($httpCode >= 400) {
            $errData = json_decode($bodyStr, true);
            $errMessage = is_array($errData) && isset($errData["message"])
                ? (string)$errData["message"]
                : ($bodyStr !== "" ? $bodyStr : "HTTP " . $httpCode);

            $code = match ($httpCode) {
                401 => ErrorCode::AUTHENTICATION_FAILED,
                403 => ErrorCode::PERMISSION_DENIED,
                404 => ErrorCode::FILE_NOT_FOUND,
                413 => ErrorCode::CAPACITY_EXCEEDED,
                429 => ErrorCode::RATE_LIMITED,
                default => ErrorCode::INTERNAL_ERROR,
            };

            throw new ICBucketException($code, $errMessage, $httpCode, $requestId);
        }

        if ($httpCode === 204 || $bodyStr === "" || $bodyStr === false) {
            return null;
        }

        $decoded = json_decode($bodyStr, true);
        if (!is_array($decoded)) {
            return null;
        }

        return $decoded;
    }
}
