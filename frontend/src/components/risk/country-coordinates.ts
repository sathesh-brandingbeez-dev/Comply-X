export type RegionKey =
  | 'americas'
  | 'europe'
  | 'africa'
  | 'asia'
  | 'middleEast'
  | 'southAsia'
  | 'southeastAsia'
  | 'centralAsia'
  | 'eastAsia'
  | 'oceania'

export interface CountryCoordinate {
  lat: number
  lon: number
  region: RegionKey
}

const BASE_COORDINATES: Record<string, CountryCoordinate> = {
  US: { lat: 38, lon: -97, region: 'americas' },
  CA: { lat: 56, lon: -106, region: 'americas' },
  MX: { lat: 23, lon: -102, region: 'americas' },
  BR: { lat: -10, lon: -55, region: 'americas' },
  AR: { lat: -38, lon: -64, region: 'americas' },
  CL: { lat: -33, lon: -71, region: 'americas' },
  CO: { lat: 4, lon: -74, region: 'americas' },
  PE: { lat: -9, lon: -75, region: 'americas' },
  VE: { lat: 7, lon: -66, region: 'americas' },
  EC: { lat: -1, lon: -78, region: 'americas' },
  BO: { lat: -16, lon: -64, region: 'americas' },
  PY: { lat: -23, lon: -58, region: 'americas' },
  UY: { lat: -33, lon: -56, region: 'americas' },
  GY: { lat: 5, lon: -59, region: 'americas' },
  SR: { lat: 4, lon: -56, region: 'americas' },
  GF: { lat: 4, lon: -53, region: 'americas' },
  GT: { lat: 15, lon: -90, region: 'americas' },
  CR: { lat: 10, lon: -84, region: 'americas' },
  PA: { lat: 9, lon: -79, region: 'americas' },
  HN: { lat: 15, lon: -86, region: 'americas' },
  NI: { lat: 13, lon: -85, region: 'americas' },
  SV: { lat: 13, lon: -88, region: 'americas' },
  CU: { lat: 21, lon: -80, region: 'americas' },
  DO: { lat: 19, lon: -70, region: 'americas' },
  HT: { lat: 19, lon: -72, region: 'americas' },
  JM: { lat: 18, lon: -77, region: 'americas' },
  BS: { lat: 25, lon: -77, region: 'americas' },
  TT: { lat: 10, lon: -61, region: 'americas' },
  BB: { lat: 13, lon: -59, region: 'americas' },
  BZ: { lat: 17, lon: -88, region: 'americas' },
  AG: { lat: 17, lon: -61, region: 'americas' },
  LC: { lat: 13.9, lon: -60.9, region: 'americas' },
  VC: { lat: 13.2, lon: -61.2, region: 'americas' },
  GD: { lat: 12.1, lon: -61.7, region: 'americas' },
  DM: { lat: 15.4, lon: -61.4, region: 'americas' },
  KN: { lat: 17.3, lon: -62.7, region: 'americas' },

  GB: { lat: 55, lon: -3, region: 'europe' },
  IE: { lat: 53, lon: -8, region: 'europe' },
  FR: { lat: 46, lon: 2, region: 'europe' },
  DE: { lat: 51, lon: 10, region: 'europe' },
  ES: { lat: 40, lon: -4, region: 'europe' },
  IT: { lat: 42, lon: 12, region: 'europe' },
  PT: { lat: 39, lon: -8, region: 'europe' },
  NL: { lat: 52, lon: 5, region: 'europe' },
  BE: { lat: 50.5, lon: 4.5, region: 'europe' },
  LU: { lat: 49.6, lon: 6.1, region: 'europe' },
  DK: { lat: 56, lon: 9.5, region: 'europe' },
  NO: { lat: 61, lon: 8, region: 'europe' },
  SE: { lat: 62, lon: 15, region: 'europe' },
  FI: { lat: 64, lon: 26, region: 'europe' },
  IS: { lat: 65, lon: -18, region: 'europe' },
  EE: { lat: 58.6, lon: 25, region: 'europe' },
  LV: { lat: 56.8, lon: 24.6, region: 'europe' },
  LT: { lat: 55.2, lon: 23.9, region: 'europe' },
  PL: { lat: 52, lon: 19, region: 'europe' },
  CZ: { lat: 49.8, lon: 15.5, region: 'europe' },
  SK: { lat: 48.7, lon: 19.7, region: 'europe' },
  AT: { lat: 47.5, lon: 14.5, region: 'europe' },
  HU: { lat: 47, lon: 19, region: 'europe' },
  CH: { lat: 46.8, lon: 8.2, region: 'europe' },
  LI: { lat: 47.1, lon: 9.5, region: 'europe' },
  SI: { lat: 46.1, lon: 14.9, region: 'europe' },
  HR: { lat: 45.1, lon: 15.2, region: 'europe' },
  BA: { lat: 44.2, lon: 17.7, region: 'europe' },
  RS: { lat: 44, lon: 21, region: 'europe' },
  ME: { lat: 42.7, lon: 19.4, region: 'europe' },
  AL: { lat: 41.2, lon: 20, region: 'europe' },
  MK: { lat: 41.6, lon: 21.7, region: 'europe' },
  BG: { lat: 42.7, lon: 25.5, region: 'europe' },
  RO: { lat: 45.9, lon: 24.9, region: 'europe' },
  GR: { lat: 39, lon: 22, region: 'europe' },
  CY: { lat: 35, lon: 33, region: 'europe' },
  TR: { lat: 39, lon: 35, region: 'europe' },
  UA: { lat: 49, lon: 32, region: 'europe' },
  BY: { lat: 53, lon: 27.5, region: 'europe' },
  RU: { lat: 61, lon: 105, region: 'europe' },
  MD: { lat: 47, lon: 29, region: 'europe' },
  GE: { lat: 42, lon: 44, region: 'europe' },
  AM: { lat: 40.1, lon: 45, region: 'europe' },
  AZ: { lat: 40.4, lon: 47.5, region: 'europe' },

  ZA: { lat: -29, lon: 24, region: 'africa' },
  EG: { lat: 26, lon: 30, region: 'africa' },
  NG: { lat: 9, lon: 8, region: 'africa' },
  KE: { lat: 0, lon: 37.9, region: 'africa' },
  TZ: { lat: -6, lon: 35, region: 'africa' },
  ET: { lat: 9, lon: 39, region: 'africa' },
  SD: { lat: 15.6, lon: 32.5, region: 'africa' },
  SS: { lat: 6.8, lon: 30.3, region: 'africa' },
  UG: { lat: 1.3, lon: 32.3, region: 'africa' },
  RW: { lat: -2, lon: 30, region: 'africa' },
  BI: { lat: -3.3, lon: 29.9, region: 'africa' },
  SO: { lat: 6, lon: 46, region: 'africa' },
  DJ: { lat: 11.8, lon: 42.6, region: 'africa' },
  ER: { lat: 15.2, lon: 39.8, region: 'africa' },
  GH: { lat: 7.9, lon: -1, region: 'africa' },
  CI: { lat: 7.5, lon: -5.5, region: 'africa' },
  SN: { lat: 14.5, lon: -14.5, region: 'africa' },
  GM: { lat: 13.5, lon: -15.4, region: 'africa' },
  SL: { lat: 8.5, lon: -11.8, region: 'africa' },
  LR: { lat: 6.4, lon: -9.6, region: 'africa' },
  GN: { lat: 10.4, lon: -10.7, region: 'africa' },
  GW: { lat: 12, lon: -15, region: 'africa' },
  GQ: { lat: 1.6, lon: 10.5, region: 'africa' },
  ST: { lat: 0.2, lon: 6.7, region: 'africa' },
  GA: { lat: -0.6, lon: 11.6, region: 'africa' },
  CM: { lat: 5, lon: 12, region: 'africa' },
  CF: { lat: 6.6, lon: 20.9, region: 'africa' },
  TD: { lat: 15.4, lon: 18.7, region: 'africa' },
  NE: { lat: 17.6, lon: 8.1, region: 'africa' },
  ML: { lat: 17.6, lon: -3.9, region: 'africa' },
  BF: { lat: 12.3, lon: -1.6, region: 'africa' },
  BJ: { lat: 9.3, lon: 2.3, region: 'africa' },
  TG: { lat: 8.5, lon: 1.1, region: 'africa' },
  MR: { lat: 20.2, lon: -10.9, region: 'africa' },
  MA: { lat: 32, lon: -6, region: 'africa' },
  DZ: { lat: 28, lon: 3, region: 'africa' },
  TN: { lat: 34, lon: 9, region: 'africa' },
  LY: { lat: 27, lon: 17, region: 'africa' },
  EH: { lat: 24, lon: -13, region: 'africa' },
  AO: { lat: -12.3, lon: 17.8, region: 'africa' },
  NA: { lat: -22, lon: 17, region: 'africa' },
  BW: { lat: -22, lon: 24, region: 'africa' },
  ZM: { lat: -13, lon: 28, region: 'africa' },
  ZW: { lat: -19, lon: 29, region: 'africa' },
  MZ: { lat: -18, lon: 35, region: 'africa' },
  MW: { lat: -13, lon: 34, region: 'africa' },
  LS: { lat: -29.6, lon: 28.2, region: 'africa' },
  SZ: { lat: -26.5, lon: 31.5, region: 'africa' },
  MG: { lat: -19, lon: 47, region: 'africa' },
  MU: { lat: -20.2, lon: 57.6, region: 'africa' },
  RE: { lat: -21.1, lon: 55.5, region: 'africa' },
  YT: { lat: -12.8, lon: 45.2, region: 'africa' },
  SC: { lat: -4.6, lon: 55.4, region: 'africa' },
  KM: { lat: -11.9, lon: 43.5, region: 'africa' },

  AE: { lat: 24, lon: 54, region: 'middleEast' },
  SA: { lat: 24, lon: 45, region: 'middleEast' },
  QA: { lat: 25.3, lon: 51.2, region: 'middleEast' },
  KW: { lat: 29.3, lon: 47.5, region: 'middleEast' },
  BH: { lat: 26, lon: 50.6, region: 'middleEast' },
  OM: { lat: 21, lon: 57, region: 'middleEast' },
  YE: { lat: 15.6, lon: 48.5, region: 'middleEast' },
  IR: { lat: 32, lon: 53, region: 'middleEast' },
  IQ: { lat: 33, lon: 44, region: 'middleEast' },
  SY: { lat: 35, lon: 38, region: 'middleEast' },
  JO: { lat: 31, lon: 36, region: 'middleEast' },
  LB: { lat: 33.8, lon: 35.8, region: 'middleEast' },
  IL: { lat: 31.5, lon: 35, region: 'middleEast' },
  PS: { lat: 31.9, lon: 35.2, region: 'middleEast' },

  IN: { lat: 21, lon: 78, region: 'southAsia' },
  PK: { lat: 30, lon: 69, region: 'southAsia' },
  BD: { lat: 23.7, lon: 90.3, region: 'southAsia' },
  NP: { lat: 28.4, lon: 84, region: 'southAsia' },
  BT: { lat: 27.5, lon: 90.4, region: 'southAsia' },
  LK: { lat: 7.8, lon: 80.7, region: 'southAsia' },
  MV: { lat: 3.2, lon: 73.2, region: 'southAsia' },
  AF: { lat: 33, lon: 66, region: 'southAsia' },

  CN: { lat: 35, lon: 103, region: 'eastAsia' },
  JP: { lat: 36, lon: 138, region: 'eastAsia' },
  KR: { lat: 36, lon: 127.5, region: 'eastAsia' },
  KP: { lat: 40, lon: 127, region: 'eastAsia' },
  MN: { lat: 46, lon: 105, region: 'eastAsia' },
  TW: { lat: 23.5, lon: 121, region: 'eastAsia' },
  HK: { lat: 22.3, lon: 114.2, region: 'eastAsia' },
  MO: { lat: 22.2, lon: 113.5, region: 'eastAsia' },

  ID: { lat: -2, lon: 118, region: 'southeastAsia' },
  MY: { lat: 4, lon: 109.5, region: 'southeastAsia' },
  SG: { lat: 1.3, lon: 103.8, region: 'southeastAsia' },
  TH: { lat: 15, lon: 101, region: 'southeastAsia' },
  VN: { lat: 16, lon: 107.8, region: 'southeastAsia' },
  PH: { lat: 13, lon: 122, region: 'southeastAsia' },
  KH: { lat: 12.5, lon: 104.9, region: 'southeastAsia' },
  LA: { lat: 18, lon: 103.8, region: 'southeastAsia' },
  MM: { lat: 19, lon: 96, region: 'southeastAsia' },
  BN: { lat: 4.5, lon: 114.7, region: 'southeastAsia' },
  TL: { lat: -8.8, lon: 125.6, region: 'southeastAsia' },

  KZ: { lat: 48, lon: 67, region: 'centralAsia' },
  KG: { lat: 41.2, lon: 74.8, region: 'centralAsia' },
  TJ: { lat: 38.9, lon: 71, region: 'centralAsia' },
  TM: { lat: 39, lon: 59, region: 'centralAsia' },
  UZ: { lat: 41, lon: 64, region: 'centralAsia' },

  AU: { lat: -25, lon: 133, region: 'oceania' },
  NZ: { lat: -41, lon: 174, region: 'oceania' },
  PG: { lat: -6, lon: 147, region: 'oceania' },
  FJ: { lat: -17.8, lon: 178, region: 'oceania' },
  SB: { lat: -9.4, lon: 160, region: 'oceania' },
  VU: { lat: -16, lon: 166, region: 'oceania' },
  WS: { lat: -13.8, lon: -172.1, region: 'oceania' },
  TO: { lat: -21.2, lon: -175.2, region: 'oceania' },
  KI: { lat: 1.9, lon: -157.4, region: 'oceania' },
  TV: { lat: -7.1, lon: 179.2, region: 'oceania' },
  NR: { lat: -0.5, lon: 166.9, region: 'oceania' },
  MH: { lat: 7.1, lon: 171.4, region: 'oceania' },
}

