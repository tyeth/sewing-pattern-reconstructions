import { describe, it, expect } from 'vitest'
import { traceImageToSVG } from '../src/utils/image-tracer.js'
import { extractPagesFromPDF } from '../src/utils/pdf-processor.js'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Image Tracing with Potrace', () => {
  it('should trace PDF page image data to SVG paths', async () => {
    const pdfPath = join(process.cwd(), 'tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    const pdfBuffer = readFileSync(pdfPath)
    
    // Extract first page
    const extractedPages = await extractPagesFromPDF(pdfBuffer, 18, 18)
    const pageImageData = extractedPages[0].imageData
    
    // Trace image to SVG
    const svgResult = await traceImageToSVG(pageImageData)
    
    expect(svgResult).toHaveProperty('svg')
    expect(svgResult.svg).toContain('<svg')
    expect(svgResult.svg).toContain('<path')
    expect(svgResult).toHaveProperty('paths')
    expect(svgResult.paths).toBeInstanceOf(Array)
    expect(svgResult.paths.length).toBeGreaterThan(0)
  })

  it('should extract pattern lines from traced SVG', async () => {
    const pdfPath = join(process.cwd(), 'tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    const pdfBuffer = readFileSync(pdfPath)
    
    const extractedPages = await extractPagesFromPDF(pdfBuffer, 18, 18)
    const pageImageData = extractedPages[0].imageData
    
    const svgResult = await traceImageToSVG(pageImageData, {
      turdSize: 2,      // Suppress small speckles
      optCurve: true,   // Curve optimization
      threshold: 128    // Black/white threshold
    })
    
    expect(svgResult.paths).toBeInstanceOf(Array)
    
    // Should have multiple paths for pattern lines
    expect(svgResult.paths.length).toBeGreaterThan(5)
    
    // Each path should have length/complexity
    svgResult.paths.forEach(path => {
      expect(path).toHaveProperty('d') // SVG path data
      expect(path.d.length).toBeGreaterThan(10) // Non-trivial path
    })
  })
})