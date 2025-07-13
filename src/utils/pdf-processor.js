import { PDFiumLibrary } from '@hyzyla/pdfium'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

let pdfiumLibrary = null

export async function extractPagesFromPDF(pdfBuffer, startPage, endPage) {
  // Initialize PDFium WASM if not already done
  if (!pdfiumLibrary) {
    let wasmBinary
    
    // Check if we're in a browser or Node.js environment
    if (typeof window !== 'undefined' && typeof global === 'undefined') {
      // Real browser environment - fetch the WASM file
      const wasmResponse = await fetch('/pdfium.wasm')
      wasmBinary = await wasmResponse.arrayBuffer()
    } else {
      // Node.js or test environment - read the WASM file directly
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const wasmPath = join(__dirname, '../../node_modules/@hyzyla/pdfium/dist/vendor/pdfium.wasm')
      wasmBinary = readFileSync(wasmPath)
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