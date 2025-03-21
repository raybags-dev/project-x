const languageFamilies = {
  Germanic: {
    languages: ['English', 'German', 'Dutch', 'Swedish', 'Danish', 'Norwegian'],
    prefixes: ['en_', 'de_', 'nl_', 'sv_', 'da_', 'nb_']
  },
  Romance: {
    languages: [
      'Spanish',
      'French',
      'Italian',
      'Portuguese',
      'Romanian',
      'Catalan'
    ],
    prefixes: ['es_', 'fr_', 'it_', 'pt_', 'ro_', 'ca_']
  },
  Slavic: {
    languages: [
      'Russian',
      'Polish',
      'Croatian',
      'Serbian',
      'Slovenian',
      'Czech',
      'Slovak',
      'Ukrainian',
      'Macedonian'
    ],
    prefixes: ['ru_', 'pl_', 'hr_', 'sr_', 'sl_', 'cs_', 'sk_', 'uk_', 'mk_']
  },
  'Indo-Aryan': {
    languages: ['Hindi', 'Bengali', 'Marathi', 'Urdu', 'Gujarati', 'Nepali'],
    prefixes: ['hi_', 'bn_', 'mr_', 'ur_', 'gu_', 'ne_']
  },
  Semitic: {
    languages: ['Arabic', 'Hebrew'],
    prefixes: ['ar_', 'he_']
  },
  'Sino-Tibetan': {
    languages: ['Chinese', 'Tibetan'],
    prefixes: ['zh_', 'bo_']
  },
  Austronesian: {
    languages: ['Indonesian', 'Malay', 'Filipino', 'Javanese'],
    prefixes: ['id_', 'ms_', 'fil_', 'jv_']
  }
}

// Comprehensive Language Map
const languageMap = {
  // Germanic Languages
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',

  // Romance Languages
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  ro: 'Romanian',
  ca: 'Catalan',

  // Slavic Languages
  ru: 'Russian',
  pl: 'Polish',
  hr: 'Croatian',
  sr: 'Serbian',
  sl: 'Slovenian',
  cs: 'Czech',
  sk: 'Slovak',
  uk: 'Ukrainian',
  mk: 'Macedonian',
  bs: 'Bosnian',

  // Indo-Aryan Languages
  hi: 'Hindi',
  bn: 'Bengali',
  mr: 'Marathi',
  ur: 'Urdu',
  gu: 'Gujarati',
  ne: 'Nepali',
  pa: 'Punjabi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',

  // Semitic Languages
  ar: 'Arabic',
  he: 'Hebrew',

  // Sino-Tibetan Languages
  zh: 'Chinese',
  bo: 'Tibetan',

  // Southeast Asian Languages
  id: 'Indonesian',
  ms: 'Malay',
  fil: 'Filipino',
  jv: 'Javanese',
  th: 'Thai',
  vi: 'Vietnamese',
  km: 'Khmer',
  lo: 'Lao',

  // East Asian Languages
  ja: 'Japanese',
  ko: 'Korean',

  // Other Languages
  ka: 'Georgian',
  kk: 'Kazakh',
  ky: 'Kyrgyz',
  sw: 'Swahili',
  zu: 'Zulu',
  fa: 'Persian',
  tr: 'Turkish',
  el: 'Greek',
  sq: 'Albanian',
  fi: 'Finnish',
  et: 'Estonian',
  lv: 'Latvian',
  lt: 'Lithuanian',
  ga: 'Irish',
  cy: 'Welsh',
  mt: 'Maltese',
  is: 'Icelandic'
}

