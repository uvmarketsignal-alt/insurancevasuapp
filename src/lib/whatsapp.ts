/** Digits only for wa.me (country code included, no +). */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Opens WhatsApp chat. `phone` may include spaces or +91 prefix.
 * @see https://wa.me/
 */
export function whatsAppMeUrl(phone: string, presetMessage?: string): string {
  const d = digitsOnly(phone);
  if (!d) return '#';
  const base = `https://wa.me/${d}`;
  if (presetMessage && presetMessage.trim()) {
    return `${base}?text=${encodeURIComponent(presetMessage.trim())}`;
  }
  return base;
}

export function whatsAppLinkForCustomer(phone: string, presetMessage?: string): string {
  return whatsAppMeUrl(phone, presetMessage);
}
