#!/usr/bin/env bash
# Uploads the Trustline Cedar schema and policies to an Amazon Verified
# Permissions policy store and prints AVP_POLICY_MAP for the app environment.
# Usage: VERIFIED_PERMISSIONS_POLICY_STORE=ps-xxxx ./scripts/upload-avp.sh
set -euo pipefail
STORE="${VERIFIED_PERMISSIONS_POLICY_STORE:?set VERIFIED_PERMISSIONS_POLICY_STORE}"
node scripts/export-cedar.mjs

aws verifiedpermissions put-schema \
  --policy-store-id "$STORE" \
  --definition "{\"cedarJson\": $(jq -Rs . < infra/cedar/schema.json)}" >/dev/null

MAP="{"
for file in infra/cedar/policies/*.cedar; do
  name="$(basename "$file" .cedar)"
  id="$(aws verifiedpermissions create-policy \
    --policy-store-id "$STORE" \
    --definition "{\"static\":{\"description\":\"$name\",\"statement\":$(jq -Rs . < "$file")}}" \
    --query policyId --output text)"
  MAP="$MAP\"$id\":\"$name\","
  echo "created $name -> $id" >&2
done
MAP="${MAP%,}}"
echo "AVP_POLICY_MAP='$MAP'"
