import type { ApiResult } from "./types.js"

export type ICBucketErrorCode =
  | "AUTHENTICATION_FAILED"
  | "PERMISSION_DENIED"
  | "BUCKET_NOT_FOUND"
  | "FILE_NOT_FOUND"
  | "INVALID_PATH"
  | "INVALID_REQUEST"
  | "CAPACITY_EXCEEDED"
  | "BUCKET_EXPIRED"
  | "UPLOAD_FAILED"
  | "CHUNK_FAILED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR"

export class ICBucketError extends Error {
  readonly code: ICBucketErrorCode | string
  readonly status?: number
  readonly requestId?: string
  readonly details?: unknown

  constructor(
    codeOrMessage: ICBucketErrorCode | string,
    messageOrCode?: string,
    status?: number,
    requestId?: string,
    details?: unknown
  ) {
    const isCodeFirst = /^[A-Z_]+$/.test(codeOrMessage)
    const code = isCodeFirst ? codeOrMessage : (messageOrCode ?? "INTERNAL_ERROR")
    const message = isCodeFirst ? (messageOrCode ?? codeOrMessage) : codeOrMessage

    super(message)
    this.name = "ICBucketError"
    this.code = code
    this.status = status
    this.requestId = requestId
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }

  static fromError(err: unknown, code: ICBucketErrorCode = "INTERNAL_ERROR"): ICBucketError {
    if (err instanceof ICBucketError) {
      return err
    }
    const msg = err instanceof Error ? err.message : String(err)
    return new ICBucketError(code, msg)
  }
}

export function unwrapResult<T>(result: ApiResult<T>, defaultCode: ICBucketErrorCode = "INTERNAL_ERROR"): T {
  if ("err" in result) {
    throw new ICBucketError(defaultCode, result.err)
  }
  return result.ok
}
