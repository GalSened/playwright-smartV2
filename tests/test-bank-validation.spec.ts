import { test, expect } from '@playwright/test';

test.describe('Test Bank Validation', () => {
  test('should not have duplicate tests', async ({ page }) => {
    // Navigate to Test Bank page
    await page.goto('http://localhost:5177/test-bank');
    
    // Wait for tests to load
    await expect(page.getByTestId('page-title')).toContainText('Test Bank');
    await page.waitForTimeout(2000); // Wait for API call to complete
    
    // Get all test names from the table
    const testNameCells = page.locator('[data-testid="test-name"]');
    const testNamesCount = await testNameCells.count();
    
    console.log(`Total tests found: ${testNamesCount}`);
    
    // Collect all test names
    const testNames: string[] = [];
    for (let i = 0; i < testNamesCount; i++) {
      const testName = await testNameCells.nth(i).textContent();
      if (testName) {
        testNames.push(testName.trim());
      }
    }
    
    console.log('Test names:', testNames);
    
    // Check for duplicates
    const uniqueTestNames = [...new Set(testNames)];
    const duplicates = testNames.filter((name, index) => testNames.indexOf(name) !== index);
    
    console.log(`Unique tests: ${uniqueTestNames.length}`);
    console.log(`Total tests: ${testNames.length}`);
    if (duplicates.length > 0) {
      console.log('Duplicates found:', duplicates);
    }
    
    // Assert no duplicates
    expect(duplicates).toHaveLength(0);
    expect(testNames.length).toBe(uniqueTestNames.length);
  });
  
  test('should validate test coverage across modules', async ({ page }) => {
    // Navigate to Test Bank page
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(2000);
    
    // Get all module types
    const moduleCells = page.locator('[data-testid="test-module"]');
    const moduleCount = await moduleCells.count();
    
    const modules: string[] = [];
    for (let i = 0; i < moduleCount; i++) {
      const module = await moduleCells.nth(i).textContent();
      if (module) {
        modules.push(module.trim());
      }
    }
    
    const uniqueModules = [...new Set(modules)];
    console.log('Modules covered:', uniqueModules);
    
    // Verify we have coverage across expected modules
    const expectedModules = ['admin', 'auth', 'contacts', 'documents', 'dashboard', 'integrations', 'templates'];
    for (const expectedModule of expectedModules) {
      expect(uniqueModules).toContain(expectedModule);
    }
  });
  
  test('should display semantic test steps', async ({ page }) => {
    // Navigate to Test Bank page
    await page.goto('http://localhost:5177/test-bank');
    await page.waitForTimeout(2000);
    
    // Get all test steps
    const testStepsCells = page.locator('[data-testid="test-steps"]');
    const stepsCount = await testStepsCells.count();
    
    // Verify at least one test has steps
    expect(stepsCount).toBeGreaterThan(0);
    
    // Check that steps contain semantic information (not just tags)
    const firstStepsCell = testStepsCells.first();
    const stepsText = await firstStepsCell.textContent();
    
    // Should contain numbered steps with action verbs
    expect(stepsText).toMatch(/\d+\./); // Should have numbered steps
    expect(stepsText?.toLowerCase()).toMatch(/(navigate|create|set|validate|test|verify|check|click)/); // Should have action verbs
  });
});