const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /\.\.\.$/,
  /^sk-ant-\.\.\.$/i,
  /^sk_test_\.\.\.$/i,
  /^pk_test_\.\.\.$/i,
  /^whsec_\.\.\.$/i,
  /^price_\.\.\.$/i,
  /^SG\.\.\.\.$/i,
  /^AC\.\.\.$/i,
  /^\+1\.\.\.$/,
];

export function getConfiguredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

export function getMissingEnv(names: string[]): string[] {
  return names.filter((name) => !getConfiguredEnv(name));
}

export function hasConfiguredEnv(names: string[]): boolean {
  return getMissingEnv(names).length === 0;
}
