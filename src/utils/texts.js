import { useI18n } from 'vue-i18n';

export function datePickerLocale() {
  const t = useI18n();
  return {
    locale: t.t('lx.dateTimePicker.locale'),
    placeholder: t.t('lx.dateTimePicker.placeholder'),
  };
}

export function dataGridTexts() {
  const t = useI18n();
  return {
    itemsSelected: {
      singular: t.t('lx.dataGrid.itemsSelected.singular'),
      plural: t.t('lx.dataGrid.itemsSelected.plural'),
      endingWith234: t.t('lx.dataGrid.itemsSelected.endingWith234'),
      endingWith1: t.t('lx.dataGrid.itemsSelected.endingWith1'),
    },
    valueYes: t.t('lx.dataGrid.valueYes'),
    valueNo: t.t('lx.dataGrid.valueNo'),
    items: {
      singular: t.t('lx.dataGrid.items.singular'),
      plural: t.t('lx.dataGrid.items.plural'),
      endingWith234: t.t('lx.dataGrid.items.endingWith234'),
      endingWith1: t.t('lx.dataGrid.items.endingWith1'),
    },
    ofItems: {
      label: t.t('lx.dataGrid.ofItems.label'),
      singular: t.t('lx.dataGrid.ofItems.singular'),
      plural: t.t('lx.dataGrid.ofItems.plural'),
      endingWith234: t.t('lx.dataGrid.ofItems.endingWith234'),
      endingWith1: t.t('lx.dataGrid.ofItems.endingWith1'),
    },
    selected: {
      singular: t.t('lx.dataGrid.selected.singular'),
      plural: t.t('lx.dataGrid.selected.plural'),
      endingWith234: t.t('lx.dataGrid.selected.endingWith234'),
      endingWith1: t.t('lx.dataGrid.selected.endingWith1'),
    },
    of: t.t('lx.dataGrid.of'),
    firstPage: t.t('lx.dataGrid.firstPage'),
    nextPage: t.t('lx.dataGrid.nextPage'),
    previousPage: t.t('lx.dataGrid.previousPage'),
    clear: t.t('lx.dataGrid.clear'),
    itemsPerPage: t.t('lx.dataGrid.itemsPerPage'),
    itemsPerPageLabel: t.t('lx.dataGrid.itemsPerPageLabel'),
    selectAllRows: t.t('lx.dataGrid.selectAllRows'),
    noItems: t.t('lx.dataGrid.noItems'),
    noItemsDescription: t.t('lx.dataGrid.noItemsDescription'),
    iconsResponsiveRowLabel: t.t('lx.dataGrid.iconsResponsiveRowLabel'),
    moreActions: t.t('lx.dataGrid.moreActions'),
    actions: t.t('lx.dataGrid.actions'),
    personDisplay: {
      name: t.t('lx.dataGrid.personDisplay.name'),
      description: t.t('lx.dataGrid.personDisplay.description'),
      role: t.t('lx.dataGrid.personDisplay.role'),
      institution: t.t('lx.dataGrid.personDisplay.institution'),
    },
  };
}

export function datePickerTexts() {
  const t = useI18n();
  return {
    clear: t.t('lx.dateTimePicker.clear'),
    todayButton: t.t('lx.dateTimePicker.todayButton'),
    nowButton: t.t('lx.dateTimePicker.nowButton'),
    clearButton: t.t('lx.dateTimePicker.clearButton'),
    next: t.t('lx.dateTimePicker.next'),
    previous: t.t('lx.dateTimePicker.previous'),
    doNotIndicateStart: t.t('lx.dateTimePicker.doNotIndicateStart'),
    doNotIndicateEnd: t.t('lx.dateTimePicker.doNotIndicateEnd'),
  };
}

