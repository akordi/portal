import { countryCode } from '@/utils/htmlLang';

/**
 * Formatting locale and numeric date pattern (date-fns tokens) per tenant
 * country. lt, ee and es follow what Intl.DateTimeFormat(locale, { year:
 * 'numeric', month: '2-digit', day: '2-digit' }) renders (CLDR); lv keeps
 * lx-ui's built-in 'dd.MM.yyyy.' with the trailing dot of Latvian dates.
 */
const COUNTRY_FORMATS = {
  lv: { locale: 'lv-LV', date: 'dd.MM.yyyy.' },
  lt: { locale: 'lt-LT', date: 'yyyy-MM-dd' },
  ee: { locale: 'et-EE', date: 'dd.MM.yyyy' },
  es: { locale: 'es-ES', date: 'dd/MM/yyyy' },
};

// lx-ui counts week days from Sunday = 1 (its calendar passes
// firstDayOfTheWeek - 1 to date-fns' weekStartsOn). CLDR starts the week on
// Monday in all four countries.
const MONDAY = 2;

/**
 * createLx date and locale options for a DEFAULT_LANGUAGE value. All four
 * countries use 24-hour time. `locale.masks` is left out on purpose: lx-ui
 * replaces its default masks wholesale when it is set, and otherwise derives
 * the date picker masks from the three formats below.
 */
export default function lxLocaleOptions(defaultLanguage) {
  const { locale, date } = COUNTRY_FORMATS[countryCode(defaultLanguage)];
  return {
    dateFormat: date,
    dateTimeFormat: `${date} HH:mm`,
    dateTimeFullFormat: `${date} HH:mm:ss`,
    locale: { locale, firstDayOfTheWeek: MONDAY },
  };
}

/**
 * Global lx-ui component texts, passed to createLx's `texts` option. They sit
 * below each instance's `texts` prop and replace the Latvian texts built into
 * lx-ui, including the ones no prop reaches (e.g. the LxDynamicImport
 * notifications shown when a page can't load offline). Takes i18n.global.t
 * since it runs outside component setup; the lv values equal lx-ui's defaults.
 */
export function lxGlobalTexts(t) {
  const fieldTexts = {
    emptyValue: t('lx.common.emptyValue'),
    helperTextLabel: t('lx.common.helperTextLabel'),
  };
  const requiredTexts = {
    required: t('lx.forms.required'),
    optional: t('lx.forms.optional'),
    overflowMenu: t('lx.list.overflowMenu'),
  };
  const loadingTexts = {
    loadingStart: t('lx.common.loadingStart'),
    loadingEnd: t('lx.common.loadingEnd'),
  };
  const moreItemsTexts = {
    tooltipDisplayTextSingle: t('lx.common.moreItemsSingle'),
    tooltipDisplayTextMulti: t('lx.common.moreItemsMulti'),
  };
  const errorPageTexts = (code) => ({
    title: t(`lx.errorPage.error${code}.title`),
    description: t(`lx.errorPage.error${code}.description`),
  });

  return {
    LxDynamicImport: {
      offline: t('lx.dynamicImport.offline'),
      loadFailed: t('lx.dynamicImport.loadFailed'),
    },
    LxForm: {
      ...requiredTexts,
      otherActions: t('lx.forms.otherActions'),
      skipLinkLabel: t('lx.forms.skipLink'),
      skipLinkTitle: t('lx.forms.skipLink'),
      previous: t('lx.common.previous'),
      next: t('lx.common.next'),
      additionalActions: t('lx.forms.additionalActions'),
      tableOfContents: t('lx.forms.tableOfContents'),
      tabSelected: t('lx.forms.tabSelected'),
    },
    LxSection: requiredTexts,
    LxTextInput: {
      ...fieldTexts,
      showPassword: t('lx.textInput.showPassword'),
      hidePassword: t('lx.textInput.hidePassword'),
      clearSearch: t('lx.common.clearSearch'),
    },
    // Ends up in every icon's SVG <desc>, so also in the server-rendered text.
    LxIcon: { iconLabel: t('lx.common.iconLabel') },
    LxModal: { close: t('lx.common.close') },
    LxValuePicker: {
      ...fieldTexts,
      ...moreItemsTexts,
      clearQuery: t('lx.common.clearSearch'),
      clearChosen: t('lx.common.clearChosen'),
      notSelected: t('lx.common.notSelected'),
      searchPlaceholder: t('lx.valuePicker.searchPlaceholder'),
      selectAll: t('lx.list.selectAllRows'),
      noItemsMessage: t('lx.valuePicker.noItems'),
    },
    LxAutoComplete: {
      ...fieldTexts,
      ...moreItemsTexts,
      clear: t('lx.autoComplete.clear'),
      empty: t('lx.autoComplete.empty'),
      additionalText: t('lx.autoComplete.additionalText'),
      // lx-ui substitutes {0} itself; vue-i18n would treat it as a list
      // placeholder, so the message uses {query} and gets {0} put back here.
      searchFor: t('lx.autoComplete.searchFor', { query: '{0}' }),
      loadingState: t('lx.common.loadingStart'),
      clearChosen: t('lx.common.clearChosen'),
      selectAll: t('lx.list.selectAllRows'),
    },
    LxToggle: {
      ...fieldTexts,
      valueYes: t('lx.toggle.valueYes'),
      valueNo: t('lx.toggle.valueNo'),
    },
    LxRating: {
      emptyValue: t('lx.common.emptyValue'),
      label: t('lx.rating.label'),
      star1: t('lx.rating.star1'),
      star2: t('lx.rating.star2'),
      star3: t('lx.rating.star3'),
      star4: t('lx.rating.star4'),
      star5: t('lx.rating.star5'),
    },
    // LxToolbar's search texts are the same ones LxList shows in its toolbar.
    LxToolbar: {
      overflowMenu: t('lx.list.overflowMenu'),
      openSearch: t('lx.list.openSearch'),
      closeSearch: t('lx.list.closeSearch'),
      placeholder: t('lx.list.placeholder'),
      search: t('lx.list.search'),
      clear: t('lx.list.clear'),
      selectAllRows: t('lx.list.selectAllRows'),
      clearSelected: t('lx.list.clearSelected'),
    },
    LxInfoBox: { overflowMenu: t('lx.list.overflowMenu') },
    // Global texts win over LxLoaderView's `label` prop, which the app doesn't use.
    LxLoaderView: loadingTexts,
    LxList: loadingTexts,
    LxErrorPage: {
      defaultError401: errorPageTexts(401),
      defaultError403: errorPageTexts(403),
      defaultError404: errorPageTexts(404),
      defaultError500: errorPageTexts(500),
    },
    LxDateTimePicker: {
      ...fieldTexts,
      notSelected: t('lx.common.notSelected'),
      clear: t('lx.dateTimePicker.clear'),
      todayButton: t('lx.dateTimePicker.todayButton'),
      clearButton: t('lx.dateTimePicker.clearButton'),
      next: t('lx.common.next'),
      previous: t('lx.common.previous'),
      nextMonth: t('lx.dateTimePicker.nextMonth'),
      previousMonth: t('lx.dateTimePicker.previousMonth'),
      nextYear: t('lx.dateTimePicker.nextYear'),
      previousYear: t('lx.dateTimePicker.previousYear'),
      nextDecade: t('lx.dateTimePicker.nextDecade'),
      previousDecade: t('lx.dateTimePicker.previousDecade'),
    },
  };
}
