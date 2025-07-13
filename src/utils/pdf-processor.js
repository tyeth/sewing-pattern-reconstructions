export async function extractPagesFromPDF(pdfBuffer, startPage, endPage) {
  // Minimal implementation to pass test
  const pages = []
  for (let i = startPage; i <= endPage; i++) {
    pages.push({
      pageNumber: i,
      imageData: {} // Minimal object, will be replaced with real PDFium data
    })
  }
  return pages
}