export function listTexts() {
  const t = useI18n();
  return {
    clear: t.t('lx.list.clear'),
    placeholder: t.t('lx.list.placeholder'),
    notFoundSearch: t.t('lx.list.notFoundSearch'),
    noItems: t.t('lx.list.noItems'),
    noItemsDescription: t.t('lx.list.noItemsDescription'),
    loadMore: t.t('lx.list.loadMore'),
    search: t.t('lx.list.search'),
    items: {
      singular: t.t('lx.list.items.singular'),
      plural: t.t('lx.list.items.plural'),
      endingWith234: t.t('lx.list.items.endingWith234'),
      endingWith1: t.t('lx.list.items.endingWith1'),
    },
    ofItems: {
      label: t.t('lx.list.ofItems.label'),
      singular: t.t('lx.list.ofItems.singular'),
      plural: t.t('lx.list.ofItems.plural'),
      endingWith234: t.t('lx.list.ofItems.endingWith234'),
      endingWith1: t.t('lx.list.ofItems.endingWith1'),
    },
    selected: {
      singular: t.t('lx.list.selected.singular'),
      plural: t.t('lx.list.selected.plural'),
      endingWith234: t.t('lx.list.selected.endingWith234'),
      endingWith1: t.t('lx.list.selected.endingWith1'),
    },
    of: t.t('lx.list.of'),
    clearSelected: t.t('lx.list.clearSelected'),
    selectAllRows: t.t('lx.list.selectAllRows'),
    selectWholeGroup: t.t('lx.list.selectWholeGroup'),
    loadingError: t.t('lx.list.loadingError'),
    reload: t.t('lx.list.reload'),
    collapse: t.t('lx.list.collapse'),
    expand: t.t('lx.list.expand'),
    openSearch: t.t('lx.list.openSearch'),
    closeSearch: t.t('lx.list.closeSearch'),
  };
}

export function shellTexts() {
  const t = useI18n();
  return {
    defaultBack: t.t('lx.shell.defaultBack'),
    logOut: t.t('lx.shell.logOut'),
    openAlerts: t.t('lx.shell.openAlerts'),
    openNavbar: t.t('lx.shell.openNavbar'),
    helpTitle: t.t('lx.shell.helpTitle'),
    alertsTitle: t.t('lx.shell.alertsTitle'),
    languagesTitle: t.t('lx.shell.languagesTitle'),
    contextPersonTitle: t.t('lx.shell.contextPersonTitle'),
    close: t.t('lx.shell.close'),
    contextPersonsLabel: t.t('lx.shell.contextPersonsLabel'),
    contextPersonsOwnData: t.t('lx.shell.contextPersonsOwnData'),
    alternativeProfilesLabel: t.t('lx.shell.alternativeProfilesLabel'),
    contextPersonsButtonLabel: t.t('lx.shell.contextPersonsButtonLabel'),
    alternativeProfilesButtonLabel: t.t('lx.shell.alternativeProfilesButtonLabel'),
    idleModalLabel: t.t('lx.shell.idleModalLabel'),
    idleModalPrimaryLabel: t.t('lx.shell.idleModalPrimaryLabel'),
    idleModalSecondaryLabel: t.t('lx.shell.idleModalSecondaryLabel'),
    descriptionMinutes: t.t('lx.shell.descriptionMinutes'),
    descriptionMinutesSmall: t.t('lx.shell.descriptionMinutesSmall'),
    idleDescription: t.t('lx.shell.idleDescription'),
    themeTitle: t.t('lx.shell.themeTitle'),
    themeAuto: t.t('lx.shell.themeAuto'),
    themeLight: t.t('lx.shell.themeLight'),
    themeDark: t.t('lx.shell.themeDark'),
    themeContrast: t.t('lx.shell.themeContrast'),
    animations: t.t('lx.shell.animations'),
    confirmModalSecondaryDefaultLabel: t.t('lx.shell.confirmModalSecondaryDefaultLabel'),
    confirmModalPrimaryDefaultLabel: t.t('lx.shell.confirmModalPrimaryDefaultLabel'),
    previousAlertTitle: t.t('lx.shell.previousAlertTitle'),
    nextAlertTitle: t.t('lx.shell.nextAlertTitle'),
    userTitle: t.t('lx.shell.userTitle'),
    menu: t.t('lx.shell.menu'),
    fonts: t.t('lx.shell.fonts'),
    showAllLabel: t.t('lx.shell.showAllLabel'),
    megaMenuTitle: t.t('lx.shell.megaMenuTitle'),
    reduceMotionOff: t.t('lx.shell.reduceMotionOff'),
    reduceMotionOn: t.t('lx.shell.reduceMotionOn'),
    systemFontsOff: t.t('lx.shell.systemFontsOff'),
    systemFontsOn: t.t('lx.shell.systemFontsOn'),
    successSvgTitle: t.t('lx.shell.successSvgTitle'),
    warningSvgTitle: t.t('lx.shell.warningSvgTitle'),
    errorSvgTitle: t.t('lx.shell.errorSvgTitle'),
    infoSvgTitle: t.t('lx.shell.infoSvgTitle'),
    svgTitle: t.t('lx.shell.svgTitle'),
    skipLinkLabel: t.t('lx.shell.skipLinkLabel'),
    skipLinkTitle: t.t('lx.shell.skipLinkTitle'),
  };
}

