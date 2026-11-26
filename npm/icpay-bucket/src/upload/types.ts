export type UploadProgress = {
  loaded: number
  total: number
  bytesUploaded: number
  totalBytes: number
  percentage: number
  speed: number
  etaSeconds: number
  chunksCompleted: number
  totalChunks: number
}

export type MultipartUploadOptions = {
  bucketId?: string
  path: string
  data: Uint8Array | ArrayBuffer | ArrayBufferView | Blob
  contentType?: string
  apiKey?: string
  concurrency?: number
  chunkSize?: number
  maxRetries?: number
  retryDelayMs?: number
  signal?: AbortSignal
  onProgress?: (progress: UploadProgress) => void
  verifyIntegrity?: boolean
  leavePartsOnError?: boolean
}

export type ChunkDescriptor = {
  index: number
  start: number
  end: number
  size: number
  data: Uint8Array
  sha256?: string
}

export type UploadResult = {
  fileId: string
  url?: string
  totalBytes: number
  chunks: number
}

export type UploadSessionState = {
  uploadId: string
  bucketId: string
  path: string
  totalBytes: number
  chunkSize: number
  totalChunks: number
  completedChunks: Set<number>
  aborted: boolean
}
