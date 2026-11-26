import type { UploadProgress } from "./types.js"

export class ProgressTracker {
  readonly totalBytes: number
  readonly totalChunks: number
  private uploadedBytes = 0
  private completedChunks = 0
  private startTime = Date.now()
  private samples: { time: number; bytes: number }[] = []
  private readonly onProgress?: (progress: UploadProgress) => void

  constructor(
    totalBytes: number,
    totalChunks: number,
    onProgress?: (progress: UploadProgress) => void
  ) {
    this.totalBytes = totalBytes
    this.totalChunks = totalChunks
    this.onProgress = onProgress
    this.samples.push({ time: this.startTime, bytes: 0 })
  }

  recordChunk(size: number): UploadProgress {
    this.uploadedBytes = Math.min(this.totalBytes, this.uploadedBytes + size)
    this.completedChunks++
    return this.emit()
  }

  emit(): UploadProgress {
    const now = Date.now()
    this.samples.push({ time: now, bytes: this.uploadedBytes })
    if (this.samples.length > 10) {
      this.samples.shift()
    }

    let speed = 0
    if (this.samples.length >= 2) {
      const oldest = this.samples[0]
      if (oldest) {
        const durationSeconds = (now - oldest.time) / 1000
        const bytesDelta = this.uploadedBytes - oldest.bytes
        if (durationSeconds > 0) {
          speed = Math.max(0, Math.round(bytesDelta / durationSeconds))
        }
      }
    }

    const remainingBytes = Math.max(0, this.totalBytes - this.uploadedBytes)
    const etaSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : 0
    const percentage =
      this.totalBytes > 0
        ? Math.min(100, Math.round((this.uploadedBytes / this.totalBytes) * 10000) / 100)
        : 100

    const progress: UploadProgress = {
      loaded: this.uploadedBytes,
      total: this.totalBytes,
      bytesUploaded: this.uploadedBytes,
      totalBytes: this.totalBytes,
      percentage,
      speed,
      etaSeconds,
      chunksCompleted: this.completedChunks,
      totalChunks: this.totalChunks,
    }

    if (this.onProgress) {
      try {
        this.onProgress(progress)
      } catch {
      }
    }

    return progress
  }
}
