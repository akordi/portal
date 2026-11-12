import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import lxLocaleOptions, { lxGlobalTexts } from '@/utils/lxLocale';
import { countryCode } from '@/utils/htmlLang';
import lv from '@/locales/lv.json';
import lt from '@/locales/lt.json';
import ee from '@/locales/ee.json';
import es from '@/locales/es.json';

const messages = { lv, lt, ee, es };

// Fills a date-fns yyyy/MM/dd pattern, enough to compare it with Intl output.
function fill(pattern, [year, month, day]) {
  return pattern.replace('yyyy', year).replace('MM', month).replace('dd', day);
}

function textsFor(locale) {
  const missing = [];
  const i18n = createI18n({
    legacy: false,
    locale,
    messages,
    missing: (_, key) => missing.push(key),
    missingWarn: false,
    fallbackWarn: false,
  });
  return { texts: lxGlobalTexts(i18n.global.t), missing };
}

describe('countryCode', () => {
  it('normalizes DEFAULT_LANGUAGE to a tenant country, falling back to lv', () => {
    expect(countryCode('lt')).toBe('lt');
    expect(countryCode(' EE ')).toBe('ee');
    expect(countryCode('et')).toBe('lv');
    expect(countryCode('')).toBe('lv');
    expect(countryCode(undefined)).toBe('lv');
  });
});

describe('lxLocaleOptions', () => {
  it('maps each country to its locale and date formats', () => {
    expect(lxLocaleOptions('lv')).toEqual({
      dateFormat: 'dd.MM.yyyy.',
      dateTimeFormat: 'dd.MM.yyyy. HH:mm',
      dateTimeFullFormat: 'dd.MM.yyyy. HH:mm:ss',
      locale: { locale: 'lv-LV', firstDayOfTheWeek: 2 },
    });
    expect(lxLocaleOptions('lt')).toEqual({
      dateFormat: 'yyyy-MM-dd',
      dateTimeFormat: 'yyyy-MM-dd HH:mm',
      dateTimeFullFormat: 'yyyy-MM-dd HH:mm:ss',
      locale: { locale: 'lt-LT', firstDayOfTheWeek: 2 },
    });
    expect(lxLocaleOptions('ee')).toEqual({
      dateFormat: 'dd.MM.yyyy',
      dateTimeFormat: 'dd.MM.yyyy HH:mm',
      dateTimeFullFormat: 'dd.MM.yyyy HH:mm:ss',
      locale: { locale: 'et-EE', firstDayOfTheWeek: 2 },
    });
    expect(lxLocaleOptions('es')).toEqual({
      dateFormat: 'dd/MM/yyyy',
      dateTimeFormat: 'dd/MM/yyyy HH:mm',
      dateTimeFullFormat: 'dd/MM/yyyy HH:mm:ss',
      locale: { locale: 'es-ES', firstDayOfTheWeek: 2 },
    });
  });

  it('keeps lx-ui defaults for unknown or missing values', () => {
    expect(lxLocaleOptions('xx')).toEqual(lxLocaleOptions('lv'));
    expect(lxLocaleOptions(undefined)).toEqual(lxLocaleOptions('lv'));
    expect(lxLocaleOptions(' LT ')).toEqual(lxLocaleOptions('lt'));
  });

  it.each(['lt', 'ee', 'es'])('%s date format matches Intl (CLDR)', (country) => {
    const { dateFormat, locale } = lxLocaleOptions(country);
    const intl = new Intl.DateTimeFormat(locale.locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(2024, 0, 5));
    expect(fill(dateFormat, ['2024', '01', '05'])).toBe(intl);
  });

  it.each(['lv', 'lt', 'ee', 'es'])('%s uses 24-hour time and a Monday week start', (country) => {
    const { locale } = lxLocaleOptions(country);
    const intlLocale = new Intl.Locale(locale.locale);
    const weekInfo = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
    // Intl counts from Monday = 1, lx-ui from Sunday = 1.
    expect(weekInfo.firstDay).toBe(1);
    expect(locale.firstDayOfTheWeek).toBe(2);
    const { hourCycle } = new Intl.DateTimeFormat(locale.locale, {
      timeStyle: 'short',
    }).resolvedOptions();
    expect(hourCycle).toBe('h23');
  });
});

describe('lxGlobalTexts', () => {
  it.each(Object.keys(messages))('%s defines every key it reads', (locale) => {
    const { missing } = textsFor(locale);
    expect(missing).toEqual([]);
  });

  it('keeps lx-ui built-in Latvian texts on lv', () => {
    const { texts } = textsFor('lv');
    expect(texts.LxDynamicImport).toEqual({
      offline: 'Nav interneta savienojuma. Pārbaudiet savienojumu un mēģiniet vēlreiz!',
      loadFailed: 'Neizdevās ielādēt lapas saturu. Mēģiniet vēlreiz!',
    });
    expect(texts.LxForm.required).toBe('(obligāts)');
    expect(texts.LxModal.close).toBe('Aizvērt');
  });

  it('translates the network recovery notifications', () => {
    expect(textsFor('lt').texts.LxDynamicImport.offline).toBe(
      'Nėra interneto ryšio. Patikrinkite ryšį ir bandykite dar kartą.'
    );
    expect(textsFor('es').texts.LxDynamicImport.loadFailed).toBe(
      'No se pudo cargar el contenido de la página. Inténtelo de nuevo.'
    );
  });

  it('leaves the {0} placeholder for lx-ui to fill', () => {
    expect(textsFor('lv').texts.LxAutoComplete.searchFor).toBe('Meklēt "{0}"');
    expect(textsFor('ee').texts.LxAutoComplete.searchFor).toBe('Otsi "{0}"');
  });
});
