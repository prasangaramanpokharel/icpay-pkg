# icpay-bucket (Java)

Official Java SDK for ICPay Cloud / icBucket decentralized storage on the Internet Computer.

## Requirements

- Java 17 or later

## Installation

### Maven

```xml
<dependency>
    <groupId>app.icpay</groupId>
    <artifactId>icpay-bucket</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'app.icpay:icpay-bucket:1.0.0'
```

## Quickstart

```java
import app.icpay.bucket.Client;
import app.icpay.bucket.model.FileMetadata;
import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) {
        Client client = new Client(
            System.getenv("BUCKET_API_KEY"),
            "my-bucket"
        );

        byte[] payload = "Hello ICPay Cloud".getBytes(StandardCharsets.UTF_8);

        FileMetadata uploaded = client.files.upload(
            "/documents/hello.txt",
            payload,
            "text/plain",
            null,
            null
        );

        System.out.println("Uploaded: " + uploaded.url());

        byte[] downloaded = client.files.download("/documents/hello.txt");
        System.out.println("Downloaded bytes: " + downloaded.length);

        boolean exists = client.files.exists("/documents/hello.txt");
        System.out.println("File exists: " + exists);

        client.files.delete("/documents/hello.txt");
    }
}
```

## CDN URL Generation

```java
String publicUrl = client.files.url("/photos/avatar.png");
```

## License

MIT
