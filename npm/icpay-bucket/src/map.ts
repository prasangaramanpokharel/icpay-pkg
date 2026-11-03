import type { FileListPage, FilePublic } from "./types.js"

export function mapFile(file: FilePublic): FilePublic {
  return {
    id: file.id,
    path: file.path,
    name: file.name,
    size: file.size,
    contentType: file.contentType,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    metadata: file.metadata,
    tags: file.tags,
    publicUrl: file.publicUrl,
  }
}

export function mapFileListPage(page: {
  items: FilePublic[]
  total: bigint
  page: bigint
  pageSize: bigint
}): FileListPage {
  return {
    items: page.items.map(mapFile),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  }
}
