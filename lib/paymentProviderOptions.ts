export const BANK_PROVIDER_OPTIONS = ["NMB", "CRDB", "NBC"] as const;
export const MOBILE_PROVIDER_OPTIONS = ["M-Pesa", "Airtel Money", "Tigo Pesa", "Halotel Pesa"] as const;

export function providerOptionsForMethod(method: string): readonly string[] {
  if (method === "bank") return BANK_PROVIDER_OPTIONS;
  if (method === "mobile_money") return MOBILE_PROVIDER_OPTIONS;
  return [];
}
