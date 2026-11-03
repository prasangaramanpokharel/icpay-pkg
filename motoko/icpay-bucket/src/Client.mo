import Principal "mo:base/Principal";
import Types "./Types";
import Url "./Url";

module {
  public type BucketCanister = actor {
    getBucketPrice : (Nat) -> async Types.ApiResult<Nat>;
    createBucket : (Text, Nat, Types.BucketVisibility) -> async Types.ApiResult<Text>;
    getBucket : (Text) -> async Types.ApiResult<Types.BucketPublic>;
    getBucketStats : (Text) -> async Types.ApiResult<Types.BucketStats>;
    getRenewQuote : (Text) -> async Types.ApiResult<Types.BucketRenewQuote>;
    listBuckets : () -> async Types.ApiResult<[Types.BucketPublic]>;
    renewBucket : (Text) -> async Types.ApiResult<Types.BucketRenewResult>;
    updateBucket : (Text, ?Text, ?Types.BucketVisibility) -> async Types.ApiResult<Types.BucketPublic>;
    deleteBucket : (Text) -> async Types.ApiResult<()>;
    getBucketCycleStatus : () -> async Types.ApiResult<Types.BucketCycleStatus>;
    uploadFile : (Text, Text, [Nat8], Text, ?Text) -> async Types.ApiResult<Text>;
    beginFileUpload : (Text, Text, Text, Nat, ?Text) -> async Types.ApiResult<Text>;
    uploadFileChunk : (Text, [Nat8]) -> async Types.ApiResult<Nat>;
    uploadFileChunkIndexed : (Text, Nat, [Nat8]) -> async Types.ApiResult<Nat>;
    completeFileUpload : (Text, ?Text) -> async Types.ApiResult<Text>;
    getUpload : (Text) -> async Types.ApiResult<Types.UploadStatus>;
    cancelUpload : (Text) -> async Types.ApiResult<()>;
    downloadFile : (Text, Text, ?Text) -> async Types.ApiResult<[Nat8]>;
    getPublicFileUrl : (Text, Text) -> async Types.ApiResult<Text>;
    deleteFile : (Text, Text, ?Text) -> async Types.ApiResult<()>;
    listFiles : (Text, Nat, Nat, ?Text) -> async Types.ApiResult<Types.FileListPage>;
    getFile : (Text, Text, ?Text) -> async Types.ApiResult<Types.FilePublic>;
    fileExists : (Text, Text, ?Text) -> async Types.ApiResult<Bool>;
    updateFile : (Text, Text, ?Text, ?Text, ?Text, ?Text) -> async Types.ApiResult<Types.FilePublic>;
    moveFile : (Text, Text, Text, ?Text) -> async Types.ApiResult<Types.FilePublic>;
    copyFile : (Text, Text, Text, ?Text) -> async Types.ApiResult<Types.FilePublic>;
    setFileTags : (Text, Text, [Text], ?Text) -> async Types.ApiResult<Types.FilePublic>;
    addFileTags : (Text, Text, [Text], ?Text) -> async Types.ApiResult<Types.FilePublic>;
    removeFileTags : (Text, Text, [Text], ?Text) -> async Types.ApiResult<Types.FilePublic>;
    setFileMetadata : (Text, Text, Text, ?Text) -> async Types.ApiResult<Types.FilePublic>;
    getFileMetadata : (Text, Text, ?Text) -> async Types.ApiResult<Text>;
    listFolder : (Text, Text, Nat, Nat, ?Text) -> async Types.ApiResult<Types.FileListPage>;
    searchFiles : (Text, Text, Nat, Nat, ?Text) -> async Types.ApiResult<Types.FileListPage>;
    bulkDeleteFiles : (Text, [Text], ?Text) -> async Types.ApiResult<Nat>;
    bulkMoveFiles : (Text, [Types.FilePathOp], ?Text) -> async Types.ApiResult<Nat>;
    bulkCopyFiles : (Text, [Types.FilePathOp], ?Text) -> async Types.ApiResult<Nat>;
  };

  public class Client(canisterPrincipal : Principal, defaultBucketId : ?Text, defaultApiKey : ?Text) {
    let canister : BucketCanister = actor(Principal.toText(canisterPrincipal));

    func resolveBucket(explicit : ?Text) : Text {
      switch (explicit) {
        case (?b) b;
        case null {
          switch (defaultBucketId) {
            case (?b) b;
            case null "";
          };
        };
      };
    };

    func resolveKey(explicit : ?Text) : ?Text {
      switch (explicit) {
        case (?k) ?k;
        case null defaultApiKey;
      };
    };

    public func upload(path : Text, data : [Nat8], contentType : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<Text> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.uploadFile(b, path, data, contentType, k);
    };

    public func download(path : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<[Nat8]> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.downloadFile(b, path, k);
    };

    public func get(path : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<Types.FilePublic> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.getFile(b, path, k);
    };

    public func exists(path : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<Bool> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.fileExists(b, path, k);
    };

    public func list(page : Nat, pageSize : Nat, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<Types.FileListPage> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.listFiles(b, page, pageSize, k);
    };

    public func delete(path : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<()> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.deleteFile(b, path, k);
    };

    public func copy(sourcePath : Text, destinationPath : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<Types.FilePublic> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.copyFile(b, sourcePath, destinationPath, k);
    };

    public func move(sourcePath : Text, destinationPath : Text, bucketId : ?Text, apiKey : ?Text) : async Types.ApiResult<Types.FilePublic> {
      let b = resolveBucket(bucketId);
      let k = resolveKey(apiKey);
      await canister.moveFile(b, sourcePath, destinationPath, k);
    };

    public func usage(bucketId : ?Text) : async Types.ApiResult<Types.BucketStats> {
      let b = resolveBucket(bucketId);
      await canister.getBucketStats(b);
    };

    public func url(bucketName : Text, path : Text) : Text {
      Url.publicFileUrl(Principal.toText(canisterPrincipal), bucketName, path);
    };
  };
};
