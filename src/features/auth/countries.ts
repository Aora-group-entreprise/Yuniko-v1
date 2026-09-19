export type CountryOption = { code: string; flag: string; getName: (locale: string) => string };

export const COUNTRY_CODES = ["AF","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI","CV","KH","CM","CA","KY","CF","TD","CL","CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FK","FO","FJ","FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK","MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR","QA","RE","RO","RU","RW","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES","LK","SD","SR","SJ","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","US","UM","UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE","ZM","ZW"] as const;

const displayNameCache = new Map<string, Intl.DisplayNames>();
function displayNames(locale: string) {
  const key = locale || "en";
  let value = displayNameCache.get(key);
  if (!value) {
    value = new Intl.DisplayNames([key], { type: "region" });
    displayNameCache.set(key, value);
  }
  return value;
}
export function countryFlag(code: string): string {
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
export function countryName(code: string, locale = typeof navigator !== "undefined" ? navigator.language : "en"): string {
  return displayNames(locale).of(code) ?? code;
}
export function getCountryOptions(locale = typeof navigator !== "undefined" ? navigator.language : "en"): CountryOption[] {
  return [...COUNTRY_CODES].map((code) => ({ code, flag: countryFlag(code), getName: (targetLocale: string) => countryName(code, targetLocale) }))
    .sort((a, b) => a.getName(locale).localeCompare(b.getName(locale), locale));
}
