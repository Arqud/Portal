// One legal entity (ARQUD (PTY) LTD), two customer-facing businesses that share
// one ledger. This module centralises how the `business` tag is read and written
// so the customer-facing wall and ARQUD-safety live in exactly one place.

export type BusinessKey = "arqud" | "sa_equipment";

export const BUSINESS_OPTIONS: { value: BusinessKey; label: string }[] = [
  { value: "arqud", label: "ARQUD" },
  { value: "sa_equipment", label: "SA Equipment" },
];

export const BUSINESS_LABEL: Record<BusinessKey, string> = {
  arqud: "ARQUD",
  sa_equipment: "SA Equipment",
};

/** Normalise any stored / unknown / missing value to a business key (defaults to ARQUD). */
export function businessKey(value?: string | null): BusinessKey {
  return value === "sa_equipment" ? "sa_equipment" : "arqud";
}

/**
 * Add the `business` field to a DB write ONLY when it is SA Equipment.
 *
 * ARQUD is the column's default, so ARQUD writes omit the field entirely — they
 * stay byte-identical to today's inserts and cannot fail even if this code ever
 * runs before the migration adds the column. SA Equipment records are only ever
 * created after the migration is applied, so including the field there is safe.
 */
export function withBusiness<T extends object>(row: T, value?: string | null): T {
  return businessKey(value) === "sa_equipment"
    ? { ...row, business: "sa_equipment" }
    : row;
}
