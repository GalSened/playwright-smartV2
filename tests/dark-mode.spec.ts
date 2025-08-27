import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('should toggle dark mode', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5177');
    
    // Wait for the page to load
    await expect(page.locator('h1:has-text("Playwright Smart")')).toBeVisible();
    
    // Find the dark mode toggle button
    const darkModeToggle = page.getByTestId('dark-mode-toggle');
    await expect(darkModeToggle).toBeVisible();
    
    // Check initial theme (should be light by default)
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/.*dark.*/);
    
    // Click the dark mode toggle
    await darkModeToggle.click();
    
    // Wait for theme to change and verify dark mode is active
    await expect(htmlElement).toHaveClass(/.*dark.*/);
    
    // Click again to toggle back to light mode
    await darkModeToggle.click();
    
    // Verify light mode is active
    await expect(htmlElement).not.toHaveClass(/.*dark.*/);
  });
  
  test('should persist theme preference', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5177');
    
    // Toggle to dark mode
    const darkModeToggle = page.getByTestId('dark-mode-toggle');
    await darkModeToggle.click();
    
    // Verify dark mode is active
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/.*dark.*/);
    
    // Refresh the page
    await page.reload();
    
    // Verify dark mode is still active after refresh
    await expect(htmlElement).toHaveClass(/.*dark.*/);
  });
});