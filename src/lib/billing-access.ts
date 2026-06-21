export const premiumAccessCodeConfigError = "Premium access codes are not configured.";

export function buildPremiumAccessCodes(value: string | null | undefined) {
  return new Set(
    (value ?? "")
      .split(/[\s,;]+/)
      .map(code => code.trim().toLowerCase())
      .filter(Boolean)
  );
}
