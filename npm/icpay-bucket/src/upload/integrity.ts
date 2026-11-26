export async function computeSha256(data: Uint8Array): Promise<string> {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const copy = new Uint8Array(data.byteLength)
    copy.set(data)
    const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer)
    const bytes = new Uint8Array(digest)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte !== undefined) {
      hash = (hash * 31 + byte) >>> 0
    }
  }
  return hash.toString(16).padStart(8, "0")
}
