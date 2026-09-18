// Optional QA: run against an exported app with Playwright on NODE_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const button = name => page.getByRole('button', { name, exact: true });
    const input = name => page.getByRole('textbox', { name, exact: true });
    const probes = () => page.locator('body > div[style*="safe-area-inset"]');
    await page.goto(process.env.ASCEND_QA_URL || 'http://127.0.0.1:8097');
    const viewport = page.locator('meta[name="viewport"]');
    assert.equal(await viewport.count(), 1);
    assert.match(await viewport.getAttribute('content'), /viewport-fit=cover/);
    for (const tab of ['HOME', 'TRAIN', 'PLAYER', 'CAREER', 'SHOP']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      assert.equal(await button('Settings').count(), 1);
      const box = await button('Settings').boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
    }
    await page.getByRole('tab', { name: 'TRAIN', exact: true }).click();
    await button('CREATE WORKOUT').click();
    assert.equal(await button('Settings').count(), 1);
    const rootProviders = await probes().count();
    await button('+ ADD EXERCISE').click();
    await button('CLOSE').waitFor();
    assert.equal(await probes().count(), rootProviders + 1);
    await page.waitForTimeout(200);
    assert.equal(await button('Settings').count(), 1);
    // The sole header control remains mounted behind the full-screen modal.
    assert.equal(await button('Settings').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    }), false);
    // Model a modal with real insets while the underlying navigation screen has zero.
    await probes().last().evaluate(element => {
      element.style.setProperty('padding-top', '59px', 'important');
      element.style.setProperty('padding-bottom', '34px', 'important');
      for (const name of ['transitionend', 'webkitTransitionEnd']) element.dispatchEvent(new Event(name));
    });
    await page.waitForTimeout(150);
    assert.ok((await button('CLOSE').boundingBox()).y >= 59);
    await input('SEARCH EXERCISES').fill('My custom movement');
    await button('+ CREATE CUSTOM EXERCISE').click();
    assert.ok((await button('CLOSE').boundingBox()).y >= 59);
    assert.equal(await input('EXERCISE NAME').count(), 1);
    assert.equal(await input('EXERCISE NAME').inputValue(), 'My custom movement');
    assert.ok((await input('EXERCISE NAME').boundingBox()).y >= 59);
    for (const label of ['PRIMARY BODY PART', 'SECONDARY BODY PARTS · OPTIONAL', 'EQUIPMENT', 'TRACKING TYPE', 'CATEGORY']) {
      assert.equal(await page.getByText(label, { exact: true }).count(), 1);
    }
    await button('SAVE EXERCISE').scrollIntoViewIfNeeded();
    const save = await button('SAVE EXERCISE').boundingBox();
    assert.ok(save.y + save.height <= 844 - 34);
    await button('CLOSE').click();
    await button('CLOSE').click();
    assert.equal(await button('Settings').count(), 1);
    await button('BACK').click();
    await button('MY EXERCISES · 0').click();
    await button('+ CREATE CUSTOM EXERCISE').click();
    assert.equal(await input('EXERCISE NAME').count(), 1);
    assert.equal(await probes().count(), rootProviders + 1);
    await page.keyboard.press('Escape');
    assert.equal(await button('Settings').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: one ASCEND header Settings; each modal owns an inset provider; simulated modal-only top/bottom safe areas; one name input and all fields; modal dismissal; no browser errors.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
