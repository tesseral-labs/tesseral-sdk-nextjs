export function isJWTFormat(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.test(value);
}

export function isAPIKeyFormat(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value);
}
