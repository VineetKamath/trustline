import type { StructuredRequest } from "@/types";
import { CLAIMS } from "./claims";

/** "Seller has at least 20 successful transactions" */
export function requestSentence(s: StructuredRequest): string {
  const who = s.subjectRole === "seller" ? "Seller" : "Buyer";
  if (s.kind === "predicate" && s.claim && s.threshold !== undefined) {
    const def = CLAIMS[s.claim];
    return def.unit === "percent"
      ? `${who}'s ${def.noun} is at least ${s.threshold}%`
      : `${who} has at least ${s.threshold} ${def.noun}`;
  }
  if (s.kind === "full_history") return `${who}'s complete transaction history`;
  if (s.kind === "identity") return `${who}'s personal identity details`;
  if (s.kind === "raw_value") return `${who}'s exact ${CLAIMS[s.claim ?? "successful_transactions"].noun}`;
  return s.summary;
}

/** Split for large typography: ["Seller has at least", "20 successful transactions"] */
export function requestSentenceParts(s: StructuredRequest): [string, string] {
  const who = s.subjectRole === "seller" ? "Seller" : "Buyer";
  if (s.kind === "predicate" && s.claim && s.threshold !== undefined) {
    const def = CLAIMS[s.claim];
    return def.unit === "percent"
      ? [`${who}'s ${def.noun} is at least`, `${s.threshold}%`]
      : [`${who} has at least`, `${s.threshold} ${def.noun}`];
  }
  return ["", requestSentence(s)];
}