export function fileUploaderTexts() {
  const t = useI18n();
  return {
    clear: t.t('lx.fileUploader.clear'),
    buttonLabel: t.t('lx.fileUploader.buttonLabel'),
    uploaderDescription: t.t('lx.fileUploader.uploaderDescription'),
    draggablePlaceholder: t.t('lx.fileUploader.draggablePlaceholder'),
    placeholder: t.t('lx.fileUploader.placeholder'),
    notFoundSearch: t.t('lx.fileUploader.notFoundSearch'),
    close: t.t('lx.fileUploader.close'),
    noItems: t.t('lx.fileUploader.noItems'),
    infoButton: t.t('lx.fileUploader.infoButton'),
    download: t.t('lx.fileUploader.download'),
    metaPreviewLabel: t.t('lx.fileUploader.metaPreviewLabel'),
    metaMainLabel: t.t('lx.fileUploader.metaMainLabel'),
    metaMainAuthor: t.t('lx.fileUploader.metaMainAuthor'),
    metaMainFormat: t.t('lx.fileUploader.metaMainFormat'),
    metaMainImageDimensions: t.t('lx.fileUploader.metaMainImageDimensions'),
    metaMainLastModified: t.t('lx.fileUploader.metaMainLastModified'),
    metaMainDateCreated: t.t('lx.fileUploader.metaMainDateCreated'),
    metaMainDataSize: t.t('lx.fileUploader.metaMainDataSize'),
    metaAdditionalLabel: t.t('lx.fileUploader.metaAdditionalLabel'),
    metaLocationLabel: t.t('lx.fileUploader.metaLocationLabel'),
    metaLocationLatitude: t.t('lx.fileUploader.metaLocationLatitude'),
    metaLocationLongitude: t.t('lx.fileUploader.metaLocationLongitude'),
    metaLocationAltitude: t.t('lx.fileUploader.metaLocationAltitude'),
    metaImageLabel: t.t('lx.fileUploader.metaImageLabel'),
    metaImageWidth: t.t('lx.fileUploader.metaImageWidth'),
    metaImageHeight: t.t('lx.fileUploader.metaImageHeight'),
    metaImageHorizontalResolution: t.t('lx.fileUploader.metaImageHorizontalResolution'),
    metaImageVerticalResolution: t.t('lx.fileUploader.metaImageVerticalResolution'),
    metaImageCopyright: t.t('lx.fileUploader.metaImageCopyright'),
    metaCameraBrand: t.t('lx.fileUploader.metaCameraBrand'),
    metaCameraModel: t.t('lx.fileUploader.metaCameraModel'),
    metaFocusLength: t.t('lx.fileUploader.metaFocusLength'),
    metaFStop: t.t('lx.fileUploader.metaFStop'),
    metaExposure: t.t('lx.fileUploader.metaExposure'),
    metaISO: t.t('lx.fileUploader.metaISO'),
    metaExposureBias: t.t('lx.fileUploader.metaExposureBias'),
    metaFlash: t.t('lx.fileUploader.metaFlash'),
    metaColorSpace: t.t('lx.fileUploader.metaColorSpace'),
    metaDateTime: t.t('lx.fileUploader.metaDateTime'),
    metaArchiveContentLabel: t.t('lx.fileUploader.metaArchiveContentLabel'),
    metaAdditionalInfoSizeTitle: t.t('lx.fileUploader.metaAdditionalInfoSizeTitle'),
    metaAdditionalInfoExtensionTitle: t.t('lx.fileUploader.metaAdditionalInfoExtensionTitle'),
    metaAdditionalInfoResolutionTitle: t.t('lx.fileUploader.metaAdditionalInfoResolutionTitle'),
    metaAdditionalInfoFileCountTitle: t.t('lx.fileUploader.metaAdditionalInfoFileCountTitle'),
    metaAdditionalInfoFileCountLabelSingle: t.t(
      'lx.fileUploader.metaAdditionalInfoFileCountLabelSingle'
    ),
    metaAdditionalInfoFileCountLabelMulti: t.t(
      'lx.fileUploader.metaAdditionalInfoFileCountLabelMulti'
    ),
    metaAdditionalInfoProtectedArchive: t.t('lx.fileUploader.metaAdditionalInfoProtectedArchive'),
    metaAdditionalInfoPageCountTitle: t.t('lx.fileUploader.metaAdditionalInfoPageCountTitle'),
    metaAdditionalInfoSlideCountTitle: t.t('lx.fileUploader.metaAdditionalInfoSlideCountTitle'),
    metaAdditionalInfoPageCountLabelSingle: t.t(
      'lx.fileUploader.metaAdditionalInfoPageCountLabelSingle'
    ),
    metaAdditionalInfoPageCountLabelMulti: t.t(
      'lx.fileUploader.metaAdditionalInfoPageCountLabelMulti'
    ),
    metaAdditionalInfoSlideCountLabelSingle: t.t(
      'lx.fileUploader.metaAdditionalInfoSlideCountLabelSingle'
    ),
    metaAdditionalInfoSlideCountLabelMulti: t.t(
      'lx.fileUploader.metaAdditionalInfoSlideCountLabelMulti'
    ),
    metaAdditionalInfoeSigned: t.t('lx.fileUploader.metaAdditionalInfoeSigned'),
    metaAdditionalInfoc2paSigned: t.t('lx.fileUploader.metaAdditionalInfoc2paSigned'),
    metaAdditionalInfoAiCreated: t.t('lx.fileUploader.metaAdditionalInfoAiCreated'),
    metaMainTitle: t.t('lx.fileUploader.metaMainTitle'),
    metaMainDescription: t.t('lx.fileUploader.metaMainDescription'),
    metaEDocContentLabel: t.t('lx.fileUploader.metaEDocContentLabel'),
    metaEdocArchiveContentLabel: t.t('lx.fileUploader.metaEdocArchiveContentLabel'),
  };
}

