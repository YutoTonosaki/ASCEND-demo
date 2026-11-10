const { test } = require("node:test");
const assert = require("node:assert/strict");
const { bodyParts } = require("../src/config/training.ts");
const { ratingDetails, truncateRating } = require("../src/growth/rating-details.ts");
const { overall, displayRating } = require("../src/growth/domain.ts");
const player = n => ({ ratings: Object.fromEntries(bodyParts.map(a => [a, n])),
  status: Object.fromEntries(bodyParts.map(a => [a, "assessed"])) });
for (const [value, expected] of [[0, "0.00"], [.29, "0.29"], [.009, "0.00"],
  [51.999, "51.99"], [51.99999999999999, "51.99"], [52, "52.00"], [99, "99.00"]]) {
  test(`truncate ${value} to ${expected}`, () => assert.equal(truncateRating(value), expected));
}
for (const ovr of [0, 98, 99]) {
  test(`OVR ${ovr} next/maximum state`, () => {
    const r = ratingDetails(player(ovr));
    assert.equal(r.ovr, ovr);
    assert.equal(r.nextOVR, ovr === 99 ? null : ovr + 1);
    assert.equal(r.remaining, ovr === 99 ? null : 1);
    assert.equal(r.remainingFormatted, ovr === 99 ? null : "1.00");
  });
}
test("mean uses original values before display formatting", () => {
  const p = player(51.999);
  p.ratings.Chest = 52.005;
  const r = ratingDetails(p);
  const exact = bodyParts.reduce((n, a) => n + p.ratings[a], 0) / 6;
  assert.equal(r.mean, exact);
  assert.equal(r.ovr, overall(p.ratings));
  assert.equal(r.remaining, r.nextOVR - exact);
  assert.equal(displayRating(51.999), 51);
});
test("positive remaining below .01 never formats as zero", () => {
  for (const n of [51.999, 98.99999999999999]) {
    const r = ratingDetails(player(n));
    assert.ok(r.remaining > 0 && r.remaining < .01);
    assert.equal(r.remainingFormatted, null);
    assert.notEqual(r.meanFormatted, String(r.nextOVR) + ".00");
  }
});
test("provisional count and statuses remain attached to the correct regions", () => {
  const p = player(45);
  p.status.Chest = "provisional";
  p.status.Legs = "provisional";
  const r = ratingDetails(p);
  assert.equal(r.provisionalCount, 2);
  assert.deepEqual(r.regions.filter(a => a.status === "provisional").map(a => a.area), ["Chest", "Legs"]);
});
test("invalid values fail instead of publishing fabricated progress", () => {
  for (const n of [NaN, Infinity, -1, 99.001]) assert.throws(() => ratingDetails(player(n)));
});
test("frozen saved inputs are unchanged and output is detached", () => {
  const p = player(51.999);
  Object.freeze(p.ratings); Object.freeze(p.status); Object.freeze(p);
  const raw = JSON.stringify(p);
  const r = ratingDetails(p);
  r.regions[0].formatted = "changed";
  assert.equal(JSON.stringify(p), raw);
  assert.deepEqual(ratingDetails(p), ratingDetails(p));
});
