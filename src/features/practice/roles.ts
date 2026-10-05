// Who the founder can practise with.
export const ROLES = ["bank", "customer", "office"] as const;
export type Role = (typeof ROLES)[number];