export function useFileUploaderTexts() {
  const t = useI18n();

  return {
    clear: t.t('lx.fileUploader.clear'),
    buttonLabel: t.t('lx.fileUploader.buttonLabel'),
    uploaderDescription: t.t('lx.fileUploader.uploaderDescription'),
    draggablePlaceholder: t.t('lx.fileUploader.draggablePlaceholder'),
    placeholder: t.t('lx.fileUploader.placeholder'),
    notFoundSearch: t.t('lx.fileUploader.notFoundSearch'),
    close: t.t('lx.fileUploader.close'),
    noItems: t.t('lx.fileUploader.noItems'),
    infoButton: t.t('lx.fileUploader.infoButton'),
    download: t.t('lx.fileUploader.download'),
    metaPreviewLabel: t.t('lx.fileUploader.metaPreviewLabel'),
    metaMainLabel: t.t('lx.fileUploader.metaMainLabel'),
    metaMainAuthor: t.t('lx.fileUploader.metaMainAuthor'),
    metaMainFormat: t.t('lx.fileUploader.metaMainFormat'),
    metaMainImageDimensions: t.t('lx.fileUploader.metaMainImageDimensions'),
    metaMainLastModified: t.t('lx.fileUploader.metaMainLastModified'),
    metaMainDateCreated: t.t('lx.fileUploader.metaMainDateCreated'),
    metaMainDataSize: t.t('lx.fileUploader.metaMainDataSize'),
    metaAdditionalLabel: t.t('lx.fileUploader.metaAdditionalLabel'),
    metaLocationLabel: t.t('lx.fileUploader.metaLocationLabel'),
    metaLocationLatitude: t.t('lx.fileUploader.metaLocationLatitude'),
    metaLocationLongitude: t.t('lx.fileUploader.metaLocationLongitude'),
    metaLocationAltitude: t.t('lx.fileUploader.metaLocationAltitude'),
    metaImageLabel: t.t('lx.fileUploader.metaImageLabel'),
    metaImageWidth: t.t('lx.fileUploader.metaImageWidth'),
    metaImageHeight: t.t('lx.fileUploader.metaImageHeight'),
    metaImageHorizontalResolution: t.t('lx.fileUploader.metaImageHorizontalResolution'),
    metaImageVerticalResolution: t.t('lx.fileUploader.metaImageVerticalResolution'),
    metaImageCopyright: t.t('lx.fileUploader.metaImageCopyright'),
    metaCameraBrand: t.t('lx.fileUploader.metaCameraBrand'),
    metaCameraModel: t.t('lx.fileUploader.metaCameraModel'),
    metaFocusLength: t.t('lx.fileUploader.metaFocusLength'),
    metaFStop: t.t('lx.fileUploader.metaFStop'),
    metaExposure: t.t('lx.fileUploader.metaExposure'),
    metaISO: t.t('lx.fileUploader.metaISO'),
    metaExposureBias: t.t('lx.fileUploader.metaExposureBias'),
    metaFlash: t.t('lx.fileUploader.metaFlash'),
    metaColorSpace: t.t('lx.fileUploader.metaColorSpace'),
    metaDateTime: t.t('lx.fileUploader.metaDateTime'),
    metaArchiveContentLabel: t.t('lx.fileUploader.metaArchiveContentLabel'),
    metaAdditionalInfoSizeTitle: t.t('lx.fileUploader.metaAdditionalInfoSizeTitle'),
    metaAdditionalInfoExtensionTitle: t.t('lx.fileUploader.metaAdditionalInfoExtensionTitle'),
    metaAdditionalInfoResolutionTitle: t.t('lx.fileUploader.metaAdditionalInfoResolutionTitle'),
    metaAdditionalInfoFileCountTitle: t.t('lx.fileUploader.metaAdditionalInfoFileCountTitle'),
    metaAdditionalInfoFileCountLabelSingle: t.t(
      'lx.fileUploader.metaAdditionalInfoFileCountLabelSingle'
    ),
    metaAdditionalInfoFileCountLabelMulti: t.t(
      'lx.fileUploader.metaAdditionalInfoFileCountLabelMulti'
    ),
    metaAdditionalInfoProtectedArchive: t.t('lx.fileUploader.metaAdditionalInfoProtectedArchive'),
    metaAdditionalInfoPageCountTitle: t.t('lx.fileUploader.metaAdditionalInfoPageCountTitle'),
    metaAdditionalInfoSlideCountTitle: t.t('lx.fileUploader.metaAdditionalInfoSlideCountTitle'),
    metaAdditionalInfoPageCountLabelSingle: t.t(
      'lx.fileUploader.metaAdditionalInfoPageCountLabelSingle'
    ),
    metaAdditionalInfoPageCountLabelMulti: t.t(
      'lx.fileUploader.metaAdditionalInfoPageCountLabelMulti'
    ),
    metaAdditionalInfoSlideCountLabelSingle: t.t(
      'lx.fileUploader.metaAdditionalInfoSlideCountLabelSingle'
    ),
    metaAdditionalInfoSlideCountLabelMulti: t.t(
      'lx.fileUploader.metaAdditionalInfoSlideCountLabelMulti'
    ),
    metaMainTitle: t.t('lx.fileUploader.metaMainTitle'),
    metaMainDescription: t.t('lx.fileUploader.metaMainDescription'),
  };
}

