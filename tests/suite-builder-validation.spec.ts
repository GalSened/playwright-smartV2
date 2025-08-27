import { test, expect } from '@playwright/test';

test.describe('Suite Builder Validation', () => {
  test('should create test suite with execution options', async ({ page }) => {
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(2000);
    
    // Select a few tests for the suite
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    // Select first 3 tests
    for (let i = 0; i < Math.min(3, checkboxCount); i++) {
      await checkboxes.nth(i).check();
    }
    
    await page.waitForTimeout(500);
    
    // Verify suite builder shows selected tests
    const selectedCount = page.locator('text="3 tests selected"');
    await expect(selectedCount).toBeVisible();
    
    // Check execution options are available
    const headedOption = page.locator('text="Headed"');
    const headlessOption = page.locator('text="Headless"');
    const parallelOption = page.locator('text="Parallel"');
    const sequentialOption = page.locator('text="Sequential"');
    
    await expect(headedOption).toBeVisible();
    await expect(headlessOption).toBeVisible();
    await expect(parallelOption).toBeVisible();
    await expect(sequentialOption).toBeVisible();
    
    // Test retry options
    const retrySelect = page.locator('select').filter({ hasText: '1' });
    await expect(retrySelect).toBeVisible();
  });
  
  test('should maintain test integrity across all pages', async ({ page }) => {
    // Test Dashboard
    await page.goto('http://localhost:5177/');
    await expect(page.getByTestId('page-title')).toContainText('Dashboard');
    
    // Test Test Bank
    await page.goto('http://localhost:5177/test-bank');
    await expect(page.getByTestId('page-title')).toContainText('Test Bank');
    const testCount = await page.locator('[data-testid="test-name"]').count();
    expect(testCount).toBe(28);
    
    // Test Reports
    await page.goto('http://localhost:5177/reports');
    await expect(page.getByTestId('page-title')).toContainText('Reports');
    
    // Test Analytics
    await page.goto('http://localhost:5177/analytics');
    await expect(page.getByTestId('page-title')).toContainText('Analytics');
    
    // Navigate back to test bank and verify tests still there
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(2000);
    const finalTestCount = await page.locator('[data-testid="test-name"]').count();
    expect(finalTestCount).toBe(28);
  });
});