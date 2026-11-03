<?php

declare(strict_types=1);

namespace ICPay\Bucket\Error;

use Exception;

class ICBucketException extends Exception
{
    public function __construct(
        public readonly ErrorCode $errorCode,
        string $message,
        public readonly ?int $httpStatus = null,
        public readonly ?string $requestId = null,
    ) {
        parent::__construct(sprintf("[%s] %s", $errorCode->value, $message));
    }
}
