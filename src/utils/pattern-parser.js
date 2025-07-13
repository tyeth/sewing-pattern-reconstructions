export function parsePatternFilename(filename) {
  const match = filename.match(/_page(\d+)to(\d+)\.pdf$/)
  
  if (!match) {
    return null
  }
  
  const startPage = parseInt(match[1])
  const endPage = parseInt(match[2])
  
  return {
    startPage,
    endPage,
    pageCount: endPage - startPage + 1
  }
}