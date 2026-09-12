export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeFullName(fullName: string): string {
  return fullName.trim();
}

export function canonicalizePhone(phone: string | undefined): string | null {
  if (phone === undefined || phone.trim().length === 0) {
    return null;
  }

  const compact = phone.trim().replace(/[\s().-]/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}
