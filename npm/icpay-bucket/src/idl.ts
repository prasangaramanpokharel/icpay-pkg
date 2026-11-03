import type { IDL } from "@icp-sdk/core/candid"
import type {
  ApiKeyCreateResult,
  ApiKeyPermissions,
  ApiKeyPublic,
  ApiResult,
  BucketCycleStatus,
  BucketPublic,
  BucketRenewQuote,
  BucketRenewResult,
  BucketStats,
  BucketVisibility,
  FileListPage,
  FilePathOp,
  FilePublic,
  UploadStatus,
} from "./types.js"

export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const BucketVisibility = IDL.Variant({ Public: IDL.Null, Private: IDL.Null })
  const BucketStatus = IDL.Variant({ ACTIVE: IDL.Null, EXPIRED: IDL.Null })

  const BucketPublic = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    capacity: IDL.Nat,
    storageUsed: IDL.Nat,
    visibility: BucketVisibility,
    status: BucketStatus,
    expiresAt: IDL.Int,
    createdAt: IDL.Int,
  })

  const BucketStats = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    capacity: IDL.Nat,
    storageUsed: IDL.Nat,
    usagePercent: IDL.Nat,
    fileCount: IDL.Nat,
    visibility: BucketVisibility,
    status: BucketStatus,
    expiresAt: IDL.Int,
    daysRemaining: IDL.Nat,
    isExpiringSoon: IDL.Bool,
    renewPriceE8s: IDL.Nat,
    periodDays: IDL.Nat,
    publicBaseUrl: IDL.Opt(IDL.Text),
  })

  const BucketRenewQuote = IDL.Record({
    bucketId: IDL.Text,
    priceE8s: IDL.Nat,
    currentExpiresAt: IDL.Int,
    newExpiresAt: IDL.Int,
    status: BucketStatus,
  })

  const BucketRenewResult = IDL.Record({
    bucketId: IDL.Text,
    priceE8s: IDL.Nat,
    expiresAt: IDL.Int,
    status: BucketStatus,
  })

  const FilePublic = IDL.Record({
    id: IDL.Text,
    path: IDL.Text,
    name: IDL.Text,
    size: IDL.Nat,
    contentType: IDL.Text,
    createdAt: IDL.Int,
    updatedAt: IDL.Opt(IDL.Int),
    metadata: IDL.Opt(IDL.Text),
    tags: IDL.Vec(IDL.Text),
    publicUrl: IDL.Opt(IDL.Text),
  })

  const FilePathOp = IDL.Record({ source: IDL.Text, destination: IDL.Text })

  const UploadStatus = IDL.Record({
    uploadId: IDL.Text,
    bucketId: IDL.Text,
    path: IDL.Text,
    totalSize: IDL.Nat,
    uploadedSize: IDL.Nat,
    chunkSize: IDL.Nat,
    status: IDL.Text,
    createdAt: IDL.Int,
  })

  const ApiKeyPermissions = IDL.Record({
    read: IDL.Bool,
    write: IDL.Bool,
    delete: IDL.Bool,
  })

  const ApiKeyPublic = IDL.Record({
    id: IDL.Text,
    bucketId: IDL.Text,
    name: IDL.Text,
    keyHint: IDL.Text,
    permissions: ApiKeyPermissions,
    createdAt: IDL.Int,
    revoked: IDL.Bool,
  })

  const ApiKeyCreateResult = IDL.Record({
    id: IDL.Text,
    secret: IDL.Text,
    name: IDL.Text,
    bucketId: IDL.Text,
    permissions: ApiKeyPermissions,
    createdAt: IDL.Int,
  })

  const FileListPage = IDL.Record({
    items: IDL.Vec(FilePublic),
    total: IDL.Nat,
    page: IDL.Nat,
    pageSize: IDL.Nat,
  })

  const okErr = <T extends IDL.Type>(ok: T) => IDL.Variant({ ok, err: IDL.Text })

  return IDL.Service({
    getBucketPrice: IDL.Func([IDL.Nat], [okErr(IDL.Nat)], ["query"]),
    createBucket: IDL.Func([IDL.Text, IDL.Nat, BucketVisibility], [okErr(IDL.Text)], []),
    getBucket: IDL.Func([IDL.Text], [okErr(BucketPublic)], ["query"]),
    getBucketStats: IDL.Func([IDL.Text], [okErr(BucketStats)], ["query"]),
    getRenewQuote: IDL.Func([IDL.Text], [okErr(BucketRenewQuote)], ["query"]),
    listBuckets: IDL.Func([], [okErr(IDL.Vec(BucketPublic))], ["query"]),
    renewBucket: IDL.Func([IDL.Text], [okErr(BucketRenewResult)], []),
    updateBucket: IDL.Func(
      [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(BucketVisibility)],
      [okErr(BucketPublic)],
      []
    ),
    deleteBucket: IDL.Func([IDL.Text], [okErr(IDL.Null)], []),
    getBucketCycleStatus: IDL.Func([], [okErr(IDL.Record({
      balance: IDL.Nat,
      status: IDL.Text,
      canAcceptNewBuckets: IDL.Bool,
      estimatedDaysRemaining: IDL.Nat,
      dailyBurn: IDL.Nat,
    }))], ["query"]),
    uploadFile: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(IDL.Text)],
      []
    ),
    beginFileUpload: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Nat, IDL.Opt(IDL.Text)],
      [okErr(IDL.Text)],
      []
    ),
    uploadFileChunk: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [okErr(IDL.Nat)], []),
    uploadFileChunkIndexed: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Vec(IDL.Nat8)],
      [okErr(IDL.Nat)],
      []
    ),
    completeFileUpload: IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [okErr(IDL.Text)], []),
    getUpload: IDL.Func([IDL.Text], [okErr(UploadStatus)], ["query"]),
    cancelUpload: IDL.Func([IDL.Text], [okErr(IDL.Null)], []),
    downloadFile: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(IDL.Vec(IDL.Nat8))],
      []
    ),
    getPublicFileUrl: IDL.Func([IDL.Text, IDL.Text], [okErr(IDL.Text)], ["query"]),
    deleteFile: IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [okErr(IDL.Null)], []),
    listFiles: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Nat, IDL.Opt(IDL.Text)],
      [okErr(FileListPage)],
      ["query"]
    ),
    getFile: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      ["query"]
    ),
    fileExists: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(IDL.Bool)],
      ["query"]
    ),
    updateFile: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    moveFile: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    copyFile: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    listFolder: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Nat, IDL.Nat, IDL.Opt(IDL.Text)],
      [okErr(FileListPage)],
      ["query"]
    ),
    searchFiles: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Nat, IDL.Nat, IDL.Opt(IDL.Text)],
      [okErr(FileListPage)],
      ["query"]
    ),
    setFileTags: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Vec(IDL.Text), IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    addFileTags: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Vec(IDL.Text), IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    removeFileTags: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Vec(IDL.Text), IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    getFileMetadata: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(IDL.Text)],
      ["query"]
    ),
    setFileMetadata: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [okErr(FilePublic)],
      []
    ),
    bulkDeleteFiles: IDL.Func(
      [IDL.Text, IDL.Vec(IDL.Text), IDL.Opt(IDL.Text)],
      [okErr(IDL.Nat)],
      []
    ),
    bulkMoveFiles: IDL.Func(
      [IDL.Text, IDL.Vec(FilePathOp), IDL.Opt(IDL.Text)],
      [okErr(IDL.Nat)],
      []
    ),
    bulkCopyFiles: IDL.Func(
      [IDL.Text, IDL.Vec(FilePathOp), IDL.Opt(IDL.Text)],
      [okErr(IDL.Nat)],
      []
    ),
    createApiKey: IDL.Func(
      [IDL.Text, IDL.Text, ApiKeyPermissions],
      [okErr(ApiKeyCreateResult)],
      []
    ),
    listApiKeys: IDL.Func([IDL.Text], [okErr(IDL.Vec(ApiKeyPublic))], ["query"]),
    getApiKey: IDL.Func([IDL.Text, IDL.Text], [okErr(ApiKeyPublic)], ["query"]),
    updateApiKey: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(ApiKeyPermissions)],
      [okErr(ApiKeyPublic)],
      []
    ),
    regenerateApiKey: IDL.Func([IDL.Text, IDL.Text], [okErr(ApiKeyCreateResult)], []),
    revokeApiKey: IDL.Func([IDL.Text, IDL.Text], [okErr(IDL.Null)], []),
  })
}

