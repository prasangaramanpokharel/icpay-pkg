export class IcCronError extends Error {
  public statusCode?: number
  public code: string
  public details?: unknown

  constructor(message: string, code: string = "ICCRON_ERROR", statusCode?: number, details?: unknown) {
    super(message)
    this.name = "IcCronError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, IcCronError.prototype)
  }
}

export class AuthenticationError extends IcCronError {
  constructor(message: string = "Invalid or missing API key", details?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, details)
    this.name = "AuthenticationError"
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

export class JobNotFoundError extends IcCronError {
  constructor(jobId: number | bigint, details?: unknown) {
    super(`Job ${jobId} not found`, "JOB_NOT_FOUND", 404, details)
    this.name = "JobNotFoundError"
    Object.setPrototypeOf(this, JobNotFoundError.prototype)
  }
}

export class ProjectNotFoundError extends IcCronError {
  constructor(projectId: string | number | bigint, details?: unknown) {
    super(`Project ${projectId} not found`, "PROJECT_NOT_FOUND", 404, details)
    this.name = "ProjectNotFoundError"
    Object.setPrototypeOf(this, ProjectNotFoundError.prototype)
  }
}

export class ValidationError extends IcCronError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}
