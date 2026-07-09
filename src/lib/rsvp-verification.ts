export function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function normalizeWhatsAppPhone(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `52${digits}`;
  }

  return digits;
}

export function maskPhone(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) {
    return '';
  }

  return `(${digits.slice(0, 2)}) XXXX-${digits.slice(-4)}`;
}
