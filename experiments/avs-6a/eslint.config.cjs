const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  { ignores: ["dist/**", ".expo/**", "asset-source/**"] },
  {
    files: ["src/create-scene.jsx"],
    rules: {
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            "attach",
            "args",
            "position",
            "intensity",
            "object",
            "dispose",
            "rotation",
            "roughness",
          ],
        },
      ],
    },
  },
]);
