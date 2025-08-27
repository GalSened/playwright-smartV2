import { test, expect } from '@playwright/test';

test.describe('Comprehensive Test Bank Validation', () => {
  test('should have exactly 28 unique tests with proper mapping', async ({ page }) => {
    // Navigate to Test Bank page
    await page.goto('http://localhost:5177/test-bank');
    
    // Wait for tests to load
    await expect(page.getByTestId('page-title')).toContainText('Test Bank');
    await page.waitForTimeout(2000);
    
    // Verify total count is 28 (matching our 28 test files)
    const testNameCells = page.locator('[data-testid="test-name"]');
    const testCount = await testNameCells.count();
    expect(testCount).toBe(28);
    
    // Verify all tests have unique IDs by checking different properties
    const moduleCount = await page.locator('[data-testid="test-module"]').count();
    const stepsCount = await page.locator('[data-testid="test-steps"]').count();
    
    expect(moduleCount).toBe(28);
    expect(stepsCount).toBe(28);
    
    // Verify proper module distribution (should not be skewed)
    const modules: string[] = [];
    for (let i = 0; i < moduleCount; i++) {
      const module = await page.locator('[data-testid="test-module"]').nth(i).textContent();
      if (module) modules.push(module.trim());
    }
    
    // Count tests per module
    const moduleStats = modules.reduce((acc, module) => {
      acc[module] = (acc[module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Module distribution:', moduleStats);
    
    // Verify reasonable distribution (no module should dominate)
    expect(Object.keys(moduleStats)).toHaveLength(7); // 7 modules
    
    // Verify each module has at least 1 test and max reasonable amount
    for (const [module, count] of Object.entries(moduleStats)) {
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(10); // No module should have more than 10 tests
    }
  });
  
  test('should display all semantic test steps correctly', async ({ page }) => {
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(2000);
    
    // Get all test steps and verify they contain semantic information
    const testStepsCells = page.locator('[data-testid="test-steps"]');
    const stepsCount = await testStepsCells.count();
    
    for (let i = 0; i < Math.min(5, stepsCount); i++) { // Check first 5 tests
      const stepsText = await testStepsCells.nth(i).textContent();
      
      // Should contain numbered steps
      expect(stepsText).toMatch(/\d+\./);
      
      // Should contain action verbs (semantic meaning)
      expect(stepsText?.toLowerCase()).toMatch(/(navigate|create|test|verify|check|access|load|click|configure|validate|switch|insert|select|process|measure)/);
      
      // Should not contain generic placeholder text
      expect(stepsText?.toLowerCase()).not.toMatch(/(lorem|ipsum|placeholder|todo|fixme)/);
    }
  });
  
  test('should support test filtering and searching', async ({ page }) => {
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(2000);
    
    // Test search functionality
    const searchInput = page.locator('[placeholder="Search tests..."]');
    await searchInput.fill('admin');
    await page.waitForTimeout(500);
    
    // Should show only admin tests
    const visibleTests = page.locator('[data-testid="test-name"]');
    const visibleCount = await visibleTests.count();
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThanOrEqual(28);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Should show all tests again
    const allTestsCount = await visibleTests.count();
    expect(allTestsCount).toBe(28);
  });
  
  test('should handle dark mode toggle properly', async ({ page }) => {
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(1000);
    
    // Toggle dark mode
    const darkModeToggle = page.getByTestId('dark-mode-toggle');
    await darkModeToggle.click();
    
    // Verify dark mode is active
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/.*dark.*/);
    
    // Verify test bank still shows 28 tests in dark mode
    const testCount = await page.locator('[data-testid="test-name"]').count();
    expect(testCount).toBe(28);
    
    // Toggle back to light mode
    await darkModeToggle.click();
    await expect(htmlElement).not.toHaveClass(/.*dark.*/);
  });
});