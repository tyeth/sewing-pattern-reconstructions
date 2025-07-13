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
          <div class="column-layout-controls">
            <label>Layout Columns: 
              <select 
                v-model.number="columnCount"
                class="column-layout-select"
              >
                <option value="1">1 Column</option>
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="5">5 Columns</option>
                <option value="6">6 Columns</option>
              </select>
            </label>
          </div>
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
            <h3>Page Layout Designer</h3>
            <p>Drag and arrange your pattern pages on a large canvas. Group them however you want for your final layout.</p>
          </div>
          
          <div class="reorganize-options">
            <button 
              @click="startReorganization" 
              :disabled="reorganizing"
              class="reorganize-button"
            >
              {{ reorganizing ? 'Arranging Pages...' : 'Open Layout Designer' }}
            </button>
            
            <div v-if="reorganizing" class="layout-tools">
              <button @click="resetPagePositions" class="tool-button">
                Reset Positions
              </button>
              <button @click="autoArrangeGrid" class="tool-button">
                Auto-Arrange Grid
              </button>
              <button @click="finishReorganization" class="finish-button">
                Finish & Export Layout
              </button>
            </div>
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
    <div v-if="!reorganizing && (extractedPages.length > 0 || svgPages.length > 0)" 
         data-testid="pages-table" 
         class="pages-table"
         :style="{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }">
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
    
    <!-- Page layout designer canvas -->
    <div v-if="reorganizing" class="layout-designer" data-testid="layout-designer">
      <div class="designer-header">
        <div class="header-top">
          <div class="header-left">
            <h3>Layout Designer - {{ svgPages.length }} Pages</h3>
            <p>Drag pages anywhere on the canvas. Use mouse wheel to zoom, click and drag empty space to pan. Press Escape to close.</p>
          </div>
          <div class="header-right">
            <button @click="finishReorganization" class="close-button" title="Close Layout Designer (Escape)">
              ✕ Close
            </button>
          </div>
        </div>
        <div class="designer-controls">
          <div class="column-layout-controls">
            <label>Reorganize to Columns: 
              <select 
                v-model.number="layoutColumnCount"
                @change="reorganizeToColumns"
                class="column-layout-select"
              >
                <option value="1">1 Column</option>
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="5">5 Columns</option>
                <option value="6">6 Columns</option>
              </select>
            </label>
          </div>
          <div class="canvas-info">
            Canvas Size: {{ canvasWidth }}px × {{ canvasHeight }}px | Zoom: {{ Math.round(zoomLevel * 100) }}%
          </div>
        </div>
      </div>
      
      <div class="canvas-container" 
           @wheel="handleCanvasWheel" 
           @mousedown="handleCanvasMouseDown"
           @mousemove="handleCanvasMouseMove"
           @mouseup="handleCanvasMouseUp">
        
        <div class="canvas-viewport" 
             :style="{
               transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`,
               transformOrigin: '0 0'
             }">
          
          <div class="canvas-background" 
               :style="{
                 width: canvasWidth + 'px',
                 height: canvasHeight + 'px'
               }">
            
            <!-- Grid overlay -->
            <div class="grid-overlay" 
                 :style="{
                   backgroundSize: `${gridSize}px ${gridSize}px`,
                   width: canvasWidth + 'px',
                   height: canvasHeight + 'px'
                 }">
            </div>
            
            <!-- Draggable pages -->
            <div 
              v-for="page in pagePositions" 
              :key="page.pageNumber"
              class="draggable-page"
              :class="{ 
                'dragging': isDraggingPage && draggedPage?.pageNumber === page.pageNumber,
                'page-with-gradient': true
              }"
              :data-page="page.pageNumber"
              :style="{
                position: 'absolute',
                left: page.x + 'px',
                top: page.y + 'px',
                width: page.width + 'px',
                height: page.height + 'px'
              }"
              tabindex="0"
              role="button"
              :aria-label="`Page ${page.pageNumber} at position ${Math.round(page.x)}, ${Math.round(page.y)}. Use arrow keys to move.`"
              @mousedown="startPageDrag($event, page)"
              @touchstart="startPageTouch($event, page)"
              @touchmove="handlePageTouchMove"
              @touchend="endPageTouch"
              @keydown="handlePageKeydown($event, page)"
            >
              <div class="page-content">
                <div class="page-header" @click.stop="togglePageHeader(page.pageNumber)">
                  <span class="page-number">Page {{ page.pageNumber }}</span>
                  <div class="page-controls">
                    <button class="collapse-btn">{{ isHeaderCollapsed(page.pageNumber) ? '▼' : '▲' }}</button>
                  </div>
                </div>
                <div v-if="!isHeaderCollapsed(page.pageNumber)" class="page-preview">
                  <!-- Split view when both are enabled -->
                  <div v-if="showBitmaps && showSVGs && getBitmapPage(page.pageNumber) && getSVGPage(page.pageNumber)" class="split-view-container">
                    <div class="split-content">
                      <!-- Bitmap layer (full width, clipped on right) -->
                      <div class="bitmap-section" :style="{ clipPath: `inset(0 ${100 - splitPercentage}% 0 0)` }">
                        <canvas 
                          :ref="`layout-canvas-${page.pageNumber}`"
                          :data-page="page.pageNumber"
                          class="layout-bitmap-canvas"
                        ></canvas>
                      </div>
                      
                      <!-- SVG layer (full width, clipped on left) -->
                      <div class="svg-section" :style="{ clipPath: `inset(0 0 0 ${splitPercentage}%)` }">
                        <div class="svg-content" v-html="getSVGPage(page.pageNumber).svg"></div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Bitmap only (or when SVGs don't exist yet) -->
                  <div v-else-if="showBitmaps && getBitmapPage(page.pageNumber) && (!showSVGs || !getSVGPage(page.pageNumber))" class="bitmap-container">
                    <canvas 
                      :ref="`layout-canvas-${page.pageNumber}`"
                      :data-page="page.pageNumber"
                      class="layout-bitmap-canvas"
                    ></canvas>
                  </div>
                  
                  <!-- SVG only -->
                  <div v-else-if="showSVGs && getSVGPage(page.pageNumber) && !showBitmaps" class="svg-container">
                    <div v-html="getSVGPage(page.pageNumber).svg"></div>
                  </div>
                </div>
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
      // Layout properties
      columnCount: 4,
      // Layout designer properties
      reorganizing: false,
      layoutColumnCount: 4,
      pagePositions: [],
      isDraggingPage: false,
      draggedPage: null,
      dragOffset: { x: 0, y: 0 },
      // Canvas properties
      canvasWidth: 2400,
      canvasHeight: 1600,
      zoomLevel: 1,
      panX: 0,
      panY: 0,
      isPanning: false,
      panStart: { x: 0, y: 0 },
      gridSize: 50,
      // Touch interaction properties
      touchStartPos: null,
      // Header collapse state
      collapsedHeaders: new Set()
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
        
        // CRITICAL: Re-render bitmaps after SVG conversion because DOM structure changed
        // When SVGs are generated, the template switches from bitmap-only to split-view
        // which recreates canvas elements and clears their data
        this.$nextTick(() => {
          this.renderBitmapsToCanvas()
          // Extra safety renders to ensure data is restored
          setTimeout(() => this.renderBitmapsToCanvas(), 100)
          setTimeout(() => this.renderBitmapsToCanvas(), 300)
        })
        
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
        // Get all canvas elements for this page (main view and layout designer)
        const mainCanvasRefs = this.$refs[`canvas-${page.pageNumber}`]
        const layoutCanvasRefs = this.$refs[`layout-canvas-${page.pageNumber}`]
        
        // Combine all canvas references
        const allCanvasRefs = []
        if (mainCanvasRefs) {
          allCanvasRefs.push(...(Array.isArray(mainCanvasRefs) ? mainCanvasRefs : [mainCanvasRefs]))
        }
        if (layoutCanvasRefs) {
          allCanvasRefs.push(...(Array.isArray(layoutCanvasRefs) ? layoutCanvasRefs : [layoutCanvasRefs]))
        }
        
        if (allCanvasRefs.length > 0 && page.imageData) {
          allCanvasRefs.forEach(canvas => {
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
    
    
    handlePageKeydown(event, page) {
      const moveDistance = event.shiftKey ? 50 : 10 // Hold Shift for larger moves
      
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          page.x = Math.min(this.canvasWidth - page.width, page.x + moveDistance)
          this.updatePageAriaLabel(page)
          break
        case 'ArrowLeft':
          event.preventDefault()
          page.x = Math.max(0, page.x - moveDistance)
          this.updatePageAriaLabel(page)
          break
        case 'ArrowDown':
          event.preventDefault()
          page.y = Math.min(this.canvasHeight - page.height, page.y + moveDistance)
          this.updatePageAriaLabel(page)
          break
        case 'ArrowUp':
          event.preventDefault()
          page.y = Math.max(0, page.y - moveDistance)
          this.updatePageAriaLabel(page)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          // Focus on the page controls when Enter/Space is pressed
          const pageElement = event.target
          const firstButton = pageElement.querySelector('.size-btn')
          if (firstButton) firstButton.focus()
          break
        case 'Escape':
          event.preventDefault()
          this.finishReorganization()
          break
      }
    },
    
    handleLayoutKeydown(event) {
      // Global keyboard handler for layout designer
      if (!this.reorganizing) return
      
      if (event.key === 'Escape') {
        event.preventDefault()
        this.finishReorganization()
      }
    },
    
    updatePageAriaLabel(page) {
      // Update the aria-label to reflect new position for screen readers
      this.$nextTick(() => {
        const pageElement = document.querySelector(`[data-page="${page.pageNumber}"]`)
        if (pageElement) {
          pageElement.setAttribute('aria-label', 
            `Page ${page.pageNumber} at position ${Math.round(page.x)}, ${Math.round(page.y)}. Use arrow keys to move.`
          )
        }
      })
    },
    
    startPageTouch(event, page) {
      event.preventDefault()
      this.isDraggingPage = true
      this.draggedPage = page
      
      const touch = event.touches[0]
      this.touchStartPos = {
        x: touch.clientX,
        y: touch.clientY,
        pageX: page.x,
        pageY: page.y
      }
      
      // Add global touch event listeners
      document.addEventListener('touchmove', this.handlePageTouchMove, { passive: false })
      document.addEventListener('touchend', this.endPageTouch)
    },
    
    handlePageTouchMove(event) {
      if (!this.isDraggingPage || !this.draggedPage || !this.touchStartPos) return
      
      event.preventDefault()
      const touch = event.touches[0]
      
      // Calculate movement delta scaled by zoom level
      const deltaX = (touch.clientX - this.touchStartPos.x) / this.zoomLevel
      const deltaY = (touch.clientY - this.touchStartPos.y) / this.zoomLevel
      
      // Update page position with bounds checking
      this.draggedPage.x = Math.max(0, Math.min(
        this.canvasWidth - this.draggedPage.width,
        this.touchStartPos.pageX + deltaX
      ))
      this.draggedPage.y = Math.max(0, Math.min(
        this.canvasHeight - this.draggedPage.height,
        this.touchStartPos.pageY + deltaY
      ))
      
      // Update aria-label for accessibility
      this.updatePageAriaLabel(this.draggedPage)
    },
    
    endPageTouch(event) {
      event.preventDefault()
      this.isDraggingPage = false
      this.draggedPage = null
      this.touchStartPos = null
      
      // Remove global touch event listeners
      document.removeEventListener('touchmove', this.handlePageTouchMove)
      document.removeEventListener('touchend', this.endPageTouch)
    },
    
    togglePageHeader(pageNumber) {
      if (this.collapsedHeaders.has(pageNumber)) {
        this.collapsedHeaders.delete(pageNumber)
      } else {
        this.collapsedHeaders.add(pageNumber)
      }
      // Force reactivity update
      this.$forceUpdate()
    },
    
    isHeaderCollapsed(pageNumber) {
      return this.collapsedHeaders.has(pageNumber)
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
    
    // Layout designer methods
    startReorganization() {
      this.reorganizing = true
      this.initializePagePositions()
      // Add global keyboard listener for layout designer
      document.addEventListener('keydown', this.handleLayoutKeydown)
      // Render bitmaps in layout designer
      this.$nextTick(() => {
        setTimeout(() => this.renderBitmapsToCanvas(), 100)
        setTimeout(() => this.renderBitmapsToCanvas(), 300)
      })
    },
    
    finishReorganization() {
      this.reorganizing = false
      // Remove global keyboard listener
      document.removeEventListener('keydown', this.handleLayoutKeydown)
      console.log('Final layout positions:', this.pagePositions)
    },
    
    initializePagePositions() {
      // Start with a loose grid arrangement
      const cols = Math.ceil(Math.sqrt(this.svgPages.length))
      this.pagePositions = this.svgPages.map((page, index) => ({
        pageNumber: page.pageNumber,
        x: (index % cols) * 280 + 50, // 280px spacing horizontally
        y: Math.floor(index / cols) * 320 + 50, // 320px spacing vertically
        width: 250,
        height: 300
      }))
    },
    
    resetPagePositions() {
      this.initializePagePositions()
    },
    
    autoArrangeGrid() {
      const cols = Math.ceil(Math.sqrt(this.pagePositions.length))
      this.pagePositions.forEach((page, index) => {
        page.x = (index % cols) * 280 + 50
        page.y = Math.floor(index / cols) * 320 + 50
      })
    },
    
    reorganizeToColumns() {
      // Arrange pages in the specified number of columns
      this.pagePositions.forEach((page, index) => {
        page.x = (index % this.layoutColumnCount) * 280 + 50
        page.y = Math.floor(index / this.layoutColumnCount) * 320 + 50
      })
    },
    
    resizePage(page, factor) {
      page.width = Math.max(100, Math.min(500, page.width * factor))
      page.height = Math.max(120, Math.min(600, page.height * factor))
    },
    
    // Canvas interaction methods
    handleCanvasWheel(event) {
      event.preventDefault()
      const delta = event.deltaY > 0 ? 0.9 : 1.1
      this.zoomLevel = Math.max(0.1, Math.min(3, this.zoomLevel * delta))
    },
    
    handleCanvasMouseDown(event) {
      if (event.target.closest('.draggable-page')) return
      
      this.isPanning = true
      this.panStart = {
        x: event.clientX - this.panX,
        y: event.clientY - this.panY
      }
      event.preventDefault()
    },
    
    handleCanvasMouseMove(event) {
      if (this.isPanning) {
        this.panX = event.clientX - this.panStart.x
        this.panY = event.clientY - this.panStart.y
      }
    },
    
    handleCanvasMouseUp() {
      this.isPanning = false
    },
    
    // Page drag methods
    startPageDrag(event, page) {
      this.isDraggingPage = true
      this.draggedPage = page
      
      const rect = event.target.getBoundingClientRect()
      this.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      
      event.preventDefault()
      event.stopPropagation()
      document.addEventListener('mousemove', this.onPageDrag)
      document.addEventListener('mouseup', this.endPageDrag)
    },
    
    onPageDrag(event) {
      if (!this.isDraggingPage || !this.draggedPage) return
      
      const container = document.querySelector('.canvas-viewport')
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      
      // Account for zoom and pan
      const x = (event.clientX - rect.left) / this.zoomLevel - this.panX / this.zoomLevel - this.dragOffset.x
      const y = (event.clientY - rect.top) / this.zoomLevel - this.panY / this.zoomLevel - this.dragOffset.y
      
      // Update page position within canvas bounds
      this.draggedPage.x = Math.max(0, Math.min(this.canvasWidth - this.draggedPage.width, x))
      this.draggedPage.y = Math.max(0, Math.min(this.canvasHeight - this.draggedPage.height, y))
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
    document.removeEventListener('keydown', this.handleLayoutKeydown)
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
    },
    svgPages: {
      handler() {
        // Update layout designer when new SVG pages are added
        if (this.reorganizing && this.svgPages.length > this.pagePositions.length) {
          this.initializePagePositions()
        }
      },
      deep: true
    },
    splitPercentage() {
      // Re-render layout designer bitmaps when split percentage changes
      if (this.reorganizing && this.showBitmaps && this.extractedPages.length > 0) {
        this.$nextTick(() => {
          setTimeout(() => this.renderBitmapsToCanvas(), 50)
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

.column-layout-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.column-layout-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.column-layout-select {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 14px;
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
.layout-bitmap-canvas {
  width: 100%;
  height: auto;
  max-height: 250px;
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

/* Layout Designer Controls */
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

.layout-tools {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.reorganize-button, .tool-button, .finish-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}

.reorganize-button {
  background: #007bff;
  color: white;
}

.reorganize-button:hover:not(:disabled) {
  background: #0056b3;
}

.reorganize-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.tool-button {
  background: #6c757d;
  color: white;
}

.tool-button:hover {
  background: #545b62;
}

.finish-button {
  background: #28a745;
  color: white;
}

.finish-button:hover {
  background: #1e7e34;
}

/* Layout Designer Canvas */
.layout-designer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #f8f9fa;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.designer-header {
  padding: 20px;
  background: white;
  border-bottom: 2px solid #28a745;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.designer-header h3 {
  margin: 0 0 10px 0;
  color: #28a745;
}

.designer-header p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.canvas-info {
  font-size: 12px;
  color: #888;
  font-family: monospace;
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}
.header-left h3 {
  margin: 0 0 10px 0;
  color: #28a745;
}
.header-left p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
.close-button {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}
.close-button:hover {
  background: #c82333;
}
.designer-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  background: #e9ecef;
  position: relative;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
}

.canvas-viewport {
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

.canvas-background {
  background: white;
  position: relative;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
  opacity: 0.3;
}

.draggable-page {
  background: white;
  border: 2px solid #007bff;
  border-radius: 8px;
  cursor: move;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transition: transform 0.1s, box-shadow 0.2s;
  user-select: none;
}

.draggable-page:hover {
  box-shadow: 0 6px 12px rgba(0,0,0,0.2);
  z-index: 10;
}

.draggable-page.dragging {
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
  z-index: 20;
}

.draggable-page.dragging .page-header {
  background: #ffd700;
  border-bottom: 3px solid #ffc107;
  font-weight: bold;
}

.draggable-page.page-with-gradient {
  position: relative;
}

.draggable-page.page-with-gradient::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.2) 0%,
    transparent 10%,
    transparent 90%,
    rgba(255, 255, 255, 0.2) 100%
  ),
  linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.2) 0%,
    transparent 10%,
    transparent 90%,
    rgba(255, 255, 255, 0.2) 100%
  );
  pointer-events: none;
  border-radius: 8px;
}

.page-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px 6px 0 0;
}

.page-number {
  font-weight: bold;
  color: #007bff;
  font-size: 14px;
}

.page-controls {
  display: flex;
  gap: 4px;
}

.size-btn {
  display: none; /* Hide scaling buttons */
}

.collapse-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.collapse-btn:hover {
  background: #f8f9fa;
}

.svg-preview {
  flex: 1;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.svg-preview svg {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>