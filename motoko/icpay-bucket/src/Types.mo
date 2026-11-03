module {
  public type BucketVisibility = {
    #Public;
    #Private;
  };

  public type BucketStatus = {
    #ACTIVE;
    #EXPIRED;
  };

  public type BucketPublic = {
    id : Text;
    name : Text;
    capacity : Nat;
    storageUsed : Nat;
    visibility : BucketVisibility;
    status : BucketStatus;
    expiresAt : Int;
    createdAt : Int;
  };

  public type BucketStats = {
    id : Text;
    name : Text;
    capacity : Nat;
    storageUsed : Nat;
    usagePercent : Nat;
    fileCount : Nat;
    visibility : BucketVisibility;
    status : BucketStatus;
    expiresAt : Int;
    daysRemaining : Nat;
    isExpiringSoon : Bool;
    renewPriceE8s : Nat;
    periodDays : Nat;
    publicBaseUrl : ?Text;
  };

  public type BucketRenewQuote = {
    bucketId : Text;
    priceE8s : Nat;
    currentExpiresAt : Int;
    newExpiresAt : Int;
    status : BucketStatus;
  };

  public type BucketRenewResult = {
    bucketId : Text;
    priceE8s : Nat;
    expiresAt : Int;
    status : BucketStatus;
  };

  public type FilePublic = {
    id : Text;
    path : Text;
    name : Text;
    size : Nat;
    contentType : Text;
    createdAt : Int;
    updatedAt : ?Int;
    metadata : ?Text;
    tags : [Text];
    publicUrl : ?Text;
  };

  public type FileListPage = {
    items : [FilePublic];
    total : Nat;
    page : Nat;
    pageSize : Nat;
  };

  public type FilePathOp = {
    source : Text;
    destination : Text;
  };

  public type UploadStatus = {
    uploadId : Text;
    bucketId : Text;
    path : Text;
    totalSize : Nat;
    uploadedSize : Nat;
    chunkSize : Nat;
    status : Text;
    createdAt : Int;
  };

  public type ApiKeyPermissions = {
    read : Bool;
    write : Bool;
    delete : Bool;
  };

  public type ApiKeyPublic = {
    id : Text;
    bucketId : Text;
    name : Text;
    keyHint : Text;
    permissions : ApiKeyPermissions;
    createdAt : Int;
    revoked : Bool;
  };

  public type ApiKeyCreateResult = {
    id : Text;
    secret : Text;
    name : Text;
    bucketId : Text;
    permissions : ApiKeyPermissions;
    createdAt : Int;
  };

  public type BucketCycleStatus = {
    balance : Nat;
    status : Text;
    canAcceptNewBuckets : Bool;
    estimatedDaysRemaining : Nat;
    dailyBurn : Nat;
  };

  public type ApiResult<T> = {
    #ok : T;
    #err : Text;
  };
};
