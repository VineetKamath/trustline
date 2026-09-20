import { ORGS, PEOPLE } from "./cast";

export const DEMO_IDS = {
  user: "usr_vineet",
  host: "usr_arjun",
  issuer: "org_marketplace_a",
  verifier: "org_marketplace_b",
} as const;

export type Persona = "user" | "host" | "issuer" | "verifier";
export type Tone = "indigo" | "amber" | "emerald" | "slate" | "sky" | "rose";

export interface PersonaInfo {
  key: Persona;
  name: string;
  kind: "Person" | "Organisation";
  /** Plain-English explanation, always rendered in brackets after the name. */
  role: string;
  summary: string;
  home: string;
  monogram: string;
  tone: Tone;
}

/** Who you are "viewing as" — any demo person or organisation. */
export interface ViewingAs {
  name: string;
  role: string;
  tone: Tone;
}

/**
 * The four personas the presenter starts from. Any other demo person can be
 * switched to by id. The `role` text is what appears in brackets after the
 * name, so it has to explain itself without any other context.
 */
export const PERSONAS: PersonaInfo[] = [
  {
    key: "user",
    name: "Vineet",
    kind: "Person",
    role: "a person who holds his own reputation and decides who gets to see it",
    summary:
      "Books stays, rides and groceries on OneCity. Holds credentials from four platforms. He is the person whose privacy the whole demo protects.",
    home: "/dashboard",
    monogram: "V",
    tone: "indigo",
  },
  {
    key: "host",
    name: "Arjun",
    kind: "Person",
    role: "a person who sells a service — he rents out his flat and is checked by buyers",
    summary:
      "Rents out the Modern Apartment on OneCity. His hosting record was earned on a different platform and still counts here.",
    home: "/dashboard",
    monogram: "A",
    tone: "amber",
  },
  {
    key: "issuer",
    name: "Marketplace A",
    kind: "Organisation",
    role: "an issuer — a company that signs credentials about what people actually did",
    summary:
      "Vouches for people after real transactions. It is the platform that issued Vineet's “47 successful transactions”.",
    home: "/issuer",
    monogram: "A",
    tone: "emerald",
  },
  {
    key: "verifier",
    name: "Marketplace B",
    kind: "Organisation",
    role: "a verifier — a company that asks for proof and receives only yes or no",
    summary: "Asks questions about a person before doing business with them. It never receives the underlying data.",
    home: "/verifier",
    monogram: "B",
    tone: "slate",
  },
];

export function personaForUser(userId: string): ViewingAs | null {
  const p = PEOPLE.find((x) => x.id === userId);
  return p ? { name: p.name, role: p.label, tone: p.tone as Tone } : null;
}

export function personaForOrg(orgId: string): ViewingAs | null {
  const org = ORGS.find((o) => o.id === orgId);
  if (org) return { name: org.name, role: org.label, tone: org.tone };
  const p = PERSONAS.find(
    (x) => (x.key === "issuer" && orgId === DEMO_IDS.issuer) || (x.key === "verifier" && orgId === DEMO_IDS.verifier),
  );
  return p ? { name: p.name, role: p.role, tone: p.tone } : null;
}
