import { PDFiumLibrary } from '@hyzyla/pdfium'

let pdfiumLibrary = null

export async function extractPagesFromPDF(pdfBuffer, startPage, endPage) {
  // Initialize PDFium WASM if not already done
  if (!pdfiumLibrary) {
    let wasmBinary
    
    // Check if we're in a browser or Node.js environment
    if (typeof window !== 'undefined') {
      // Browser environment - fetch the WASM file
      const wasmResponse = await fetch('/pdfium.wasm')
      wasmBinary = await wasmResponse.arrayBuffer()
    } else {
      // Node.js environment - dynamically import Node.js modules
      const fs = await import('fs')
      const url = await import('url')
      const path = await import('path')
      
      const __filename = url.fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      const wasmPath = path.join(__dirname, '../../node_modules/@hyzyla/pdfium/dist/vendor/pdfium.wasm')
      wasmBinary = fs.readFileSync(wasmPath)
    }
    
    pdfiumLibrary = await PDFiumLibrary.init({
      wasmBinary: wasmBinary,
      locateFile: (path) => {
        if (path === 'pdfium.wasm') {
          return '/pdfium.wasm'
        }
        return path
      }
    })
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