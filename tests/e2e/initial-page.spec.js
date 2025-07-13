import { test, expect } from '@playwright/test'

test.describe('Initial Page', () => {
  test('should display the main heading', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('h1')).toContainText('Sewing Pattern Reconstruction')
  })
  
  test('should have correct page title', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveTitle('Sewing Pattern Reconstruction')
  })

  test('should have a file upload input for PDF patterns', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('input[type="file"]')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveAttribute('accept', '.pdf')
  })

  test('should upload PDF and display SVG table with pattern pages', async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`))
    page.on('pageerror', err => console.log(`Browser error: ${err.message}`))
    
    await page.goto('/')
    
    // Upload the test PDF file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/patterns/menspajamashortsfinal_aiid2146907_page18to37.pdf')
    
    // Should show page controls after upload
    await expect(page.locator('.page-controls')).toBeVisible()
    
    // Should detect correct page range
    await expect(page.locator('input[type="number"]').first()).toHaveValue('18')
    await expect(page.locator('input[type="number"]').last()).toHaveValue('37')
    
    // Click extract pages button
    console.log('Clicking Extract Pages button...')
    await page.locator('button:has-text("Extract Pages")').click()
    
    // Wait for extraction to complete - processing might be too fast to see indicator
    // Just wait for the Convert to SVG button to appear
    await expect(page.locator('button:has-text("Convert to SVG")')).toBeVisible({ timeout: 30000 })
    
    // Click convert to SVG button
    console.log('Clicking Convert to SVG button...')
    await page.locator('button:has-text("Convert to SVG")').click()
    
    // Wait for SVG conversion to complete and pages table to appear
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({ timeout: 60000 })
    
    // Should display multiple pages in a responsive grid
    const pageItems = page.locator('[data-testid="page-item"]')
    await expect(pageItems).toHaveCount(20) // 20 pages from our test PDF
    
    // Each page should have SVG content (SVGs are shown by default)
    const firstPageSvg = pageItems.first().locator('svg')
    await expect(firstPageSvg).toBeVisible()
    
    // Should have page number labels
    await expect(pageItems.first().locator('[data-testid="page-number"]')).toContainText('18')
    await expect(pageItems.last().locator('[data-testid="page-number"]')).toContainText('37')
    
    // Test toggles
    await expect(page.getByRole('checkbox', { name: 'Show Bitmaps' })).not.toBeChecked() // Show Bitmaps off
    await expect(page.getByRole('checkbox', { name: 'Show SVGs' })).toBeChecked() // Show SVGs on
  })
})