const REGION_DEFAULTS: Record<RegionKey, { lat: number; lon: number }> = {
  americas: { lat: 15, lon: -75 },
  europe: { lat: 48, lon: 15 },
  africa: { lat: 1, lon: 18 },
  asia: { lat: 32, lon: 100 },
  middleEast: { lat: 26, lon: 45 },
  southAsia: { lat: 22, lon: 80 },
  southeastAsia: { lat: 6, lon: 110 },
  centralAsia: { lat: 45, lon: 70 },
  eastAsia: { lat: 35, lon: 120 },
  oceania: { lat: -12, lon: 150 },
}

const REGION_MEMBERS: Record<RegionKey, Set<string>> = {
  americas: new Set([
    'US', 'CA', 'MX', 'BZ', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'DO', 'HT', 'JM', 'BS', 'TT', 'BB',
    'GD', 'VC', 'LC', 'KN', 'DM', 'AG', 'SR', 'GY', 'GF', 'VE', 'CO', 'EC', 'PE', 'BO', 'BR', 'PY', 'UY',
    'AR', 'CL', 'FK'
  ]),
  europe: new Set([
    'AL', 'AD', 'AT', 'BE', 'BA', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB',
    'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO',
    'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA', 'GE', 'AM', 'AZ', 'TR'
  ]),
  africa: new Set([
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'DJ', 'EG', 'ER', 'SZ',
    'ET', 'GA', 'GH', 'GN', 'GM', 'GQ', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA',
    'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG',
    'EH', 'ZM', 'ZW'
  ]),
  asia: new Set(['CN', 'JP', 'KR', 'KP', 'MN', 'TW', 'HK', 'MO']),
  middleEast: new Set(['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'YE', 'IR', 'IQ', 'SY', 'JO', 'LB', 'IL', 'PS']),
  southAsia: new Set(['IN', 'PK', 'BD', 'NP', 'BT', 'LK', 'MV', 'AF']),
  southeastAsia: new Set(['ID', 'MY', 'SG', 'TH', 'VN', 'PH', 'KH', 'LA', 'MM', 'BN', 'TL']),
  centralAsia: new Set(['KZ', 'KG', 'TJ', 'TM', 'UZ']),
  eastAsia: new Set(['CN', 'JP', 'KR', 'KP', 'MN', 'TW', 'HK', 'MO']),
  oceania: new Set(['AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'WS', 'TO', 'KI', 'TV', 'NR', 'MH']),
}

function normalise(code: string): string {
  return code.trim().toUpperCase()
}

function resolveRegion(code: string): RegionKey {
  const upper = normalise(code)
  for (const [region, codes] of Object.entries(REGION_MEMBERS) as [RegionKey, Set<string>][]) {
    if (codes.has(upper)) {
      return region
    }
  }
  const ascii = upper.charCodeAt(0)
  if (ascii <= 70) return 'americas'
  if (ascii <= 77) return 'europe'
  if (ascii <= 82) return 'africa'
  if (ascii <= 87) return 'asia'
  return 'oceania'
}

export function getCountryCoordinate(code: string): CountryCoordinate {
  const upper = normalise(code)
  if (BASE_COORDINATES[upper]) {
    return BASE_COORDINATES[upper]
  }
  const region = resolveRegion(upper)
  const defaultPosition = REGION_DEFAULTS[region]
  const charCodes = upper.split('').map((char) => char.charCodeAt(0))
  const lon = ((charCodes[0] ?? 65) - 65) / 25 * 60 - 30 + defaultPosition.lon
  const lat = defaultPosition.lat + (30 - ((charCodes[1] ?? 70) - 65)) / 10
  return { lat, lon, region }
}
