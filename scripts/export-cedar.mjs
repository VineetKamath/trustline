// Exports the Cedar schema and policies from lib/aws/cedar/policies.ts into
// infra/cedar/ for upload to Amazon Verified Permissions.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cedar = require("@cedar-policy/cedar-wasm/nodejs");
const src = fs.readFileSync("lib/aws/cedar/policies.ts", "utf8");
const schema = src.match(/CEDAR_SCHEMA = `([\s\S]*?)`;/)[1].trim();
const policies = {};
for (const m of src.slice(src.indexOf("CEDAR_POLICIES")).matchAll(/"([a-z-]+)": `([\s\S]*?)`,/g)) policies[m[1]] = m[2].trim();

fs.mkdirSync("infra/cedar/policies", { recursive: true });
fs.writeFileSync("infra/cedar/schema.cedarschema", schema + "\n");
const json = cedar.schemaToJson(schema);
if (json.type !== "success") throw new Error(JSON.stringify(json.errors));
fs.writeFileSync("infra/cedar/schema.json", JSON.stringify(json.json, null, 2) + "\n");
for (const [id, text] of Object.entries(policies)) fs.writeFileSync(`infra/cedar/policies/${id}.cedar`, text + "\n");
console.log(`Exported schema and ${Object.keys(policies).length} policies to infra/cedar/`);