export function formTexts() {
  const t = useI18n();

  return {
    otherActions: t.t('lx.forms.otherActions'),
    required: t.t('lx.forms.required'),
    optional: t.t('lx.forms.optional'),
  };
}

export function masterDetailTexts() {
  const t = useI18n();

  return {
    add: t.t('lx.masterDetail.add'),
    noData: t.t('lx.masterDetail.noData'),
    noDataDescription: t.t('lx.masterDetail.noDataDescription'),
    back: t.t('lx.masterDetail.back'),
  };
}

export function filterTexts() {
  const t = useI18n();

  return {
    filters: t.t('lx.filters.filters'),
    search: t.t('lx.filters.search'),
    clear: t.t('lx.filters.clear'),
    fastFiltersLabel: t.t('lx.filters.fastFiltersLabel'),
  };
}

export function autoCompleteTexts() {
  const t = useI18n();

  return {
    clear: t.t('lx.autoComplete.clear'),
    empty: t.t('lx.autoComplete.empty'),
    tryEndingWith1: t.t('lx.autoComplete.tryEndingWith1'),
    try: t.t('lx.autoComplete.try'),
    tooltipDisplayTextSingle: t.t('lx.autoComplete.tooltipDisplayTextSingle'),
    tooltipDisplayTextMulti: t.t('lx.autoComplete.tooltipDisplayTextMulti'),
    detailsSwitchAdvancedSearch: t.t('lx.autoComplete.detailsSwitchAdvancedSearch'),
    detailsSwitchSelectedItems: t.t('lx.autoComplete.detailsSwitchSelectedItems'),
    detailsButton: t.t('lx.autoComplete.detailsButton'),
    detailsModalLabel: t.t('lx.autoComplete.detailsModalLabel'),
    clearChosen: t.t('lx.autoComplete.clearChosen'),
    selectAll: t.t('lx.autoComplete.selectAll'),
  };
}

