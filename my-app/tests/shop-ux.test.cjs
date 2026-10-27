const test = require("node:test"),
  assert = require("node:assert/strict");
const { shopColumns } = require("../src/components/shop/layout.ts");
test("shop grid uses two columns at ordinary 320/390/560 widths", () => {
  for (const width of [310, 320, 390, 560])
    assert.equal(shopColumns(width, 1), 2);
});
test("shop grid falls back on narrow windows without changing product data", () => {
  for (const width of [0, 240, 280, 309, NaN])
    assert.equal(shopColumns(width, 1), 1);
});
test("shop grid responds to actual native accessibility font scale", () => {
  for (const scale of [1.35, 1.5, 2, 3])
    assert.equal(shopColumns(390, scale), 1);
  assert.equal(shopColumns(390, 1.3), 2);
});
test("shop grid also falls back when measured text grows on Web", () => {
  assert.equal(shopColumns(320, 1, 36), 1);
  assert.equal(shopColumns(390, 1, 24), 2);
});
