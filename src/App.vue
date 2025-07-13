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
                min="1" 
                max="99" 
                step="1" 
                v-model.number="splitPercentage"
                class="split-slider"
              />
              <span class="split-value">{{ splitPercentage }}%</span>
            </label>
          </div>
        </div>
        
        <div v-if="svgPages.length > 0" class="reorganize-controls">
          <div class="reorganize-header">
            <h3>Page Reorganization</h3>
            <p>Arrange your pattern pages into columns for easier layout</p>
          </div>
          
          <div class="reorganize-options">
            <label>Columns: 
              <select v-model.number="columnCount" class="column-selector">
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="5">5 Columns</option>
                <option value="6">6 Columns</option>
              </select>
            </label>
            
            <button 
              @click="startReorganization" 
              :disabled="reorganizing"
              class="reorganize-button"
            >
              {{ reorganizing ? 'Organizing...' : 'Start Page Organization' }}
            </button>
            
            <button 
              v-if="reorganizing" 
              @click="finishReorganization"
              class="finish-button"
            >
              Finish & Export Layout
            </button>
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
    
    <!-- Regular pages view -->
    <div v-if="!reorganizing && (extractedPages.length > 0 || svgPages.length > 0)" data-testid="pages-table" class="pages-table">
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
          <div class="split-content" :ref="`split-content-${pageNumber}`">
            <!-- Bitmap layer (full width, clipped on right) -->
            <div class="bitmap-section" :style="{ clipPath: `inset(0 ${100 - splitPercentage}% 0 0)` }">
              <canvas 
                :ref="`canvas-${pageNumber}`"
                :data-page="pageNumber"
                class="bitmap-canvas split-canvas"
              ></canvas>
            </div>
            
            <!-- SVG layer (full width, clipped on left) -->
            <div class="svg-section" :style="{ clipPath: `inset(0 0 0 ${splitPercentage}%)` }">
              <div class="svg-content" v-html="getSVGPage(pageNumber).svg"></div>
            </div>
            
            <!-- Wiper bar -->
            <div 
              class="wiper-bar" 
              :style="{ left: splitPercentage + '%' }"
              @mousedown="startDrag($event, pageNumber)"
            >
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
    
    <!-- Page reorganization canvas -->
    <div v-if="reorganizing" class="reorganization-workspace" data-testid="reorganization-workspace">
      <div class="workspace-header">
        <h3>Organize Pages into {{ columnCount }} Columns</h3>
        <p>Drag pages to rearrange them. Pages will automatically arrange into columns.</p>
      </div>
      
      <div class="workspace-canvas" :ref="workspaceCanvas">
        <div 
          class="column-guide" 
          v-for="col in columnCount" 
          :key="col"
          :style="{ 
            left: ((col - 1) / columnCount * 100) + '%',
            width: (100 / columnCount) + '%'
          }"
        >
          <div class="column-header">Column {{ col }}</div>
          <div class="column-drop-zone" :data-column="col">
            <div 
              v-for="page in getPagesByColumn(col)" 
              :key="page.pageNumber"
              class="draggable-page"
              :data-page="page.pageNumber"
              :style="{
                top: page.y + 'px',
                left: page.x + 'px'
              }"
              @mousedown="startPageDrag($event, page)"
            >
              <div class="page-thumbnail">
                <div class="page-label">Page {{ page.pageNumber }}</div>
                <div class="svg-thumbnail" v-html="getSVGPage(page.pageNumber).svg"></div>
              </div>
            </div>
          </div>
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
      splitPercentage: 50,
      isDragging: false,
      dragPageNumber: null,
      // Reorganization properties
      reorganizing: false,
      columnCount: 4,
      pagePositions: [],
      isDraggingPage: false,
      draggedPage: null,
      dragOffset: { x: 0, y: 0 }
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
        // Get all canvas elements for this page (could be in different layouts)
        const canvasRefs = this.$refs[`canvas-${page.pageNumber}`]
        
        if (canvasRefs && page.imageData) {
          // Handle both single canvas and array of canvases
          const canvases = Array.isArray(canvasRefs) ? canvasRefs : [canvasRefs]
          
          canvases.forEach(canvas => {
            if (canvas) {
              canvas.width = page.imageData.width
              canvas.height = page.imageData.height
              const ctx = canvas.getContext('2d')
              const imageData = new ImageData(page.imageData.data, page.imageData.width, page.imageData.height)
              ctx.putImageData(imageData, 0, 0)
            }
          })
        }
      })
    },
    
    getBitmapPage(pageNumber) {
      return this.extractedPages.find(page => page.pageNumber === pageNumber)
    },
    
    getSVGPage(pageNumber) {
      return this.svgPages.find(page => page.pageNumber === pageNumber)
    },
    
    startDrag(event, pageNumber) {
      this.isDragging = true
      this.dragPageNumber = pageNumber
      event.preventDefault()
      
      // Add global event listeners
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.endDrag)
    },
    
    onDrag(event) {
      if (!this.isDragging || !this.dragPageNumber) return
      
      const splitContent = this.$refs[`split-content-${this.dragPageNumber}`]?.[0]
      if (!splitContent) return
      
      const rect = splitContent.getBoundingClientRect()
      const x = event.clientX - rect.left
      const percentage = Math.max(1, Math.min(99, (x / rect.width) * 100))
      
      this.splitPercentage = Math.round(percentage)
    },
    
    endDrag() {
      this.isDragging = false
      this.dragPageNumber = null
      
      // Remove global event listeners
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
    },
    
    // Reorganization methods
    startReorganization() {
      this.reorganizing = true
      this.initializePagePositions()
    },
    
    finishReorganization() {
      this.reorganizing = false
      // Here we could export the final layout or return to normal view
      console.log('Final page positions:', this.pagePositions)
    },
    
    initializePagePositions() {
      this.pagePositions = this.svgPages.map((page, index) => ({
        pageNumber: page.pageNumber,
        column: (index % this.columnCount) + 1,
        x: 0,
        y: Math.floor(index / this.columnCount) * 250, // 250px spacing between pages
        width: 200,
        height: 200
      }))
    },
    
    getPagesByColumn(column) {
      return this.pagePositions.filter(page => page.column === column)
    },
    
    startPageDrag(event, page) {
      this.isDraggingPage = true
      this.draggedPage = page
      
      const rect = event.target.getBoundingClientRect()
      this.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      
      event.preventDefault()
      document.addEventListener('mousemove', this.onPageDrag)
      document.addEventListener('mouseup', this.endPageDrag)
    },
    
    onPageDrag(event) {
      if (!this.isDraggingPage || !this.draggedPage) return
      
      const workspace = this.$refs.workspaceCanvas
      if (!workspace) return
      
      const rect = workspace.getBoundingClientRect()
      const x = event.clientX - rect.left - this.dragOffset.x
      const y = event.clientY - rect.top - this.dragOffset.y
      
      // Update page position
      this.draggedPage.x = Math.max(0, x)
      this.draggedPage.y = Math.max(0, y)
      
      // Determine which column this page should be in
      const columnWidth = rect.width / this.columnCount
      const newColumn = Math.min(this.columnCount, Math.max(1, Math.ceil((x + this.draggedPage.width / 2) / columnWidth)))
      this.draggedPage.column = newColumn
    },
    
    endPageDrag() {
      this.isDraggingPage = false
      this.draggedPage = null
      
      document.removeEventListener('mousemove', this.onPageDrag)
      document.removeEventListener('mouseup', this.endPageDrag)
    }
  },
  beforeUnmount() {
    // Clean up event listeners
    document.removeEventListener('mousemove', this.onDrag)
    document.removeEventListener('mouseup', this.endDrag)
    document.removeEventListener('mousemove', this.onPageDrag)
    document.removeEventListener('mouseup', this.endPageDrag)
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
    },
    showSVGs() {
      // Re-render bitmaps when SVG visibility changes (affects layout)
      if (this.showBitmaps && this.extractedPages.length > 0) {
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
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f8f9fa;
}

.svg-section {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  user-select: none;
}

.wiper-bar:hover {
  background: #0056b3;
}

.wiper-handle {
  width: 12px;
  height: 40px;
  background: #007bff;
  border-radius: 6px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  pointer-events: none;
}

.wiper-bar:hover .wiper-handle {
  background: #0056b3;
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

/* Reorganization Controls */
.reorganize-controls {
  margin-top: 20px;
  padding: 20px;
  background: #f0f8ff;
  border-radius: 8px;
  border: 2px solid #007bff;
}

.reorganize-header h3 {
  margin: 0 0 10px 0;
  color: #007bff;
}

.reorganize-header p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
}

.reorganize-options {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.reorganize-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.column-selector {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
}

.reorganize-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.reorganize-button:hover:not(:disabled) {
  background: #0056b3;
}

.reorganize-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.finish-button {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.finish-button:hover {
  background: #1e7e34;
}

/* Reorganization Workspace */
.reorganization-workspace {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #28a745;
}

.workspace-header h3 {
  margin: 0 0 10px 0;
  color: #28a745;
}

.workspace-header p {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 14px;
}

.workspace-canvas {
  position: relative;
  width: 100%;
  min-height: 800px;
  background: white;
  border: 2px dashed #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.column-guide {
  position: absolute;
  top: 0;
  height: 100%;
  border-right: 1px solid #dee2e6;
  background: rgba(0, 123, 255, 0.05);
}

.column-guide:last-child {
  border-right: none;
}

.column-header {
  padding: 10px;
  background: rgba(0, 123, 255, 0.1);
  border-bottom: 1px solid #dee2e6;
  font-weight: bold;
  color: #007bff;
  text-align: center;
}

.column-drop-zone {
  position: relative;
  height: calc(100% - 45px);
  padding: 10px;
}

.draggable-page {
  position: absolute;
  width: 200px;
  background: white;
  border: 2px solid #007bff;
  border-radius: 8px;
  cursor: move;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.2s;
}

.draggable-page:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.page-thumbnail {
  padding: 10px;
}

.page-label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #007bff;
  text-align: center;
}

.svg-thumbnail {
  width: 100%;
  height: 150px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.svg-thumbnail svg {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>