const SAFE_TEXT_REGEX = /[^a-zA-Z0-9\s.,@#:/()_+-]/g;

export const sanitizeText = (value: string): string => {
  return value.replace(SAFE_TEXT_REGEX, '').trim();
};

export const sanitizePhone = (value: string): string => {
  return value.replace(/[^\d+]/g, '').slice(0, 15);
};

export const sanitizeEmail = (value: string): string => {
  return value.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '');
};

export const sanitizeNumeric = (value: number | undefined): number | undefined => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.max(0, value);
};
