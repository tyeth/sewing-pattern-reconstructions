// Test setup for Vue components and pattern processing

// Pattern filename parser utility
global.parsePatternFilename = (filename) => {
  const match = filename.match(/_page(\d+)to(\d+)\.pdf$/)
  if (match) {
    return {
      startPage: parseInt(match[1]),
      endPage: parseInt(match[2]),
      pageCount: parseInt(match[2]) - parseInt(match[1]) + 1
    }
  }
  return null
}