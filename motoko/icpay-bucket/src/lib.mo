import Types "./Types";
import Client "./Client";
import Url "./Url";

module {
  public type BucketVisibility = Types.BucketVisibility;
  public type BucketStatus = Types.BucketStatus;
  public type BucketPublic = Types.BucketPublic;
  public type BucketStats = Types.BucketStats;
  public type FilePublic = Types.FilePublic;
  public type FileListPage = Types.FileListPage;
  public type FilePathOp = Types.FilePathOp;
  public type ApiKeyPermissions = Types.ApiKeyPermissions;
  public type ApiResult<T> = Types.ApiResult<T>;

  public let Client = Client.Client;
  public let defaultCanisterId = Url.defaultCanisterId;
  public let defaultCdnHost = Url.defaultCdnHost;
  public let publicFileUrl = Url.publicFileUrl;
  public let rawFileUrl = Url.rawFileUrl;
};
