package app.icpay.bucket.error;

public class ICBucketException extends RuntimeException {
    private final ErrorCode code;
    private final int statusCode;

    public ICBucketException(ErrorCode code, String message) {
        super(message);
        this.code = code;
        this.statusCode = 0;
    }

    public ICBucketException(ErrorCode code, String message, int statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }

    public ICBucketException(ErrorCode code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.statusCode = 0;
    }

    public ErrorCode getCode() {
        return code;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
