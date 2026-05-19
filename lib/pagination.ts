function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(1, page), Math.max(1, totalPages))
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = getTotalPages(items.length, pageSize)
  const currentPage = clampPage(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize

  return {
    currentPage,
    totalPages,
    items: items.slice(startIndex, startIndex + pageSize),
  }
}
