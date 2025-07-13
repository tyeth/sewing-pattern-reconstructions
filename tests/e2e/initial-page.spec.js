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
})