const localeLanguageMap = {
  es_MX: 'Spanish (Mexico)',
  en_US: 'English (United States)',
  it_IT: 'Italian (Italy)',
  pt_BR: 'Portuguese (Brazil)',
  ja_JP: 'Japanese (Japan)',
  zh_CN: 'Chinese (China)',
  ru_RU: 'Russian (Russia)',
  ar_AE: 'Arabic (UAE)',
  ar_BH: 'Arabic (Bahrain)',
  ar_DZ: 'Arabic (Algeria)',
  ar_EG: 'Arabic (Egypt)',
  ar_IQ: 'Arabic (Iraq)',
  ar_JO: 'Arabic (Jordan)',
  ar_KW: 'Arabic (Kuwait)',
  ar_LB: 'Arabic (Lebanon)',
  ar_LY: 'Arabic (Libya)',
  ar_MA: 'Arabic (Morocco)',
  ar_OM: 'Arabic (Oman)',
  ar_PS: 'Arabic (Palestinian Territories)',
  ar_QA: 'Arabic (Qatar)',
  ar_SA: 'Arabic (Saudi Arabia)',
  ar_SD: 'Arabic (Sudan)',
  ar_SY: 'Arabic (Syria)',
  ar_TN: 'Arabic (Tunisia)',
  ar_YE: 'Arabic (Yemen)',
  bn_IN: 'Bengali (India)',
  bn_BD: 'Bengali (Bangladesh)',
  bs_BA: 'Bosnian (Bosnia and Herzegovina)',
  ca_ES: 'Catalan (Spain)',
  cs_CZ: 'Czech (Czech Republic)',
  da_DK: 'Danish (Denmark)',
  de_AT: 'German (Austria)',
  de_CH: 'German (Switzerland)',
  de_DE: 'German (Germany)',
  el_GR: 'Greek (Greece)',
  en_AU: 'English (Australia)',
  en_CA: 'English (Canada)',
  en_GB: 'English (United Kingdom)',
  en_IN: 'English (India)',
  en_IE: 'English (Ireland)',
  en_NZ: 'English (New Zealand)',
  en_PH: 'English (Philippines)',
  en_SG: 'English (Singapore)',
  en_ZA: 'English (South Africa)',
  es_AR: 'Spanish (Argentina)',
  es_BO: 'Spanish (Bolivia)',
  es_CL: 'Spanish (Chile)',
  es_CO: 'Spanish (Colombia)',
  es_CR: 'Spanish (Costa Rica)',
  es_DO: 'Spanish (Dominican Republic)',
  es_EC: 'Spanish (Ecuador)',
  es_ES: 'Spanish (Spain)',
  es_GT: 'Spanish (Guatemala)',
  es_HN: 'Spanish (Honduras)',
  es_NI: 'Spanish (Nicaragua)',
  es_PA: 'Spanish (Panama)',
  es_PY: 'Spanish (Paraguay)',
  es_PE: 'Spanish (Peru)',
  es_PR: 'Spanish (Puerto Rico)',
  es_SV: 'Spanish (El Salvador)',
  es_UY: 'Spanish (Uruguay)',
  es_VE: 'Spanish (Venezuela)',
  fi_FI: 'Finnish (Finland)',
  fil_PH: 'Filipino (Philippines)',
  fr_BE: 'French (Belgium)',
  fr_CA: 'French (Canada)',
  fr_FR: 'French (France)',
  fr_LU: 'French (Luxembourg)',
  fr_MC: 'French (Monaco)',
  gl_ES: 'Galician (Spain)',
  gu_IN: 'Gujarati (India)',
  hi_IN: 'Hindi (India)',
  hr_HR: 'Croatian (Croatia)',
  hu_HU: 'Hungarian (Hungary)',
  id_ID: 'Indonesian (Indonesia)',
  it_CH: 'Italian (Switzerland)',
  it_IT: 'Italian (Italy)',
  ja_JP: 'Japanese (Japan)',
  jv_ID: 'Javanese (Indonesia)',
  ka_GE: 'Georgian (Georgia)',
  kk_KZ: 'Kazakh (Kazakhstan)',
  km_KH: 'Khmer (Cambodia)',
  kn_IN: 'Kannada (India)',
  ko_KR: 'Korean (South Korea)',
  ky_KG: 'Kyrgyz (Kyrgyzstan)',
  lo_LA: 'Lao (Laos)',
  lt_LT: 'Lithuanian (Lithuania)',
  lv_LV: 'Latvian (Latvia)',
  mk_MK: 'Macedonian (North Macedonia)',
  ml_IN: 'Malayalam (India)',
  mr_IN: 'Marathi (India)',
  ms_MY: 'Malay (Malaysia)',
  mt_MT: 'Maltese (Malta)',
  nb_NO: 'Norwegian Bokmål (Norway)',
  ne_NP: 'Nepali (Nepal)',
  nl_BE: 'Dutch (Belgium)',
  nl_NL: 'Dutch (Netherlands)',
  pl_PL: 'Polish (Poland)',
  pt_PT: 'Portuguese (Portugal)',
  pt_BR: 'Portuguese (Brazil)',
  ro_RO: 'Romanian (Romania)',
  si_LK: 'Sinhala (Sri Lanka)',
  sk_SK: 'Slovak (Slovakia)',
  sl_SI: 'Slovenian (Slovenia)',
  sq_AL: 'Albanian (Albania)',
  sr_RS: 'Serbian (Serbia)',
  sv_SE: 'Swedish (Sweden)',
  sw_KE: 'Swahili (Kenya)',
  ta_IN: 'Tamil (India)',
  te_IN: 'Telugu (India)',
  th_TH: 'Thai (Thailand)',
  tr_TR: 'Turkish (Turkey)',
  uk_UA: 'Ukrainian (Ukraine)',
  ur_PK: 'Urdu (Pakistan)',
  vi_VN: 'Vietnamese (Vietnam)',
  zh_CN: 'Chinese (Simplified, China)',
  zh_TW: 'Chinese (Traditional, Taiwan)',
  zu_ZA: 'Zulu (South Africa)'
}

