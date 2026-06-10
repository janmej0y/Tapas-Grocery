export const ADMIN_PHONE = normalizeLocalPhone(process.env.NEXT_PUBLIC_ADMIN_PHONE ?? process.env.ADMIN_PHONE ?? "7477661933");

export function normalizeLocalPhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function isAdminPhone(phone: string) {
  return normalizeLocalPhone(phone) === ADMIN_PHONE;
}
