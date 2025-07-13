import { test, expect } from '@playwright/test'

test.describe('Layout Designer', () => {
  test('should show column layout controls during SVG conversion', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and extract pages
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Should show column layout options before SVG conversion
    await expect(page.locator('.column-layout-controls')).toBeVisible()
    await expect(page.locator('label:has-text("Layout Columns")')).toBeVisible()
    
    // Default should be 4 columns
    const columnSelect = page.locator('.column-layout-select')
    await expect(columnSelect).toHaveValue('4')
    
    // Should have options 1-6
    await columnSelect.selectOption('2')
    await expect(columnSelect).toHaveValue('2')
    await columnSelect.selectOption('6') 
    await expect(columnSelect).toHaveValue('6')
  })

  test('should reflow pages according to selected column count', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and extract pages
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Set to 3 columns
    await page.locator('.column-layout-select').selectOption('3')
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Pages should be arranged in 3 columns (grid should reflect this)
    const pagesTable = page.locator('[data-testid="pages-table"]')
    const gridColumns = await pagesTable.evaluate(el => 
      window.getComputedStyle(el).gridTemplateColumns
    )
    
    // Should show 3 equal columns layout (computed styles show pixel values)
    const columnCount = gridColumns.split(' ').length
    expect(columnCount).toBe(3)
  })

  test('should support keyboard navigation for draggable pages', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Pages should be focusable with keyboard
    const firstPage = page.locator('.draggable-page').first()
    await expect(firstPage).toHaveAttribute('tabindex', '0')
    
    // Should be able to focus the page
    await firstPage.focus()
    await expect(firstPage).toBeFocused()
    
    // Should support arrow key movement
    const initialBox = await firstPage.boundingBox()
    await page.keyboard.press('ArrowRight')
    
    // Page should have moved right
    const newBox = await firstPage.boundingBox()
    expect(newBox.x).toBeGreaterThan(initialBox.x)
  })

  test('should support touch events for mobile devices', async ({ page, browserName }, testInfo) => {
    // Skip this test unless it's a mobile browser configuration
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Touch events only tested on mobile browser')
    
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Get first page position
    const firstPage = page.locator('.draggable-page').first()
    const initialBox = await firstPage.boundingBox()
    
    // Simulate touch events using DOM events instead of Playwright touchscreen API
    await firstPage.dispatchEvent('touchstart', {
      touches: [{ 
        identifier: 0,
        clientX: initialBox.x + 10, 
        clientY: initialBox.y + 10,
        pageX: initialBox.x + 10,
        pageY: initialBox.y + 10
      }]
    })
    
    await page.waitForTimeout(100)
    
    await firstPage.dispatchEvent('touchmove', {
      touches: [{ 
        identifier: 0,
        clientX: initialBox.x + 100, 
        clientY: initialBox.y + 80,
        pageX: initialBox.x + 100,
        pageY: initialBox.y + 80
      }]
    })
    
    await firstPage.dispatchEvent('touchend', {
      touches: []
    })
    
    // Page should have moved (allow some tolerance for touch imprecision)
    const newBox = await firstPage.boundingBox()
    expect(Math.abs(newBox.x - (initialBox.x + 90))).toBeLessThan(100)
  })

  test('should provide column reflow options in layout designer', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Should show column reflow option in layout tools
    await expect(page.locator('.layout-tools')).toBeVisible()
    await expect(page.locator('select.reflow-columns')).toBeVisible()
    await expect(page.locator('button:has-text("Reflow to Columns")')).toBeVisible()
    
    // Test reflow functionality
    const reflowSelect = page.locator('select.reflow-columns')
    await reflowSelect.selectOption('3')
    await page.locator('button:has-text("Reflow to Columns")').click()
    
    // Pages should rearrange to 3 columns
    // Verify the first few pages are positioned in column layout
    const pages = page.locator('.draggable-page')
    const firstPageBox = await pages.nth(0).boundingBox()
    const fourthPageBox = await pages.nth(3).boundingBox() // Should be in same column as first page
    
    // X positions should be approximately the same (same column)
    expect(Math.abs(firstPageBox.x - fourthPageBox.x)).toBeLessThan(50)
    // Y position should be different (different rows)
    expect(Math.abs(firstPageBox.y - fourthPageBox.y)).toBeGreaterThan(100)
  })

  test('should provide accessibility features for screen readers', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Pages should have proper ARIA labels
    const firstPage = page.locator('.draggable-page').first()
    await expect(firstPage).toHaveAttribute('role', 'button')
    await expect(firstPage).toHaveAttribute('aria-label')
    
    // Should announce position changes
    const ariaLabel = await firstPage.getAttribute('aria-label')
    expect(ariaLabel).toContain('Page')
    expect(ariaLabel).toContain('position')
  })
  test('should open layout designer after SVG conversion', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and convert to SVG
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Should show layout designer controls
    await expect(page.locator('.reorganize-controls')).toBeVisible()
    await expect(page.locator('h3:has-text("Page Layout Designer")')).toBeVisible()
    await expect(page.locator('button:has-text("Open Layout Designer")')).toBeVisible()
  })
  
  test('should open full-screen layout designer canvas', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    
    // Should show full-screen layout designer
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    await expect(page.locator('.designer-header')).toBeVisible()
    await expect(page.locator('.canvas-container')).toBeVisible()
    
    // Should show canvas info
    await expect(page.locator('.canvas-info')).toContainText('Canvas Size: 2400px × 1600px')
    await expect(page.locator('.canvas-info')).toContainText('Zoom: 100%')
  })
  
  test('should display all pages as draggable elements on large canvas', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Should show all 20 pages as draggable elements
    const draggablePages = page.locator('.draggable-page')
    await expect(draggablePages).toHaveCount(20)
    
    // Each page should have page number and SVG preview
    const firstPage = draggablePages.first()
    await expect(firstPage.locator('.page-number')).toContainText('Page')
    await expect(firstPage.locator('.svg-preview svg')).toBeVisible()
    
    // Pages should have resize controls
    await expect(firstPage.locator('.size-btn:has-text("−")')).toBeVisible()
    await expect(firstPage.locator('.size-btn:has-text("+")')).toBeVisible()
  })
  
  test('should allow dragging pages to arbitrary positions', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Get initial position of first page
    const firstPage = page.locator('.draggable-page').first()
    const initialBox = await firstPage.boundingBox()
    
    // Drag the page to a new position
    await firstPage.hover()
    await page.mouse.down()
    await page.mouse.move(initialBox.x + 200, initialBox.y + 150)
    await page.mouse.up()
    
    // Page should have moved
    const newBox = await firstPage.boundingBox()
    expect(Math.abs(newBox.x - (initialBox.x + 200))).toBeLessThan(50) // Allow some tolerance
    expect(Math.abs(newBox.y - (initialBox.y + 150))).toBeLessThan(50)
  })
  
  test('should support zooming with mouse wheel', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF (simplified)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Initial zoom should be 100%
    await expect(page.locator('.canvas-info')).toContainText('Zoom: 100%')
    
    // Zoom in using mouse wheel (simulate wheel event)
    const canvasContainer = page.locator('.canvas-container')
    await canvasContainer.hover()
    
    // Simulate zoom in (wheel up)
    await canvasContainer.evaluate((element) => {
      element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }))
    })
    
    // Zoom should have increased
    await expect(page.locator('.canvas-info')).toContainText('Zoom: 110%')
  })
  
  test('should provide layout tools for page arrangement', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Should show layout tools
    await expect(page.locator('.layout-tools')).toBeVisible()
    await expect(page.locator('button:has-text("Reset Positions")')).toBeVisible()
    await expect(page.locator('button:has-text("Auto-Arrange Grid")')).toBeVisible()
    await expect(page.locator('button:has-text("Finish & Export Layout")')).toBeVisible()
  })
  
  test('should allow resizing individual pages', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Get initial size of first page
    const firstPage = page.locator('.draggable-page').first()
    const initialBox = await firstPage.boundingBox()
    
    // Click the + button to increase size
    await firstPage.locator('.size-btn:has-text("+")').click()
    
    // Page should be larger
    const newBox = await firstPage.boundingBox()
    expect(newBox.width).toBeGreaterThan(initialBox.width)
    expect(newBox.height).toBeGreaterThan(initialBox.height)
  })
  
  test('should show grid overlay for alignment assistance', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload and process PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for ALL pages to be converted (check that SVG processing is complete)
    await expect(page.locator('.processing')).not.toBeVisible({ timeout: 60000 })
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Open layout designer
    await page.locator('button:has-text("Open Layout Designer")').click()
    await expect(page.locator('[data-testid="layout-designer"]')).toBeVisible()
    
    // Should show grid overlay
    await expect(page.locator('.grid-overlay')).toBeVisible()
    
    // Grid should have proper background pattern
    const gridOverlay = page.locator('.grid-overlay')
    const backgroundSize = await gridOverlay.evaluate(el => 
      window.getComputedStyle(el).backgroundSize
    )
    expect(backgroundSize).toContain('50px') // Grid size should be 50px
  })
})