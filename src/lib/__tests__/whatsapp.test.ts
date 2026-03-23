import { describe, expect, it } from 'vitest';
import { digitsOnly, whatsAppLinkForCustomer, whatsAppMeUrl } from '../whatsapp';

describe('whatsapp helpers', () => {
  it('digitsOnly should strip non-digits', () => {
    expect(digitsOnly('+91 98765-43210')).toBe('919876543210');
    expect(digitsOnly('  (555) 123-4567 ')).toBe('5551234567');
  });

  it('whatsAppMeUrl should return # when no digits exist', () => {
    expect(whatsAppMeUrl('++--')).toBe('#');
  });

  it('whatsAppMeUrl should build wa.me link without message', () => {
    expect(whatsAppMeUrl('+91 98765-43210')).toBe('https://wa.me/919876543210');
  });

  it('whatsAppMeUrl should add and encode preset message', () => {
    expect(
      whatsAppMeUrl('+91 98765-43210', 'Hi Rajesh, How are you?')
    ).toBe('https://wa.me/919876543210?text=Hi%20Rajesh%2C%20How%20are%20you%3F');
  });

  it('whatsAppLinkForCustomer should delegate to whatsAppMeUrl', () => {
    expect(whatsAppLinkForCustomer('+91 98765-43210', 'Hi')).toBe(
      whatsAppMeUrl('+91 98765-43210', 'Hi'),
    );
  });
});

