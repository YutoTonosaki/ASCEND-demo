// Optional browser regression: use an isolated Playwright installation via NODE_PATH.
// Serve a production web export and set ASCEND_QA_URL (defaults to localhost:8096).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const click = name => page.getByRole('button', { name, exact: true }).click();
    const input = name => page.getByRole('textbox', { name, exact: true });
    const url = process.env.ASCEND_QA_URL || 'http://127.0.0.1:8096';
    await page.goto(url);
    await page.getByRole('tab', { name: 'TRAIN', exact: true }).click();
    await click('CREATE WORKOUT');
    await input('WORKOUT NAME').fill('Input regression');
    async function add(name) {
      await click('+ ADD EXERCISE');
      await input('SEARCH EXERCISES').fill(name);
      await page.getByRole('button', { name: `Add ${name}`, exact: true }).last().click();
    }
    await add('Push-up');
    await click('EDIT DETAILS · Push-up');
    await click('Increase Push-up set 2 reps');
    await input('Push-up sets').fill('');
    await input('Push-up sets').fill('4');
    assert.equal(await input('Push-up set 2 reps').inputValue(), '13');
    await click('HIDE DETAILS · Push-up');
    await add('Bench Press');
    await input('Bench Press kg').fill('52.5');
    await click('Increase Bench Press kg');
    assert.equal(await input('Bench Press kg').inputValue(), '55');
    await click('Decrease Bench Press kg');
    assert.equal(await input('Bench Press kg').inputValue(), '52.5');
    await add('Plank');
    await click('Increase Plank seconds');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await click('SAVE WORKOUT');
    await page.getByRole('button', { name: 'EDIT WORKOUT', exact: true }).waitFor();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ascend.training.v1')));
    assert.equal(stored.workouts[0].exercises[0].sets.length, 4);
    assert.equal(stored.workouts[0].exercises[0].sets[1].reps, 13);
    assert.equal(stored.workouts[0].exercises[1].sets[0].weightKg, 52.5);
    assert.equal(stored.workouts[0].exercises[2].sets[0].seconds, 50);
    await page.goto(url);
    await page.getByRole('tab', { name: 'TRAIN', exact: true }).click();
    await click('SAVED WORKOUTS · 1');
    await click('VIEW · Input regression');
    await click('EDIT WORKOUT');
    assert.equal(await input('Bench Press kg').inputValue(), '52.5');
    assert.equal(await input('Push-up sets').inputValue(), '4');
    assert.deepEqual(errors, []);
    console.log('PASS: direct set-count replacement preserves individual targets; decimal input +/- and all tracking targets persist after reload; no browser errors or 320px overflow.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
