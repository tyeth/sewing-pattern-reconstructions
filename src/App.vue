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
          Extract Pages
        </button>
        <div v-if="extractedPages.length > 0" class="svg-conversion-controls">
          <div class="threshold-control">
            <label>SVG Threshold: 
              <input 
                type="range" 
                min="50" 
                max="200" 
                step="5" 
                v-model.number="thresholdLevel"
                class="threshold-slider"
              />
              <span class="threshold-value">{{ thresholdLevel }}</span>
            </label>
          </div>
          <button 
            @click="convertToSVG" 
            :disabled="processing || svgProcessing"
            class="svg-button"
          >
            Convert to SVG
          </button>
        </div>
        
        <div v-if="extractedPages.length > 0 || svgPages.length > 0" class="view-controls">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              v-model="showBitmaps"
            />
            Show Bitmaps
          </label>
          <label class="toggle-label">
            <input 
              type="checkbox" 
              v-model="showSVGs"
            />
            Show SVGs
          </label>
          
          <div v-if="showBitmaps && showSVGs" class="split-control">
            <label>Split View: 
              <input 
                type="range" 
                min="10" 
                max="90" 
                step="5" 
                v-model.number="splitPercentage"
                class="split-slider"
              />
              <span class="split-value">{{ splitPercentage }}%</span>
            </label>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="processing" data-testid="processing" class="processing">
      <div>Extracting PDF pages... {{ processedPages }}/{{ totalPages }}</div>
      <div v-if="currentPageDebug" class="debug-info">
        {{ currentPageDebug }}
      </div>
    </div>
    
    <div v-if="svgProcessing" class="processing">
      <div>Converting to SVG... {{ svgProcessedPages }}/{{ extractedPages.length }}</div>
      <div v-if="currentPageDebug" class="debug-info">
        {{ currentPageDebug }}
      </div>
    </div>
    
    <div v-if="extractedPages.length > 0 || svgPages.length > 0" data-testid="pages-table" class="pages-table">
      <div 
        v-for="pageNumber in allPageNumbers" 
        :key="pageNumber"
        data-testid="page-item"
        class="page-item"
      >
        <div data-testid="page-number" class="page-number">
          Page {{ pageNumber }}
        </div>
        
        <!-- Split view when both are enabled -->
        <div v-if="showBitmaps && showSVGs && getBitmapPage(pageNumber) && getSVGPage(pageNumber)" class="split-view-container">
          <div class="split-content">
            <!-- Bitmap on left -->
            <div class="bitmap-section" :style="{ width: splitPercentage + '%' }">
              <canvas 
                :ref="`canvas-${pageNumber}`"
                :data-page="pageNumber"
                class="bitmap-canvas split-canvas"
              ></canvas>
            </div>
            
            <!-- SVG on right -->
            <div class="svg-section" :style="{ width: (100 - splitPercentage) + '%' }">
              <div class="svg-content" v-html="getSVGPage(pageNumber).svg"></div>
            </div>
            
            <!-- Wiper bar -->
            <div class="wiper-bar" :style="{ left: splitPercentage + '%' }">
              <div class="wiper-handle"></div>
            </div>
          </div>
          
          <!-- Labels -->
          <div class="split-labels">
            <span class="bitmap-label">Bitmap</span>
            <span class="svg-label">SVG ({{ getSVGPage(pageNumber).pathCount }} paths)</span>
          </div>
        </div>
        
        <!-- Bitmap only (or when SVGs don't exist yet) -->
        <div v-else-if="showBitmaps && getBitmapPage(pageNumber) && (!showSVGs || !getSVGPage(pageNumber))" class="bitmap-container">
          <h4>Bitmap</h4>
          <canvas 
            :ref="`canvas-${pageNumber}`"
            :data-page="pageNumber"
            class="bitmap-canvas"
          ></canvas>
        </div>
        
        <!-- SVG only -->
        <div v-else-if="showSVGs && getSVGPage(pageNumber) && !showBitmaps" class="svg-container">
          <h4>SVG ({{ getSVGPage(pageNumber).pathCount }} paths)</h4>
          <div v-html="getSVGPage(pageNumber).svg"></div>
        </div>
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
      svgProcessing: false,
      processedPages: 0,
      svgProcessedPages: 0,
      totalPages: 0,
      extractedPages: [],
      svgPages: [],
      fileLoaded: false,
      currentFile: null,
      detectedStartPage: 1,
      detectedEndPage: 1,
      selectedStartPage: 1,
      selectedEndPage: 1,
      currentPageDebug: '',
      showBitmaps: false,
      showSVGs: true,
      thresholdLevel: 128,
      splitPercentage: 50
    }
  },
  computed: {
    allPageNumbers() {
      const pages = new Set()
      this.extractedPages.forEach(p => pages.add(p.pageNumber))
      this.svgPages.forEach(p => pages.add(p.pageNumber))
      return Array.from(pages).sort((a, b) => a - b)
    }
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0]
      if (!file) return
      
      try {
        // Parse filename to get page range
        const pageInfo = parsePatternFilename(file.name)
        
        this.currentFile = file
        
        if (pageInfo) {
          this.detectedStartPage = pageInfo.startPage
          this.detectedEndPage = pageInfo.endPage
          this.selectedStartPage = pageInfo.startPage
          this.selectedEndPage = pageInfo.endPage
          console.log(`Loaded PDF: ${file.name}, detected pages ${pageInfo.startPage}-${pageInfo.endPage}`)
        } else {
          // Use default page range when filename doesn't contain page info
          this.detectedStartPage = 1
          this.detectedEndPage = 10
          this.selectedStartPage = 1
          this.selectedEndPage = 10
          console.log(`Loaded PDF: ${file.name}, no page info in filename - using default range 1-10`)
        }
        
        this.fileLoaded = true
        this.extractedPages = []
        this.svgPages = []
        
      } catch (error) {
        console.error('Error loading PDF:', error)
        alert('Error loading PDF: ' + error.message)
      }
    },
    
    async processSelectedPages() {
      if (!this.currentFile) return
      
      this.processing = true
      this.extractedPages = []
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
        this.extractedPages = await extractPagesFromPDF(
          pdfBuffer, 
          this.selectedStartPage, 
          this.selectedEndPage
        )
        
        console.log(`Extracted ${this.extractedPages.length} pages`)
        
        // Render bitmaps to canvas elements with multiple retries
        this.$nextTick(() => {
          // Immediate render
          this.renderBitmapsToCanvas()
          // Retry after short delay to handle DOM timing issues
          setTimeout(() => this.renderBitmapsToCanvas(), 100)
          setTimeout(() => this.renderBitmapsToCanvas(), 500)
        })
        
      } catch (error) {
        console.error('Error processing PDF:', error)
        alert('Error processing PDF: ' + error.message)
      } finally {
        this.processing = false
        this.currentPageDebug = ''
      }
    },
    
    async convertToSVG() {
      if (this.extractedPages.length === 0) return
      
      this.svgProcessing = true
      this.svgPages = []
      this.svgProcessedPages = 0
      this.currentPageDebug = ''
      
      try {
        console.log('Starting SVG conversion...')
        
        // Process each page to SVG
        for (let i = 0; i < this.extractedPages.length; i++) {
          const page = this.extractedPages[i]
          
          this.currentPageDebug = `Converting page ${page.pageNumber} (${i + 1}/${this.extractedPages.length}): Tracing with Potrace...`
          console.log(`Converting page ${page.pageNumber}: ${page.imageData.width}x${page.imageData.height}`)
          
          const svgResult = await traceImageToSVG(page.imageData, {
            threshold: this.thresholdLevel,
            turdSize: 2,
            optCurve: true
          })
          
          console.log(`Page ${page.pageNumber}: Generated ${svgResult.paths.length} paths, SVG size: ${svgResult.svg.length} chars`)
          
          this.svgPages.push({
            pageNumber: page.pageNumber,
            svg: svgResult.svg,
            pathCount: svgResult.paths.length
          })
          
          this.svgProcessedPages++
          this.currentPageDebug = `Completed page ${page.pageNumber}`
          
          // Small delay to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        console.log(`SVG conversion complete! Generated ${this.svgPages.length} SVG pages`)
        
      } catch (error) {
        console.error('Error converting to SVG:', error)
        alert('Error converting to SVG: ' + error.message)
      } finally {
        this.svgProcessing = false
        this.currentPageDebug = ''
      }
    },
    
    renderBitmapsToCanvas() {
      this.extractedPages.forEach(page => {
        const canvas = this.$refs[`canvas-${page.pageNumber}`]?.[0]
        if (canvas && page.imageData) {
          canvas.width = page.imageData.width
          canvas.height = page.imageData.height
          const ctx = canvas.getContext('2d')
          const imageData = new ImageData(page.imageData.data, page.imageData.width, page.imageData.height)
          ctx.putImageData(imageData, 0, 0)
        }
      })
    },
    
    getBitmapPage(pageNumber) {
      return this.extractedPages.find(page => page.pageNumber === pageNumber)
    },
    
    getSVGPage(pageNumber) {
      return this.svgPages.find(page => page.pageNumber === pageNumber)
    }
  },
  watch: {
    showBitmaps(newVal) {
      if (newVal && this.extractedPages.length > 0) {
        // Re-render canvases when bitmap visibility is toggled on
        this.$nextTick(() => {
          setTimeout(() => this.renderBitmapsToCanvas(), 50)
          setTimeout(() => this.renderBitmapsToCanvas(), 200)
        })
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

.svg-button {
  background: #28a745 !important;
}

.svg-button:hover:not(:disabled) {
  background: #1e7e34 !important;
}

.view-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #dee2e6;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  margin: 0;
}

.split-control {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 5px 0;
}

.split-control label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.split-slider {
  width: 100px;
  margin: 0 5px;
}

.split-value {
  min-width: 35px;
  font-weight: bold;
  color: #555;
}

.svg-conversion-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 15px;
  padding: 15px;
  background: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #bee5eb;
}

.threshold-control {
  display: flex;
  gap: 10px;
  align-items: center;
}

.threshold-control label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.threshold-slider {
  width: 120px;
  margin: 0 5px;
}

.threshold-value {
  min-width: 30px;
  font-weight: bold;
  color: #555;
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

.pages-table {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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

.bitmap-container,
.svg-container {
  width: 100%;
  overflow: auto;
  margin-top: 10px;
}

.bitmap-container h4,
.svg-container h4 {
  margin: 0 0 10px 0;
  padding: 5px 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.bitmap-canvas {
  width: 100%;
  height: auto;
  max-height: 400px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.svg-container svg {
  width: 100%;
  height: auto;
  max-height: 400px;
}

/* Split View Styles */
.split-view-container {
  width: 100%;
  margin-top: 10px;
}

.split-content {
  position: relative;
  display: flex;
  width: 100%;
  height: 400px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.bitmap-section {
  position: relative;
  overflow: hidden;
  background: #f8f9fa;
}

.svg-section {
  position: relative;
  overflow: hidden;
  background: white;
}

.split-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.svg-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-content svg {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.wiper-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #007bff;
  cursor: col-resize;
  z-index: 10;
  transform: translateX(-2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wiper-handle {
  width: 12px;
  height: 40px;
  background: #007bff;
  border-radius: 6px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.split-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.bitmap-label {
  font-weight: bold;
}

.svg-label {
  font-weight: bold;
}
</style>