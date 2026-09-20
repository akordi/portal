import { describe, expect, it } from 'vitest';
import htmlLang from '@/utils/htmlLang';

describe('htmlLang', () => {
  it('maps tenant country codes to BCP 47 language tags', () => {
    expect(htmlLang('lv')).toBe('lv');
    expect(htmlLang('lt')).toBe('lt');
    expect(htmlLang('ee')).toBe('et');
    expect(htmlLang('es')).toBe('es');
  });

  it('is tolerant of case and whitespace', () => {
    expect(htmlLang(' EE ')).toBe('et');
  });

  it('falls back to lv for unknown or missing values', () => {
    expect(htmlLang('xx')).toBe('lv');
    expect(htmlLang('')).toBe('lv');
    expect(htmlLang(undefined)).toBe('lv');
    expect(htmlLang(null)).toBe('lv');
  });
});
