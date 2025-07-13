import { describe, it, expect } from 'vitest'
import { extractPagesFromPDF } from '../src/utils/pdf-processor.js'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('PDF Processing with PDFium', () => {
  it('should extract pages 18-37 from mens pajama shorts PDF', async () => {
    const pdfPath = join(process.cwd(), 'tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    const pdfBuffer = readFileSync(pdfPath)
    
    const extractedPages = await extractPagesFromPDF(pdfBuffer, 18, 37)
    
    expect(extractedPages).toHaveLength(20)
    expect(extractedPages[0]).toHaveProperty('pageNumber', 18)
    expect(extractedPages[19]).toHaveProperty('pageNumber', 37)
    expect(extractedPages[0]).toHaveProperty('imageData')
    expect(extractedPages[0].imageData).toBeDefined()
  })

  it('should extract actual image data with width and height from PDF page', async () => {
    const pdfPath = join(process.cwd(), 'tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    const pdfBuffer = readFileSync(pdfPath)
    
    const extractedPages = await extractPagesFromPDF(pdfBuffer, 18, 18) // Just first page
    const firstPage = extractedPages[0]
    
    expect(firstPage.imageData.width).toBeGreaterThan(100) // Real PDF page should be wider than 100px
    expect(firstPage.imageData.height).toBeGreaterThan(100) // Real PDF page should be taller than 100px
    expect(firstPage.imageData.data).toBeInstanceOf(Uint8ClampedArray)
    expect(firstPage.imageData.data.length).toBeGreaterThan(1000) // Real image should have substantial data
  })

  it('should extract different image data for different pages', async () => {
    const pdfPath = join(process.cwd(), 'tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    const pdfBuffer = readFileSync(pdfPath)
    
    const page18 = await extractPagesFromPDF(pdfBuffer, 18, 18)
    const page19 = await extractPagesFromPDF(pdfBuffer, 19, 19)
    
    // Both pages should have valid image data
    expect(page18[0].imageData.data).toBeInstanceOf(Uint8ClampedArray)
    expect(page19[0].imageData.data).toBeInstanceOf(Uint8ClampedArray)
    
    // Image data should be different between pages
    expect(page18[0].imageData.data).not.toEqual(page19[0].imageData.data)
    
    // Pages should have same dimensions (same PDF layout)
    expect(page18[0].imageData.width).toBe(page19[0].imageData.width)
    expect(page18[0].imageData.height).toBe(page19[0].imageData.height)
  })
})