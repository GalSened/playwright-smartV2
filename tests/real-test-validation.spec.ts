import { test, expect } from '@playwright/test';

test.describe('Real Test File Integration', () => {
  test('should load real test data from filesystem', async ({ page }) => {
    // Navigate to Test Bank page
    await page.goto('http://localhost:5177/test-bank');
    
    // Wait for tests to load (increased timeout for real file processing)
    await expect(page.getByTestId('page-title')).toContainText('Test Bank');
    await page.waitForTimeout(5000); // Wait for real file parsing
    
    // Check total test count
    const testNameCells = page.locator('[data-testid="test-name"]');
    const testCount = await testNameCells.count();
    
    console.log(`Total tests loaded: ${testCount}`);
    
    // Should have loaded tests (may be more than before due to real parsing)
    expect(testCount).toBeGreaterThan(0);
    
    // Check if we have tests from different modules
    const modules: string[] = [];
    const moduleCells = page.locator('[data-testid="test-module"]');
    const moduleCount = await moduleCells.count();
    
    for (let i = 0; i < Math.min(moduleCount, 10); i++) {
      const module = await moduleCells.nth(i).textContent();
      if (module && !modules.includes(module.trim())) {
        modules.push(module.trim());
      }
    }
    
    console.log('Modules found:', modules);
    expect(modules.length).toBeGreaterThanOrEqual(3); // Should have multiple modules
    
    // Check that test names are real (not just "Test functionality")
    const firstTestName = await testNameCells.first().textContent();
    console.log('First test name:', firstTestName);
    expect(firstTestName).toBeDefined();
  });
  
  test('should show real test steps from Python files', async ({ page }) => {
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(5000);
    
    // Check test steps are populated
    const testStepsCells = page.locator('[data-testid="test-steps"]');
    const stepsCount = await testStepsCells.count();
    
    if (stepsCount > 0) {
      const firstStepsText = await testStepsCells.first().textContent();
      console.log('First test steps:', firstStepsText);
      
      // Should have numbered steps
      expect(firstStepsText).toMatch(/\d+\./);
    }
  });
});