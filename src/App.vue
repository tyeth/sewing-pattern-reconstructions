<template>
  <div id="app">
    <h1>Sewing Pattern Reconstruction</h1>
    <div class="upload-controls">
      <input 
        type="file" 
        accept=".pdf" 
        @change="handleFileUpload"
        :disabled="processing"
      />
      
      <div v-if="fileLoaded" class="page-controls">
        <label>Start Page: 
          <input 
            type="number" 
            v-model.number="selectedStartPage" 
            :min="detectedStartPage" 
            :max="detectedEndPage"
            :disabled="processing"
          />
        </label>
        <label>End Page: 
          <input 
            type="number" 
            v-model.number="selectedEndPage" 
            :min="detectedStartPage" 
            :max="detectedEndPage"
            :disabled="processing"
          />
        </label>
        <button @click="processSelectedPages" :disabled="processing">
          Process Pages
        </button>
      </div>
    </div>
    
    <div v-if="processing" data-testid="processing" class="processing">
      <div>Processing PDF pages... {{ processedPages }}/{{ totalPages }}</div>
      <div v-if="currentPageDebug" class="debug-info">
        {{ currentPageDebug }}
      </div>
    </div>
    
    <div v-if="svgPages.length > 0" data-testid="svg-table" class="svg-table">
      <div 
        v-for="page in svgPages" 
        :key="page.pageNumber"
        data-testid="page-item"
        class="page-item"
      >
        <div data-testid="page-number" class="page-number">
          Page {{ page.pageNumber }}
        </div>
        <div class="svg-container" v-html="page.svg"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { extractPagesFromPDF } from './utils/pdf-processor.js'
import { traceImageToSVG } from './utils/image-tracer.js'
import { parsePatternFilename } from './utils/pattern-parser.js'

export default {
  name: 'App',
  data() {
    return {
      processing: false,
      processedPages: 0,
      totalPages: 0,
      svgPages: [],
      fileLoaded: false,
      currentFile: null,
      detectedStartPage: 1,
      detectedEndPage: 1,
      selectedStartPage: 1,
      selectedEndPage: 1,
      currentPageDebug: ''
    }
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0]
      if (!file) return
      
      try {
        // Parse filename to get page range
        const pageInfo = parsePatternFilename(file.name)
        if (!pageInfo) {
          alert('Invalid filename format. Expected: name_pageXXtoYY.pdf')
          return
        }
        
        this.currentFile = file
        this.detectedStartPage = pageInfo.startPage
        this.detectedEndPage = pageInfo.endPage
        this.selectedStartPage = pageInfo.startPage
        this.selectedEndPage = pageInfo.endPage
        this.fileLoaded = true
        this.svgPages = []
        
        console.log(`Loaded PDF: ${file.name}, detected pages ${pageInfo.startPage}-${pageInfo.endPage}`)
        
      } catch (error) {
        console.error('Error loading PDF:', error)
        alert('Error loading PDF: ' + error.message)
      }
    },
    
    async processSelectedPages() {
      if (!this.currentFile) return
      
      this.processing = true
      this.svgPages = []
      this.processedPages = 0
      this.totalPages = this.selectedEndPage - this.selectedStartPage + 1
      this.currentPageDebug = ''
      
      try {
        this.currentPageDebug = 'Reading PDF file...'
        const arrayBuffer = await this.currentFile.arrayBuffer()
        const pdfBuffer = new Uint8Array(arrayBuffer)
        
        this.currentPageDebug = 'Initializing PDFium...'
        console.log('Starting PDF extraction...')
        
        // Extract pages from PDF
        const extractedPages = await extractPagesFromPDF(
          pdfBuffer, 
          this.selectedStartPage, 
          this.selectedEndPage
        )
        
        console.log(`Extracted ${extractedPages.length} pages, starting SVG tracing...`)
        
        // Process each page to SVG
        for (let i = 0; i < extractedPages.length; i++) {
          const page = extractedPages[i]
          
          this.currentPageDebug = `Processing page ${page.pageNumber} (${i + 1}/${extractedPages.length}): Extracting image data...`
          console.log(`Processing page ${page.pageNumber}: ${page.imageData.width}x${page.imageData.height}`)
          
          this.currentPageDebug = `Processing page ${page.pageNumber}: Tracing with Potrace...`
          const svgResult = await traceImageToSVG(page.imageData, {
            threshold: 128,
            turdSize: 2,
            optCurve: true
          })
          
          console.log(`Page ${page.pageNumber}: Generated ${svgResult.paths.length} paths, SVG size: ${svgResult.svg.length} chars`)
          
          this.svgPages.push({
            pageNumber: page.pageNumber,
            svg: svgResult.svg,
            pathCount: svgResult.paths.length
          })
          
          this.processedPages++
          this.currentPageDebug = `Completed page ${page.pageNumber}`
          
          // Small delay to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        console.log(`Processing complete! Generated ${this.svgPages.length} SVG pages`)
        
      } catch (error) {
        console.error('Error processing PDF:', error)
        alert('Error processing PDF: ' + error.message)
      } finally {
        this.processing = false
        this.currentPageDebug = ''
      }
    }
  }
}
</script>

<style>
.upload-controls {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.page-controls {
  margin-top: 15px;
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.page-controls label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.page-controls input[type="number"] {
  width: 80px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.page-controls button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.page-controls button:hover:not(:disabled) {
  background: #0056b3;
}

.page-controls button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.processing {
  margin: 20px 0;
  padding: 15px;
  background: #e3f2fd;
  border-radius: 4px;
  border-left: 4px solid #2196f3;
}

.debug-info {
  margin-top: 10px;
  font-family: monospace;
  font-size: 14px;
  color: #555;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}

.svg-table {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.page-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background: white;
}

.page-number {
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

.svg-container {
  width: 100%;
  overflow: auto;
}

.svg-container svg {
  width: 100%;
  height: auto;
  max-height: 400px;
}
</style>