export interface BucketActor {
  getBucketPrice(capacityGB: bigint): Promise<ApiResult<bigint>>
  createBucket(name: string, capacityGB: bigint, visibility: BucketVisibility): Promise<ApiResult<string>>
  getBucket(id: string): Promise<ApiResult<BucketPublic>>
  getBucketStats(id: string): Promise<ApiResult<BucketStats>>
  getRenewQuote(bucketId: string): Promise<ApiResult<BucketRenewQuote>>
  listBuckets(): Promise<ApiResult<BucketPublic[]>>
  renewBucket(bucketId: string): Promise<ApiResult<BucketRenewResult>>
  updateBucket(
    bucketId: string,
    name: [] | [string],
    visibility: [] | [BucketVisibility]
  ): Promise<ApiResult<BucketPublic>>
  deleteBucket(bucketId: string): Promise<ApiResult<null>>
  getBucketCycleStatus(): Promise<ApiResult<BucketCycleStatus>>
  uploadFile(
    bucketId: string,
    path: string,
    data: Uint8Array,
    contentType: string,
    apiKey: [] | [string]
  ): Promise<ApiResult<string>>
  beginFileUpload(
    bucketId: string,
    path: string,
    contentType: string,
    totalSize: bigint,
    apiKey: [] | [string]
  ): Promise<ApiResult<string>>
  uploadFileChunk(uploadId: string, data: Uint8Array): Promise<ApiResult<bigint>>
  uploadFileChunkIndexed(
    uploadId: string,
    chunkIndex: bigint,
    data: Uint8Array
  ): Promise<ApiResult<bigint>>
  completeFileUpload(uploadId: string, apiKey: [] | [string]): Promise<ApiResult<string>>
  getUpload(uploadId: string): Promise<ApiResult<UploadStatus>>
  cancelUpload(uploadId: string): Promise<ApiResult<null>>
  downloadFile(bucketId: string, path: string, apiKey: [] | [string]): Promise<ApiResult<Uint8Array>>
  getPublicFileUrl(bucketId: string, path: string): Promise<ApiResult<string>>
  deleteFile(bucketId: string, path: string, apiKey: [] | [string]): Promise<ApiResult<null>>
  listFiles(
    bucketId: string,
    page: bigint,
    pageSize: bigint,
    apiKey: [] | [string]
  ): Promise<ApiResult<FileListPage>>
  getFile(bucketId: string, path: string, apiKey: [] | [string]): Promise<ApiResult<FilePublic>>
  fileExists(bucketId: string, path: string, apiKey: [] | [string]): Promise<ApiResult<boolean>>
  updateFile(
    bucketId: string,
    path: string,
    name: [] | [string],
    contentType: [] | [string],
    metadata: [] | [string],
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  moveFile(
    bucketId: string,
    sourcePath: string,
    destinationPath: string,
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  copyFile(
    bucketId: string,
    sourcePath: string,
    destinationPath: string,
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  listFolder(
    bucketId: string,
    prefix: string,
    page: bigint,
    pageSize: bigint,
    apiKey: [] | [string]
  ): Promise<ApiResult<FileListPage>>
  searchFiles(
    bucketId: string,
    searchQuery: string,
    page: bigint,
    pageSize: bigint,
    apiKey: [] | [string]
  ): Promise<ApiResult<FileListPage>>
  setFileTags(
    bucketId: string,
    path: string,
    tags: string[],
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  addFileTags(
    bucketId: string,
    path: string,
    tags: string[],
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  removeFileTags(
    bucketId: string,
    path: string,
    tags: string[],
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  getFileMetadata(bucketId: string, path: string, apiKey: [] | [string]): Promise<ApiResult<string>>
  setFileMetadata(
    bucketId: string,
    path: string,
    metadata: string,
    apiKey: [] | [string]
  ): Promise<ApiResult<FilePublic>>
  bulkDeleteFiles(
    bucketId: string,
    paths: string[],
    apiKey: [] | [string]
  ): Promise<ApiResult<bigint>>
  bulkMoveFiles(
    bucketId: string,
    operations: FilePathOp[],
    apiKey: [] | [string]
  ): Promise<ApiResult<bigint>>
  bulkCopyFiles(
    bucketId: string,
    operations: FilePathOp[],
    apiKey: [] | [string]
  ): Promise<ApiResult<bigint>>
  createApiKey(
    bucketId: string,
    name: string,
    permissions: ApiKeyPermissions
  ): Promise<ApiResult<ApiKeyCreateResult>>
  listApiKeys(bucketId: string): Promise<ApiResult<ApiKeyPublic[]>>
  getApiKey(bucketId: string, keyId: string): Promise<ApiResult<ApiKeyPublic>>
  updateApiKey(
    bucketId: string,
    keyId: string,
    name: [] | [string],
    permissions: [] | [ApiKeyPermissions]
  ): Promise<ApiResult<ApiKeyPublic>>
  regenerateApiKey(bucketId: string, keyId: string): Promise<ApiResult<ApiKeyCreateResult>>
  revokeApiKey(bucketId: string, keyId: string): Promise<ApiResult<null>>
}

export type {
  ApiKeyCreateResult,
  ApiKeyPermissions,
  ApiKeyPublic,
  ApiResult,
  BucketCycleStatus,
  BucketPublic,
  BucketRenewQuote,
  BucketRenewResult,
  BucketStats,
  BucketVisibility,
  FileListPage,
  FilePathOp,
  FilePublic,
  UploadStatus,
}
