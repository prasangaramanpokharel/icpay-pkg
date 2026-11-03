export type ApiResult<T> = { ok: T } | { err: string }

export type BucketVisibility = { Public: null } | { Private: null }
export type BucketStatus = { ACTIVE: null } | { EXPIRED: null }

export type BucketPublic = {
  id: string
  name: string
  capacity: bigint
  storageUsed: bigint
  visibility: BucketVisibility
  status: BucketStatus
  expiresAt: bigint
  createdAt: bigint
}

export type BucketStats = {
  id: string
  name: string
  capacity: bigint
  storageUsed: bigint
  usagePercent: bigint
  fileCount: bigint
  visibility: BucketVisibility
  status: BucketStatus
  expiresAt: bigint
  daysRemaining: bigint
  isExpiringSoon: boolean
  renewPriceE8s: bigint
  periodDays: bigint
  publicBaseUrl: [] | [string]
}

export type BucketRenewQuote = {
  bucketId: string
  priceE8s: bigint
  currentExpiresAt: bigint
  newExpiresAt: bigint
  status: BucketStatus
}

export type BucketRenewResult = {
  bucketId: string
  priceE8s: bigint
  expiresAt: bigint
  status: BucketStatus
}

export type FilePublic = {
  id: string
  path: string
  name: string
  size: bigint
  contentType: string
  createdAt: bigint
  updatedAt: [] | [bigint]
  metadata: [] | [string]
  tags: string[]
  publicUrl: [] | [string]
}

export type FileListPage = {
  items: FilePublic[]
  total: bigint
  page: bigint
  pageSize: bigint
}

export type FilePathOp = { source: string; destination: string }

export type UploadStatus = {
  uploadId: string
  bucketId: string
  path: string
  totalSize: bigint
  uploadedSize: bigint
  chunkSize: bigint
  status: string
  createdAt: bigint
}

export type ApiKeyPermissions = { read: boolean; write: boolean; delete: boolean }

export type ApiKeyPublic = {
  id: string
  bucketId: string
  name: string
  keyHint: string
  permissions: ApiKeyPermissions
  createdAt: bigint
  revoked: boolean
}

export type ApiKeyCreateResult = {
  id: string
  secret: string
  name: string
  bucketId: string
  permissions: ApiKeyPermissions
  createdAt: bigint
}

export type BucketCycleStatus = {
  balance: bigint
  status: string
  canAcceptNewBuckets: boolean
  estimatedDaysRemaining: bigint
  dailyBurn: bigint
}

export type UploadPayload = {
  bucketId?: string
  path: string
  data: Uint8Array
  contentType?: string
  apiKey?: string
  autoChunk?: boolean
  chunkSize?: number
}

export type ListFilesOptions = {
  bucketId?: string
  page?: number
  pageSize?: number
  apiKey?: string
  prefix?: string
  searchQuery?: string
}

export type BucketUsage = {
  id: string
  usedBytes: bigint
  capacityBytes: bigint
  fileCount: bigint
  usagePercent: bigint
}

export const SINGLE_MAX_BYTES = 1_850_000
