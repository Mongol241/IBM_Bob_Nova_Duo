import { Ticket } from "./types";

export const MOCK_TICKETS: Ticket[] = [
  {
    id: "conflict-01",
    file: "src/billing.js",
    confidence: 0.91,
    status: "auto-resolved",
    approved: false,
    resolution: `function calculateTotal(items, discountRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return subtotal * (1 - discountRate);
}`,
    reasoning:
      "Kept the discount logic from the incoming branch while preserving the original function signature and parameter defaults from HEAD. Both branches intended to support discounts; the incoming implementation was more complete.",
    head: `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}`,
    incoming: `function calculateTotal(items, discountRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return subtotal * (1 - discountRate);
}`,
  },
  {
    id: "conflict-02",
    file: "src/auth.js",
    confidence: 0.62,
    status: "needs-review",
    approved: false,
    resolution: `async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, payload: decoded };
  } catch (err) {
    logger.warn("Token verification failed", { error: err.message });
    return { valid: false, payload: null };
  }
}`,
    reasoning:
      "Both sides modify error-handling behavior in incompatible ways. HEAD silently returns null on failure; incoming throws and expects callers to catch. The resolution attempts a middle ground but callers may need to be updated.",
    head: `async function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}`,
    incoming: `async function verifyToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded) throw new Error("Invalid token");
  return decoded;
}`,
  },
  {
    id: "conflict-03",
    file: "package-lock.json",
    confidence: 0.97,
    status: "auto-resolved",
    approved: false,
    resolution: `"lodash": {
  "version": "4.17.21",
  "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
  "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZgjTopvcG/z8v+f99aQ=="
}`,
    reasoning:
      "Lockfile conflict caused by both branches updating lodash independently. The incoming branch targets the latest patch version (4.17.21) which is a security fix. Safe to accept incoming.",
    head: `"lodash": {
  "version": "4.17.19",
  "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.19.tgz"
}`,
    incoming: `"lodash": {
  "version": "4.17.21",
  "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
  "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZgjTopvcG/z8v+f99aQ=="
}`,
  },
  {
    id: "conflict-04",
    file: "docs/api-reference.md",
    confidence: 0.55,
    status: "needs-review",
    approved: false,
    resolution: `## Authentication

All endpoints require a Bearer token in the \`Authorization\` header.
Tokens expire after 24 hours and must be refreshed using \`POST /auth/refresh\`.

Rate limiting applies: 100 requests/minute per token.`,
    reasoning:
      "Both branches rewrote the authentication docs section with differing claims about token expiry and rate limits. Cannot determine which is authoritative without checking the actual implementation.",
    head: `## Authentication

All endpoints require a Bearer token in the \`Authorization\` header.
Tokens expire after 1 hour.`,
    incoming: `## Authentication

All API calls must include a Bearer token.
Tokens expire after 24 hours. Rate limiting: 100 req/min per token.`,
  },
  {
    id: "conflict-05",
    file: "src/utils/formatters.ts",
    confidence: 0.88,
    status: "auto-resolved",
    approved: false,
    resolution: `export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}`,
    reasoning:
      "HEAD added locale support; incoming added currency parameter. Both extensions are compatible and non-conflicting. The resolution merges both additions without changing existing behaviour.",
    head: `export function formatCurrency(amount: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);
}`,
    incoming: `export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}`,
  },
];
