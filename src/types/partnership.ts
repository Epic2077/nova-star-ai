/**
 * Database row type for the `partnerships` table.
 */

export type PartnershipStatus = "pending" | "active" | "dissolved";

export type PartnershipRow = {
  id: string;
  user_a: string;
  user_b: string | null;
  invite_code: string;
  status: PartnershipStatus;
  ended_at: string | null;
  created_at: string;
};

/**
 * Partnership with partner name resolved (for UI display).
 */
export type PartnershipWithPartner = PartnershipRow & {
  partnerName: string | null;
};
