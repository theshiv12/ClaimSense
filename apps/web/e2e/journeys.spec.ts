import { expect, test } from '@playwright/test';

// docs/test-cases.md TC-E2E-01..03. Synthetic data only; no AI call.

test('TC-E2E-01 sample B: ₹2,05,800 → twin sharing ₹2,17,900 → delete my data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'See a sample (knee replacement)' }).click();
  await expect(page).toHaveURL(/\/claims\/[a-f0-9]{24}$/);

  // docs/rules-spec.md Case B: ₹2,05,800 payable of ₹2,40,000, you pay ₹34,200, likely partly paid.
  await expect(page.getByText('Likely partly paid').first()).toBeVisible();
  await expect(page.getByText('₹2,05,800 of ₹2,40,000')).toBeVisible();
  await expect(page.getByText('Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.').first()).toBeVisible();
  await expect(page.getByText('−₹24,600')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/approved/i);

  // Twin sharing at ₹4,500/day: ₹2,17,900 of ₹2,27,500, you pay ₹9,600.
  await page.getByLabel('Room type').selectOption('shared');
  await page.getByLabel('Rent per day (₹)').fill('4500');
  await page.getByRole('button', { name: 'Try this room' }).click();
  await expect(page.getByText('₹2,17,900 of ₹2,27,500')).toBeVisible();
  await expect(page.getByText(/you pay ₹9,600/)).toBeVisible();
  await expect(page.getByText(/Assumes other charges stay the same/)).toBeVisible();

  const claimUrl = page.url();
  await page.getByRole('button', { name: 'Delete my data' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto(claimUrl);
  await expect(page).toHaveURL(/\/login/);
});

const signUp = async (page: import('@playwright/test').Page, email: string) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-9');
  await page.getByLabel('I am 18 or older.').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/claims$/);
};

test('TC-E2E-02 sign up → new check → manual facts → estimate; TC-E2E-03 another account gets 404', async ({ page, browser }) => {
  const email = `e2e-${Date.now()}@example.test`;
  await signUp(page, email);
  await page.getByRole('link', { name: 'New check' }).click();
  await page.getByLabel('Planned treatment').fill('Appendix surgery');
  await page.getByLabel('Planned admission (optional)').fill('2026-09-10');
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page.getByText(/We need your consent/)).toBeVisible();
  await expect(page.getByLabel('Planned treatment')).toHaveValue('Appendix surgery'); // the form keeps its input
  await page.getByLabel(/Read my documents to estimate this claim/).check();
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page).toHaveURL(/\/claims\/[a-f0-9]{24}\/facts$/);

  await page.getByRole('button', { name: 'Enter facts yourself' }).click();
  await page.getByLabel('What').selectOption('sum_insured');
  await page.getByLabel('Value').fill('300000');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('₹3,00,000')).toBeVisible();

  await page.getByRole('link', { name: '3. See the estimate' }).click();
  await expect(page.getByText('At risk').first()).toBeVisible(); // most facts are still unknown
  await expect(page.getByText('Unknown').first()).toBeVisible();
  const claimUrl = page.url();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signUp(otherPage, `e2e-other-${Date.now()}@example.test`);
  const res = await otherPage.goto(claimUrl);
  expect(res?.status()).toBe(404);
  await expect(otherPage.getByText('Not found')).toBeVisible();
  await other.close();
});

test('TC-E2E-04 What can I do? on the room-rent cut → a room within the limit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'See a sample (knee replacement)' }).click();
  await expect(page).toHaveURL(/\/claims\/[a-f0-9]{24}$/);
  const roomRow = page.getByRole('listitem').filter({ hasText: 'Room rent limit' });
  await roomRow.getByRole('button', { name: 'What can I do?' }).click();
  await expect(roomRow.getByText("Choose a room within your policy's limit")).toBeVisible();
  await roomRow.getByRole('button', { name: 'Try a room within the limit' }).click();
  // Case B at the ₹5,000 cap: ₹2,20,400 of ₹2,30,000, you pay ₹9,600 (docs/test-cases.md TC-FIX).
  await expect(roomRow.getByText('₹2,20,400 of ₹2,30,000')).toBeVisible();
  await expect(roomRow.getByText(/you pay ₹9,600/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/approved/i);
});