function identifyLanguageFamily (language) {
  for (const [family, details] of Object.entries(languageFamilies)) {
    if (details.languages.includes(language)) {
      return family
    }
  }
  return 'Other'
}

function validateLanguageMap () {
  const issues = []

  const languageCount = {}
  Object.values(languageMap).forEach(lang => {
    languageCount[lang] = (languageCount[lang] || 0) + 1
  })

  const duplicates = Object.entries(languageCount)
    .filter(([, count]) => count > 1)
    .map(([lang, count]) => `${lang} (${count} occurrences)`)

  if (duplicates.length > 0) {
    issues.push(`Duplicate language names: ${duplicates.join(', ')}`)
  }

  const familyClassification = Object.values(languageMap).reduce(
    (families, lang) => {
      const family = identifyLanguageFamily(lang)
      if (!families[family]) families[family] = []
      families[family].push(lang)
      return families
    },
    {}
  )

  return {
    totalLanguages: Object.keys(languageMap).length,
    languageFamilies: familyClassification,
    issues: issues.length > 0 ? issues : null
  }
}

function parseLocale (localeCode) {
  // Validate input
  if (!localeCode || typeof localeCode !== 'string') {
    return console.log('Invalid locale code: Input must be a non-empty string')
  }

  const localeRegex = /^[a-z]{2}_[A-Z]{2}$/
  if (!localeRegex.test(localeCode)) {
    return console.log(
      `Invalid locale format: ${localeCode}. Expected format: 'xx_YY'`
    )
  }

  const [languageCode, regionCode] = localeCode.split('_')

  if (!languageMap[languageCode]) {
    return console.log(`Unsupported language code: ${languageCode}`)
  }

  // First, check direct mapping
  if (localeLanguageMap[localeCode]) {
    const fullLanguageName = localeLanguageMap[localeCode]

    return {
      fullLanguage: fullLanguageName,
      baseLocale: localeCode,
      language: languageMap[languageCode],
      languageCode: languageCode,
      region: regionCode,
      languageFamily: identifyLanguageFamily(languageMap[languageCode])
    }
  }

  // Fallback parsing
  return {
    fullLanguage: `${languageMap[languageCode]} (${regionCode})`,
    baseLocale: localeCode,
    language: languageMap[languageCode],
    languageCode: languageCode,
    region: regionCode,
    languageFamily: identifyLanguageFamily(languageMap[languageCode])
  }
}

validateLanguageMap()

export default parseLocale
