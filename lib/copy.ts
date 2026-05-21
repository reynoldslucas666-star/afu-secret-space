export type Locale = "en" | "zh";

export const LOCALE_STORAGE_KEY = "afu-locale";

export function nextLocale(current: Locale, _delta: -1 | 1): Locale {
  return current === "en" ? "zh" : "en";
}

export function localeLangAttribute(locale: Locale): string {
  return locale === "zh" ? "zh-Hans" : "en";
}

/** HUD + chrome strings (media / URLs stay the same across locales). */
export const UI = {
  en: {
    siteTitle: "Afu's secret space",
    language: "LANGUAGE",
    langCode: "EN",
    archive: "ARCHIVE_01",
    directory: "DIRECTORY",
    channel: "CHANNEL",
    communicationProtocol: "COMMUNICATION.PROTOCOL",
    addWeChat: "Add Afu's WeChat",
    closeContact: "Close contact window",
    prevLanguage: "Previous language",
    nextLanguage: "Next language",
    prevChannel: "Previous channel",
    nextChannel: "Next channel",
  },
  zh: {
    siteTitle: "阿福的秘密空间",
    language: "语言",
    langCode: "CH",
    archive: "档案_01",
    directory: "目录",
    channel: "频道",
    communicationProtocol: "通讯协议",
    addWeChat: "添加阿富的微信",
    closeContact: "关闭联系窗口",
    prevLanguage: "上一个语言",
    nextLanguage: "下一个语言",
    prevChannel: "上一个频道",
    nextChannel: "下一个频道",
  },
} as const;

/** CTR keyword labels in running text. */
export const CTR_LABEL = {
  en: {
    name: "Liu Nengfu",
    "aigc-intern": "interning on the AIGC product side",
    "live-music": "live sets and room acoustics",
    films: "films wherever they screen",
    exhibitions: "exhibitions with sharp lighting",
    travel: "travel that wanders on purpose",
    "vid-aigc": "AIGC-generated video",
    "vid-live": "live-action",
    "vid-theatrical": "theatrical campaigns",
    contact: "open a line",
  },
  zh: {
    name: "刘能富",
    "aigc-intern": "在 AIGC 产品方向实习",
    "live-music": "现场演出与空间声学",
    films: "各地放映的电影",
    exhibitions: "灯光锐利的展览",
    travel: "有意漫游的旅行",
    "vid-aigc": "AIGC 生成视频",
    "vid-live": "实拍影像",
    "vid-theatrical": "院线战役类宣传",
    contact: "与我联络",
  },
} as const;
