import { test, expect } from '@playwright/test'

test('debug layout controls state', async ({ page }) => {
  page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
  
  await page.goto('/')
  
  // Upload PDF and extract pages
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
  
  await page.locator('button:has-text("Extract Pages")').click()
  await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'debug-before-svg.png', fullPage: true })
  
  // Log all elements with class names containing 'control'
  const controls = await page.$$eval('[class*="control"]', elements => 
    elements.map(el => ({ 
      className: el.className, 
      tagName: el.tagName,
      textContent: el.textContent?.slice(0, 50) 
    }))
  )
  console.log('Found control elements:', controls)
  
  // Check if .column-layout-controls exists
  const columnControls = await page.locator('.column-layout-controls').count()
  console.log('Column layout controls count:', columnControls)
  
  // Check all elements in svg-conversion-controls
  const svgControls = await page.locator('.svg-conversion-controls').innerHTML()
  console.log('SVG conversion controls HTML:', svgControls)
  
  // List all visible elements 
  const allVisible = await page.$$eval('*:visible', elements => 
    elements.slice(0, 20).map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.textContent?.slice(0, 30)
    }))
  )
  console.log('First 20 visible elements:', allVisible)
})