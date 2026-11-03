export const DEFAULT_CANISTER_ID = "6vbhm-nqaaa-aaaan-q6muq-cai"
export const CDN_BASE_URL = "https://cloud.icpay.app"
export const DEFAULT_CDN_HOST = CDN_BASE_URL

export function publicFileUrl(
  canisterId: string,
  bucketName: string,
  path: string,
  opts?: { gateway?: "cdn" | "raw" }
): string {
  const filePath = path.startsWith("/") ? path : `/${path}`
  if ((opts?.gateway ?? "cdn") === "cdn") {
    return `${CDN_BASE_URL}/cloud/${bucketName}${filePath}`
  }
  return `https://${canisterId}.raw.icp0.io/cloud/${bucketName}${filePath}`
}

export class UrlBuilder {
  private readonly cdnHost: string
  private readonly bucketId: string

  constructor(bucketId: string, cdnHost = CDN_BASE_URL) {
    this.cdnHost = cdnHost.replace(/\/+$/, "")
    this.bucketId = bucketId
  }

  fileUrl(path: string): string {
    const cleanPath = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")
    return `${this.cdnHost}/cloud/${this.bucketId}/${cleanPath}`
  }
}
