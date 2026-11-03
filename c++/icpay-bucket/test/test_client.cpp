#include <iostream>
#include <cassert>
#include "icbucket/client.hpp"

using namespace icbucket;

static void test_initialization() {
    ClientConfig config;
    config.api_key = "test_api_key_123";
    config.bucket_id = "icp";

    ICBucket bucket(config);
    assert(bucket.config().bucket_id == "icp");
    assert(bucket.config().api_key == "test_api_key_123");

    std::string url = bucket.files.url("documents/report.pdf");
    assert(url == "https://cloud.icpay.app/cloud/icp/documents/report.pdf");

    std::string url2 = bucket.files.url("/nested/data.json");
    assert(url2 == "https://cloud.icpay.app/cloud/icp/nested/data.json");
}

static void test_errors() {
    try {
        ClientConfig config;
        config.api_key = "";
        config.bucket_id = "icp";
        ICBucket bucket(config);
        assert(false);
    } catch (const ICBucketError& e) {
        assert(e.code() == ErrorCode::AuthenticationFailed);
    }

    try {
        ClientConfig config;
        config.api_key = "test";
        config.bucket_id = "";
        ICBucket bucket(config);
        assert(false);
    } catch (const ICBucketError& e) {
        assert(e.code() == ErrorCode::InvalidRequest);
    }
}

int main() {
    std::cout << "Running C++ SDK unit tests..." << std::endl;
    test_initialization();
    test_errors();
    std::cout << "All C++ SDK unit tests passed!" << std::endl;
    return 0;
}