test('TC-E2E-05 ask about the room-rent cut and get a grounded answer', async ({ page }) => {
  // A signed-up user's own copy of sample B (guests cannot use the chat). The API runs with LLM_FAKE=1 in e2e.
  await page.goto('/signup');
  await page.getByLabel('Email').fill(`e2e-chat-${Date.now()}@example.test`);
  await page.getByLabel('Password').fill('correct-horse-9');
  await page.getByLabel('I am 18 or older.').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/claims$/);
  await page.goto('/');
  await page.getByRole('button', { name: 'See a sample (knee replacement)' }).click();
  await expect(page).toHaveURL(/\/claims\/[a-f0-9]{24}$/);
  const roomRow = page.getByRole('listitem').filter({ hasText: 'Room rent limit' });
  await roomRow.getByRole('button', { name: 'What can I do?' }).click();
  await roomRow.getByRole('button', { name: 'Why was this cut?' }).click();
  await expect(roomRow.getByText(/costs more than the limit in your policy/)).toBeVisible();
  await expect(roomRow.getByText('Clause 2(A), page 5')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/approved/i);
});

test('TC-E2E-06 clarifier questions, a typed what-if, and the printable summary', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(`e2e-gaps-${Date.now()}@example.test`);
  await page.getByLabel('Password').fill('correct-horse-9');
  await page.getByLabel('I am 18 or older.').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/claims$/);

  // FR-6: an own claim with only the sum insured asks the 2 questions that settle the most checks.
  await page.getByRole('link', { name: 'New check' }).click();
  await page.getByLabel('Planned treatment').fill('Knee replacement');
  await page.getByLabel(/Read my documents to estimate this claim/).check();
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page).toHaveURL(/\/facts$/);
  await page.getByRole('button', { name: 'Enter facts yourself' }).click();
  await page.getByLabel('What').selectOption('sum_insured');
  await page.getByLabel('Value').fill('300000');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('₹3,00,000').first()).toBeVisible();
  await page.getByRole('link', { name: '3. See the estimate' }).click();
  await expect(page.getByText('Two quick questions')).toBeVisible();
  await page.getByLabel('When is the planned admission?').fill('2026-11-18');
  await page.getByLabel(/When did this year’s policy start/).fill('2026-03-12');
  await page.getByRole('button', { name: 'Save answers' }).click();
  await expect(page.getByLabel('When is the planned admission?')).toHaveCount(0); // answered: new questions now

  // FR-17: a typed what-if on the user's own copy of sample B, answered by the engine.
  await page.goto('/');
  await page.getByRole('button', { name: 'See a sample (knee replacement)' }).click();
  await expect(page).toHaveURL(/\/claims\/[a-f0-9]{24}$/);
  const claimUrl = page.url();
  const roomRow = page.getByRole('listitem').filter({ hasText: 'Room rent limit' });
  await roomRow.getByRole('button', { name: 'What can I do?' }).click();
  await roomRow.getByLabel('Ask about this check').fill('what if we take twin sharing at 4500?');
  await roomRow.getByRole('button', { name: 'Ask' }).click();
  // docs/rules-spec.md: twin sharing ₹4,500/day → ₹2,17,900 of ₹2,27,500, you pay ₹9,600.
  await expect(roomRow.getByText('What-if (not saved)')).toBeVisible();
  await expect(roomRow.getByText(/₹2,17,900 of ₹2,27,500/)).toBeVisible();

  // FR-12: the printable summary.
  await page.goto(`${claimUrl}/summary`);
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
  await expect(page.getByText('₹2,05,800 of ₹2,40,000')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/approved/i);
});
