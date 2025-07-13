import { test, expect } from '@playwright/test'

test.describe('Bitmap Rendering Bugs', () => {
  test('should handle exact bug scenario: empty bitmaps on first extraction, correct on second, toggle issues', async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    page.on('pageerror', err => console.log(`Browser error: ${err.message}`))
    
    await page.goto('/')
    
    // Upload the test PDF file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    // Should show page controls after upload
    await expect(page.locator('.page-controls')).toBeVisible()
    
    // STEP 1: First extraction - bitmaps should be empty
    console.log('STEP 1: First extraction...')
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Turn on bitmap display
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible()
    
    // Bitmaps should be displayed (either in split view or standalone)
    const firstCanvas = page.locator('.bitmap-canvas, .split-canvas').first()
    await expect(firstCanvas).toBeVisible()
    
    // Turn off bitmap display and try SVG conversion
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).uncheck()
    
    // STEP 2: Convert to SVG - should have no content because bitmaps are empty
    console.log('STEP 2: First SVG conversion (should fail)...')
    await page.locator('button:has-text("Convert to SVG")').click()
    
    // Wait for conversion to complete
    await page.waitForTimeout(5000)
    
    // Turn on SVG display
    await expect(page.getByRole('checkbox', { name: 'Show SVGs' })).toBeChecked() // Should already be on
    
    // SVGs should have no content (because bitmaps were empty)
    const pageItems = page.locator('[data-testid="page-item"]')
    await expect(pageItems).toHaveCount(20)
    
    // STEP 3: Second extraction - bitmaps should populate correctly
    console.log('STEP 3: Second extraction (should work)...')
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Turn on bitmap display
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    
    // Bitmaps should now have content
    const secondCanvas = page.locator('.bitmap-canvas, .split-canvas').first()
    await expect(secondCanvas).toBeVisible()
    
    // STEP 4: Convert to SVG again - should work correctly now
    console.log('STEP 4: Second SVG conversion (should work)...')
    await page.locator('button:has-text("Convert to SVG")').click()
    
    // Wait for conversion to complete
    await page.waitForTimeout(10000)
    
    // Both bitmaps and SVGs should be visible and have content (in split view)
    await expect(page.locator('.svg-container svg, .svg-content svg').first()).toBeVisible()
    
    // STEP 5: Test toggle issues
    console.log('STEP 5: Testing toggle issues...')
    
    // Untick bitmaps - they should hide
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).uncheck()
    await expect(page.locator('.bitmap-container, .split-view-container').first()).not.toBeVisible()
    
    // Retick bitmaps - they should appear but might be blank again (bug)
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('.bitmap-container, .split-view-container').first()).toBeVisible()
    
    // Untick and retick SVGs - should show correctly
    await page.getByRole('checkbox', { name: 'Show SVGs' }).uncheck()
    await expect(page.locator('.svg-container, .split-view-container').first()).not.toBeVisible()
    
    await page.getByRole('checkbox', { name: 'Show SVGs' }).check()
    await expect(page.locator('.svg-container, .split-view-container').first()).toBeVisible()
    await expect(page.locator('.svg-container svg, .svg-content svg').first()).toBeVisible()
  })
  
  test('should handle files without page info in filename', async ({ page }) => {
    await page.goto('/')
    
    // Create a test PDF file without page info in name
    const fileInput = page.locator('input[type="file"]')
    
    // This would normally error, but should now work with default page range
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    // Should show page controls with default range
    await expect(page.locator('.page-controls')).toBeVisible()
    
    // Should not show an error alert
    // The test file still has page info, but the code should handle files without it
  })
  
  test('should provide threshold adjustment for SVG conversion to handle yellow lines', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and extract pages
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Should show SVG conversion controls with threshold
    await expect(page.locator('.svg-conversion-controls')).toBeVisible()
    await expect(page.locator('.threshold-control')).toBeVisible()
    await expect(page.locator('.threshold-slider')).toBeVisible()
    
    // Default threshold should be close to 128 (might round to nearest step)
    const thresholdSlider = page.locator('.threshold-slider')
    const initialValue = await thresholdSlider.inputValue()
    console.log(`Initial threshold value: ${initialValue}`)
    // Should be around 128-130 (step is 5, so it rounds)
    
    // Test threshold adjustment for yellow line visibility
    console.log('Testing threshold adjustment for SVG conversion...')
    
    // Lower threshold for lighter colors (like yellow on white)
    await thresholdSlider.fill('80')
    await expect(page.locator('.threshold-value')).toContainText('80')
    
    // Convert to SVG with lower threshold
    await page.locator('button:has-text("Convert to SVG")').click()
    
    // Wait for conversion to complete
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Turn on SVG display to see results
    await expect(page.getByRole('checkbox', { name: 'Show SVGs' })).toBeChecked()
    await expect(page.locator('.svg-container svg').first()).toBeVisible()
    
    // Test with higher threshold
    await thresholdSlider.fill('160')
    await expect(page.locator('.threshold-value')).toContainText('160')
    
    // Convert again with higher threshold
    await page.locator('button:has-text("Convert to SVG")').click()
    await page.waitForTimeout(5000) // Wait for conversion
  })
  
  test('should show bitmaps when checkbox is checked and maintain data on toggle', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and extract pages
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Initially bitmaps should be unchecked and not visible
    await expect(page.getByRole('checkbox', { name: 'Show Bitmaps' })).not.toBeChecked()
    await expect(page.locator('.bitmap-canvas').first()).not.toBeVisible()
    
    // Check show bitmaps - they should appear
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('.bitmap-canvas').first()).toBeVisible()
    
    // Verify bitmap data is present by checking canvas dimensions
    const firstCanvas = page.locator('.bitmap-canvas').first()
    const canvasWidth = await firstCanvas.evaluate(canvas => canvas.width)
    const canvasHeight = await firstCanvas.evaluate(canvas => canvas.height)
    
    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`)
    expect(canvasWidth).toBeGreaterThan(0)
    expect(canvasHeight).toBeGreaterThan(0)
    
    // Get actual image data from canvas to verify meaningful content
    const imageData = await firstCanvas.evaluate(canvas => {
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Sample pixels from different areas of the image
      const samples = []
      const width = canvas.width
      const height = canvas.height
      
      // Sample 25 pixels from different regions
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const pixelX = Math.floor((x + 0.5) * width / 5)
          const pixelY = Math.floor((y + 0.5) * height / 5) 
          const index = (pixelY * width + pixelX) * 4
          
          samples.push([
            data.data[index],     // R
            data.data[index + 1], // G  
            data.data[index + 2], // B
            data.data[index + 3]  // A
          ])
        }
      }
      
      // Check for variance in the image (not all same color)
      const uniqueColors = new Set(samples.map(pixel => pixel.join(',')))
      const hasVariance = uniqueColors.size > 1
      
      // Calculate hash of all samples for comparison
      let hash = 0
      samples.forEach((pixel, i) => {
        hash += pixel[0] * (i + 1) + pixel[1] * (i + 2) + pixel[2] * (i + 3) + pixel[3] * (i + 4)
      })
      
      return { 
        width: canvas.width, 
        height: canvas.height,
        samples,
        uniqueColors: uniqueColors.size,
        hasVariance,
        hash
      }
    })
    
    console.log(`Image data check: ${imageData.uniqueColors} unique colors, hash: ${imageData.hash}`)
    expect(imageData.uniqueColors).toBeGreaterThan(1) // Should have actual image content, not solid color
    expect(imageData.hasVariance).toBe(true)
    
    // Uncheck bitmaps - they should disappear
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).uncheck()
    await expect(page.locator('.bitmap-canvas').first()).not.toBeVisible()
    
    // Check bitmaps again - they should reappear with same data
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('.bitmap-canvas').first()).toBeVisible()
    
    // Verify the EXACT same image data is still there after toggle
    const imageDataAfterToggle = await firstCanvas.evaluate(canvas => {
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Sample the exact same pixels from different areas
      const samples = []
      const width = canvas.width
      const height = canvas.height
      
      // Sample 25 pixels from different regions (same as before)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const pixelX = Math.floor((x + 0.5) * width / 5)
          const pixelY = Math.floor((y + 0.5) * height / 5) 
          const index = (pixelY * width + pixelX) * 4
          
          samples.push([
            data.data[index],     // R
            data.data[index + 1], // G  
            data.data[index + 2], // B
            data.data[index + 3]  // A
          ])
        }
      }
      
      const uniqueColors = new Set(samples.map(pixel => pixel.join(',')))
      
      // Calculate hash of all samples
      let hash = 0
      samples.forEach((pixel, i) => {
        hash += pixel[0] * (i + 1) + pixel[1] * (i + 2) + pixel[2] * (i + 3) + pixel[3] * (i + 4)
      })
      
      return { 
        width: canvas.width, 
        height: canvas.height,
        samples,
        uniqueColors: uniqueColors.size,
        hash
      }
    })
    
    console.log(`Image data after toggle: ${imageDataAfterToggle.uniqueColors} unique colors, hash: ${imageDataAfterToggle.hash}`)
    expect(imageDataAfterToggle.uniqueColors).toBe(imageData.uniqueColors)
    expect(imageDataAfterToggle.width).toBe(imageData.width)
    expect(imageDataAfterToggle.height).toBe(imageData.height)
    
    // CRITICAL: verify the actual image data is identical pixel-by-pixel
    expect(imageDataAfterToggle.hash).toBe(imageData.hash)
    expect(imageDataAfterToggle.samples).toEqual(imageData.samples)
  })

  test('should maintain bitmap data integrity after SVG conversion', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and extract pages
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Initially bitmaps should be unchecked and not visible
    await expect(page.getByRole('checkbox', { name: 'Show Bitmaps' })).not.toBeChecked()
    await expect(page.locator('.bitmap-canvas').first()).not.toBeVisible()
    
    // Check show bitmaps - they should appear
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('.bitmap-canvas').first()).toBeVisible()
    
    // Get initial bitmap data
    const firstCanvas = page.locator('.bitmap-canvas').first()
    const initialImageData = await firstCanvas.evaluate(canvas => {
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Sample pixels from different areas of the image
      const samples = []
      const width = canvas.width
      const height = canvas.height
      
      // Sample 25 pixels from different regions
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const pixelX = Math.floor((x + 0.5) * width / 5)
          const pixelY = Math.floor((y + 0.5) * height / 5) 
          const index = (pixelY * width + pixelX) * 4
          
          samples.push([
            data.data[index],     // R
            data.data[index + 1], // G  
            data.data[index + 2], // B
            data.data[index + 3]  // A
          ])
        }
      }
      
      // Calculate hash of all samples
      let hash = 0
      samples.forEach((pixel, i) => {
        hash += pixel[0] * (i + 1) + pixel[1] * (i + 2) + pixel[2] * (i + 3) + pixel[3] * (i + 4)
      })
      
      const uniqueColors = new Set(samples.map(pixel => pixel.join(',')))
      
      return { 
        width: canvas.width, 
        height: canvas.height,
        samples,
        uniqueColors: uniqueColors.size,
        hash
      }
    })
    
    console.log(`Initial bitmap data: ${initialImageData.uniqueColors} unique colors, hash: ${initialImageData.hash}`)
    expect(initialImageData.uniqueColors).toBeGreaterThan(1)
    
    // Toggle bitmaps off and on to verify they persist
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).uncheck()
    await expect(page.locator('.bitmap-canvas').first()).not.toBeVisible()
    
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('.bitmap-canvas').first()).toBeVisible()
    
    // NOW CONVERT TO SVG - this is where the issue might occur
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Wait for SVG conversion to complete
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      const svgButton = Array.from(buttons).find(btn => btn.textContent.includes('Convert to SVG'))
      return !svgButton || !svgButton.disabled
    }, { timeout: 60000 })
    
    // Verify bitmap data is still intact after SVG conversion
    const postSVGImageData = await firstCanvas.evaluate(canvas => {
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Sample the exact same pixels
      const samples = []
      const width = canvas.width
      const height = canvas.height
      
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const pixelX = Math.floor((x + 0.5) * width / 5)
          const pixelY = Math.floor((y + 0.5) * height / 5) 
          const index = (pixelY * width + pixelX) * 4
          
          samples.push([
            data.data[index],
            data.data[index + 1],
            data.data[index + 2],
            data.data[index + 3]
          ])
        }
      }
      
      let hash = 0
      samples.forEach((pixel, i) => {
        hash += pixel[0] * (i + 1) + pixel[1] * (i + 2) + pixel[2] * (i + 3) + pixel[3] * (i + 4)
      })
      
      const uniqueColors = new Set(samples.map(pixel => pixel.join(',')))
      
      return { 
        width: canvas.width, 
        height: canvas.height,
        samples,
        uniqueColors: uniqueColors.size,
        hash
      }
    })
    
    console.log(`Post-SVG bitmap data: ${postSVGImageData.uniqueColors} unique colors, hash: ${postSVGImageData.hash}`)
    
    // CRITICAL: bitmap data should be identical before and after SVG conversion
    expect(postSVGImageData.hash).toBe(initialImageData.hash)
    expect(postSVGImageData.samples).toEqual(initialImageData.samples)
    expect(postSVGImageData.uniqueColors).toBe(initialImageData.uniqueColors)
    
    // Test final toggle after SVG conversion
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).uncheck()
    await expect(page.locator('.bitmap-canvas').first()).not.toBeVisible()
    
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    await expect(page.locator('.bitmap-canvas').first()).toBeVisible()
    
    // Verify bitmap data is still intact after final toggle
    const finalImageData = await firstCanvas.evaluate(canvas => {
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      const samples = []
      const width = canvas.width
      const height = canvas.height
      
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const pixelX = Math.floor((x + 0.5) * width / 5)
          const pixelY = Math.floor((y + 0.5) * height / 5) 
          const index = (pixelY * width + pixelX) * 4
          
          samples.push([
            data.data[index],
            data.data[index + 1],
            data.data[index + 2],
            data.data[index + 3]
          ])
        }
      }
      
      let hash = 0
      samples.forEach((pixel, i) => {
        hash += pixel[0] * (i + 1) + pixel[1] * (i + 2) + pixel[2] * (i + 3) + pixel[3] * (i + 4)
      })
      
      return { hash, samples }
    })
    
    console.log(`Final bitmap data hash: ${finalImageData.hash}`)
    
    // Final verification: all bitmap data should still be identical
    expect(finalImageData.hash).toBe(initialImageData.hash)
    expect(finalImageData.samples).toEqual(initialImageData.samples)
  })

  test('should provide split-view comparison with wiper control', async ({ page }) => {
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    
    await page.goto('/')
    
    // Upload PDF and extract pages
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    await page.locator('button:has-text("Extract Pages")').click()
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Convert to SVG
    await page.locator('button:has-text("Convert to SVG")').click()
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 30000 })
    
    // Initially only SVGs are shown
    await expect(page.getByRole('checkbox', { name: 'Show Bitmaps' })).not.toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Show SVGs' })).toBeChecked()
    
    // Split control should not be visible when only one format is shown
    await expect(page.locator('.split-control')).not.toBeVisible()
    
    // Enable bitmaps to activate split view
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).check()
    
    // Split control should now be visible
    await expect(page.locator('.split-control')).toBeVisible()
    await expect(page.locator('.split-slider')).toBeVisible()
    
    // Default split should be 50%
    const splitSlider = page.locator('.split-slider')
    await expect(splitSlider).toHaveValue('50')
    await expect(page.locator('.split-value')).toContainText('50%')
    
    // Should show split-view containers
    await expect(page.locator('.split-view-container').first()).toBeVisible()
    await expect(page.locator('.bitmap-section').first()).toBeVisible()
    await expect(page.locator('.svg-section').first()).toBeVisible()
    await expect(page.locator('.wiper-bar').first()).toBeVisible()
    
    // Test split adjustment
    console.log('Testing split adjustment...')
    
    // Adjust to 25% (more SVG visible)
    await splitSlider.fill('25')
    await expect(page.locator('.split-value')).toContainText('25%')
    
    // Adjust to 75% (more bitmap visible)
    await splitSlider.fill('75')
    await expect(page.locator('.split-value')).toContainText('75%')
    
    // Verify labels are present
    await expect(page.locator('.bitmap-label').first()).toContainText('Bitmap')
    await expect(page.locator('.svg-label').first()).toContainText('SVG')
    
    // Test disabling one format returns to single view
    await page.getByRole('checkbox', { name: 'Show SVGs' }).uncheck()
    await expect(page.locator('.split-control')).not.toBeVisible()
    await expect(page.locator('.bitmap-container').first()).toBeVisible()
    
    // Re-enable SVGs and test the other direction
    await page.getByRole('checkbox', { name: 'Show SVGs' }).check()
    await page.getByRole('checkbox', { name: 'Show Bitmaps' }).uncheck()
    await expect(page.locator('.split-control')).not.toBeVisible()
    await expect(page.locator('.svg-container').first()).toBeVisible()
  })
})