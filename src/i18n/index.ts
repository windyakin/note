import { SITE_LANG } from "astro:env/server";
import en from "./en";
import ja from "./ja";
import zhTW from "./zh-TW";

const messages: Record<string, Record<string, string>> = { en, ja, "zh-TW": zhTW };

type TranslationKey = keyof typeof ja;

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const msg = messages[SITE_LANG]?.[key] ?? en[key];
  if (!params) return msg;
  return msg.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name] ?? ""));
}

export const dateLocale = messages[SITE_LANG]?.["date.locale"] ?? en["date.locale"];

export const htmlLang = messages[SITE_LANG]?.["html.lang"] ?? en["html.lang"];
