export type RetryOptions = {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  signal?: AbortSignal
}

export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelayMs = options?.baseDelayMs ?? 300
  const maxDelayMs = options?.maxDelayMs ?? 4000
  const signal = options?.signal

  let attempt = 0
  while (true) {
    if (signal?.aborted) {
      throw new Error(signal.reason ?? "Upload aborted")
    }
    try {
      return await fn(attempt)
    } catch (err) {
      attempt++
      if (attempt > maxRetries || signal?.aborted) {
        throw err
      }
      const rawDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      const jitterDelay = rawDelay * (0.5 + Math.random() * 0.5)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (signal) {
            signal.removeEventListener("abort", onAbort)
          }
          resolve()
        }, jitterDelay)
        const onAbort = () => {
          clearTimeout(timer)
          reject(new Error(signal?.reason ?? "Upload aborted"))
        }
        if (signal) {
          signal.addEventListener("abort", onAbort, { once: true })
        }
      })
    }
  }
}
