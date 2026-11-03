import Text "mo:base/Text";

module {
  public let defaultCanisterId = "6vbhm-nqaaa-aaaan-q6muq-cai";
  public let defaultCdnHost = "https://cloud.icpay.app";

  public func formatPath(path : Text) : Text {
    if (Text.startsWith(path, #text "/")) {
      path
    } else {
      "/" # path
    }
  };

  public func publicFileUrl(canisterId : Text, bucketName : Text, path : Text) : Text {
    defaultCdnHost # "/cloud/" # bucketName # formatPath(path)
  };

  public func rawFileUrl(canisterId : Text, bucketName : Text, path : Text) : Text {
    "https://" # canisterId # ".raw.icp0.io/cloud/" # bucketName # formatPath(path)
  };
};