export function markDownTextAreaTexts() {
  const t = useI18n();

  const texts = {
    undo: t.t('lx.markDownTextArea.undo'),
    redo: t.t('lx.markDownTextArea.redo'),
    bold: t.t('lx.markDownTextArea.bold'),
    italic: t.t('lx.markDownTextArea.italic'),
    underline: t.t('lx.markDownTextArea.underline'),
    strikethrough: t.t('lx.markDownTextArea.strikethrough'),
    color: t.t('lx.markDownTextArea.color'),
    clear: t.t('lx.markDownTextArea.clear'),
    heading: t.t('lx.markDownTextArea.heading'),
    headingH1: t.t('lx.markDownTextArea.headingH1'),
    headingH2: t.t('lx.markDownTextArea.headingH2'),
    headingH3: t.t('lx.markDownTextArea.headingH3'),
    headingH4: t.t('lx.markDownTextArea.headingH4'),
    headingH5: t.t('lx.markDownTextArea.headingH5'),
    headingH6: t.t('lx.markDownTextArea.headingH6'),
    bulleted: t.t('lx.markDownTextArea.bulleted'),
    numbered: t.t('lx.markDownTextArea.numbered'),
    link: t.t('lx.markDownTextArea.link'),
    image: t.t('lx.markDownTextArea.image'),
    templatePicker: t.t('lx.markDownTextArea.templatePicker'),
    modalLabel: t.t('lx.markDownTextArea.modalLabel'),
    modalDescription: t.t('lx.markDownTextArea.modalDescription'),
    save: t.t('lx.markDownTextArea.save'),
    close: t.t('lx.markDownTextArea.close'),
    imageModalLabel: t.t('lx.markDownTextArea.imageModalLabel'),
    imageModalLinkDescription: t.t('lx.markDownTextArea.imageModalLinkDescription'),
    imageModalAltDescription: t.t('lx.markDownTextArea.imageModalAltDescription'),
    imageModalTitleDescription: t.t('lx.markDownTextArea.imageModalTitleDescription'),
    invalidImageLink: t.t('lx.markDownTextArea.invalidImageLink'),
    chooseFile: t.t('lx.markDownTextArea.chooseFile'),
    imageModalFileDescription: t.t('lx.markDownTextArea.imageModalFileDescription'),
    inputTypeUrl: t.t('lx.markDownTextArea.inputTypeUrl'),
    inputTypeFile: t.t('lx.markDownTextArea.inputTypeFile'),
  };

  return texts;
}
