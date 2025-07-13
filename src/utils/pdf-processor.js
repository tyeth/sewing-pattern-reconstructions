import { PDFiumLibrary } from '@hyzyla/pdfium'

let pdfiumLibrary = null

export async function extractPagesFromPDF(pdfBuffer, startPage, endPage) {
  // Initialize PDFium WASM if not already done
  if (!pdfiumLibrary) {
    pdfiumLibrary = await PDFiumLibrary.init()
  }

  // Load PDF document
  const document = await pdfiumLibrary.loadDocument(pdfBuffer)
  const pages = []

  try {
    for (let i = startPage; i <= endPage; i++) {
      const page = document.getPage(i - 1) // PDFium uses 0-based indexing
      
      // Render page to image using bitmap render engine
      const renderResult = await page.render({
        scale: 2, // 2x scale for better quality
        render: 'bitmap' // Use bitmap engine to get raw RGBA data
      })

      const imageData = {
        width: renderResult.width,
        height: renderResult.height,
        data: new Uint8ClampedArray(renderResult.data)
      }

      pages.push({
        pageNumber: i,
        imageData: imageData
      })
    }
  } finally {
    // Clean up document
    document.destroy()
  }

  return pages
}