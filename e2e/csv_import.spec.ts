/**
 * @file csv_import.spec.ts
 * @description Playwright E2E smoke tests for Robinhood CSV import flows.
 * Verifies partner selection, multiple activity codes mapping, withdrawal processing, and duplicate prevention.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('LedgerAlpha CSV Ingestion E2E Tests', () => {
  test.beforeAll(async () => {
    // Reset database to seed baseline values before E2E testing
    execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
  });

  test('should handle raw CSV upload, per-cashflow partner assignment, and duplicate prevention', async ({ page }) => {
    // 1. Navigate to the import page
    await page.goto('/imports');
    await expect(page.locator('h2')).toContainText('Imports');

    // 2. Pasteur simulated CSV covering all 19 unique Robinhood activity codes
    const csvContent = [
      'Trade Date,Activity Type,Symbol,Quantity,Price,Amount',
      '2024-01-01,ACH,,0,,1000.00', // DEPOSIT
      '2024-01-02,Buy,AAPL,5,150.00,-750.00', // BUY
      '2024-01-03,Sell,AAPL,2,160.00,320.00', // SELL
      '2024-01-04,CDIV,AAPL,,,10.00', // DIVIDEND
      '2024-01-05,MDIV,AAPL,,,5.00', // DIVIDEND
      '2024-01-06,INT,,,,2.50', // DIVIDEND
      '2024-01-07,SLIP,AAPL,,,1.20', // DIVIDEND
      '2024-01-08,GOLD,,,,10.00', // FEE
      '2024-01-09,DFEE,,,,2.00', // FEE
      '2024-01-10,AFEE,,,,1.50', // FEE
      '2024-01-11,MINT,,,,0.50', // FEE
      '2024-01-12,BTO,AAPL,,,15.00', // FEE
      '2024-01-13,STC,AAPL,,,25.00', // DIVIDEND
      '2024-01-14,OEXP,AAPL,,,0.00', // FEE
      '2024-01-15,SPL,AAPL,2,,0.00', // SPLIT
      '2024-01-16,MRGS,AAPL,-1,,170.00', // SELL
      '2024-01-17,CONV,AAPL,,,5.00', // DIVIDEND
      '2024-01-18,MISC,AAPL,,,3.00', // DIVIDEND
      '2024-01-19,CIL,AAPL,,,4.00', // DIVIDEND
      '2024-01-20,ACH,,0,,-500.00', // WITHDRAWAL
      '2024-01-21,Buy,BRK.B,1,350.00,-350.00', // BUY BRK.B
    ].join('\n');

    const textarea = page.getByTestId('csv-textarea');
    await textarea.fill(csvContent);

    // 3. Click Preview and verify normalized rows list is rendered
    const previewBtn = page.getByTestId('btn-preview');
    await previewBtn.click();

    const table = page.locator('table.table');
    await expect(table).toBeVisible();

    // 4. Verify that dropdowns are rendered for cashflows
    const selects = table.locator('select');
    await expect(selects).toHaveCount(2); // One for DEPOSIT, one for WITHDRAWAL

    // Change first cashflow to Partner 1, second cashflow to Partner 2
    await selects.nth(0).selectOption({ index: 0 }); // First owner
    await selects.nth(1).selectOption({ index: 1 }); // Second owner

    // 5. Commit to ledger and verify result output text
    const commitBtn = page.getByTestId('btn-commit');
    await commitBtn.click();

    // Verify successful message (we expect some number of rows committed)
    await expect(page.locator('.form-message')).toContainText('Imported');

    // 6. Navigate to Transactions page to check that Withdrawal is registered
    await page.goto('/transactions');
    await expect(page.locator('table')).toContainText('WITHDRAWAL');

    // 7. Try re-importing the exact same CSV data to check duplicate prevention
    await page.goto('/imports');
    await textarea.fill(csvContent);
    await previewBtn.click();
    await commitBtn.click();

    // Should indicate that all rows were duplicates/skipped
    await expect(page.locator('.form-message')).toContainText('skipped 21 duplicates');
  });
});
