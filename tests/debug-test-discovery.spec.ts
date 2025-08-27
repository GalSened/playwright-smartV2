import { test, expect } from '@playwright/test';

test.describe('Debug Test Discovery', () => {
  test('should show console logs for test discovery', async ({ page }) => {
    // Navigate to Test Bank page and capture console logs
    page.on('console', (msg) => {
      console.log(`BROWSER LOG: ${msg.type()}: ${msg.text()}`);
    });

    await page.goto('http://localhost:5177/test-bank');
    
    // Wait for page to load and API calls to complete
    await page.waitForTimeout(3000);
    
    // Just check that the page loaded
    expect(page.url()).toContain('/test-bank');
  });
});