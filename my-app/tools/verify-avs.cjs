const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "..");
function verify() {
  const { manifest } =
    require("../../experiments/avs-6a/tools/verify-asset.cjs").verify();
  const bytes = fs.readFileSync(path.join(root, "assets/avs/athlete.glb"));
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, "assets/avs/manifest.json"))),
    manifest,
  );
  assert.ok(fs.existsSync(path.join(root, "assets/avs/ASSET-LICENSE.md")));
  return manifest;
}
module.exports = { verify };
if (require.main === module) console.log(JSON.stringify(verify(), null, 2));
