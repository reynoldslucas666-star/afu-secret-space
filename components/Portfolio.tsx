"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CTR_LABEL,
  LOCALE_STORAGE_KEY,
  type Locale,
  localeLangAttribute,
  nextLocale,
  UI,
} from "@/lib/copy";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/** Contact modal only — still PNG. */
const IMG = {
  contact: "/assets/images/lianxifangshi.png",
} as const;

/** CTR fullscreen clips (from afu-archive-assets/images/*.mp4). */
const CTR_VID = {
  liunengfu: "/assets/video/liunengfu.mp4",
  aigcIntern: "/assets/video/AIGCshixi.mp4",
  yanchu: "/assets/video/yanchu.mp4",
  dianying: "/assets/video/dianying.mp4",
  zhanlan: "/assets/video/zhanlan.mp4",
  lvxing: "/assets/video/lvxing.mp4",
} as const;

const VID = {
  default: "/assets/video/background-loop.mp4",
  aigc: "/assets/video/aigc-bg.mp4",
  live: "/assets/video/live-action-bg.mp4",
  theatrical: "/assets/video/theatrical-bg.mp4",
} as const;

/** Short wipe/glitch clip before every CTR open/close — add your file at this path. */
const TRANSITION = "/assets/video/transition.mp4";
const GLITCH_BARS_MP4 = "/assets/video/glitch-bars.mp4";
const GLITCH_BARS_MOV = "/assets/video/glitch-bars.mov";
const CURSOR_DEFAULT = "/assets/images/cursor-default.png";
const CURSOR_POINTER = "/assets/images/cursor-pointer.png";

const SOCIAL_LINKS = [
  { label: "INSTAGRAM", href: "https://www.instagram.com/my_afuuuu/" },
  { label: "REDNOTE", href: "https://www.xiaohongshu.com/user/profile/621a328d00000000100089d3" },
  { label: "EMAIL", href: "mailto:afuuuu0608@163.com" },
] as const;

type VideoKey = keyof typeof VID;

/** One CHANNEL per CTR keyword, in order of appearance in the bio copy. */
const CTR_CHANNEL_BY_ID = {
  name: 1,
  "aigc-intern": 2,
  "live-music": 3,
  films: 4,
  exhibitions: 5,
  travel: 6,
  "vid-aigc": 7,
  "vid-live": 8,
  "vid-theatrical": 9,
  contact: 10,
} as const;

type CtrId = keyof typeof CTR_CHANNEL_BY_ID;
type ChannelIndex = (typeof CTR_CHANNEL_BY_ID)[CtrId];

function channelForCtr(ctrId: string): ChannelIndex {
  return CTR_CHANNEL_BY_ID[ctrId as CtrId] ?? 1;
}

/** Channel order for tuner prev/next (01 → 10, wraps). */
const CTR_TUNER = [
  { ctrId: "name", channel: 1, target: { kind: "video", src: CTR_VID.liunengfu } },
  { ctrId: "aigc-intern", channel: 2, target: { kind: "video", src: CTR_VID.aigcIntern } },
  { ctrId: "live-music", channel: 3, target: { kind: "video", src: CTR_VID.yanchu } },
  { ctrId: "films", channel: 4, target: { kind: "video", src: CTR_VID.dianying } },
  { ctrId: "exhibitions", channel: 5, target: { kind: "video", src: CTR_VID.zhanlan } },
  { ctrId: "travel", channel: 6, target: { kind: "video", src: CTR_VID.lvxing } },
  { ctrId: "vid-aigc", channel: 7, target: { kind: "background", key: "aigc" } },
  { ctrId: "vid-live", channel: 8, target: { kind: "background", key: "live" } },
  { ctrId: "vid-theatrical", channel: 9, target: { kind: "background", key: "theatrical" } },
  { ctrId: "contact", channel: 10, target: "contact" },
] as const satisfies ReadonlyArray<{
  ctrId: CtrId;
  channel: ChannelIndex;
  target: CtrMedia | "contact";
}>;

const MEDIA_CHANNEL_MAX = 9;
const CONTACT_CHANNEL = 10;

/** Forward: 01→…→09→10 (contact)→01. Back: never 01→10; 01→09, 10→09. */
function channelAfterStep(current: number, delta: -1 | 1): ChannelIndex {
  if (delta === 1) {
    if (current === 0) return 1;
    if (current >= CONTACT_CHANNEL) return 1;
    return (current + 1) as ChannelIndex;
  }
  if (current === 0) return MEDIA_CHANNEL_MAX as ChannelIndex;
  if (current === 1) return MEDIA_CHANNEL_MAX as ChannelIndex;
  if (current === CONTACT_CHANNEL) return MEDIA_CHANNEL_MAX as ChannelIndex;
  return (current - 1) as ChannelIndex;
}

function tunerEntryForChannel(ch: ChannelIndex) {
  return CTR_TUNER.find((e) => e.channel === ch);
}

/** CTR target: image, fullscreen video (replaces png), or background feature reel. */
export type CtrMedia =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "background"; key: Exclude<VideoKey, "default"> };

type PendingTransition =
  | { action: "open"; ctrId: string; channel: ChannelIndex; target: CtrMedia | "contact" }
  | { action: "close" };

function formatChannel(n: number) {
  return String(n).padStart(2, "0");
}

/** In Chinese mode, render Latin/digits in VT323 via .crt-latin. */
function MixText({ text, active }: { text: string; active?: boolean }) {
  if (!active) return text;
  const parts = text.split(/(\p{Script=Latin}+|\p{N}+|_[0-9]+)/gu);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (
          /^\p{Script=Latin}+$/u.test(part) ||
          /^\p{N}+$/u.test(part) ||
          /^_[0-9]+$/.test(part)
        ) {
          return (
            <span key={`${i}-${part}`} className="crt-latin">
              {part}
            </span>
          );
        }
        return <span key={`${i}-${part}`}>{part}</span>;
      })}
    </>
  );
}

export default function Portfolio() {
  const [bgSrc, setBgSrc] = useState<string>(VID.default);
  const [activeMedia, setActiveMedia] = useState<CtrMedia | null>(null);
  const [activeCtrId, setActiveCtrId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hudTime, setHudTime] = useState("");
  const [useCustomCursor, setUseCustomCursor] = useState(false);
  const [cursorState, setCursorState] = useState({ x: 0, y: 0, visible: false, interactive: false });
  const [channel, setChannel] = useState(0);
  const [locale, setLocale] = useState<Locale>("en");

  const contactDismissGuardUntil = useRef(0);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const ctrVideoRef = useRef<HTMLVideoElement | null>(null);
  const transitionRef = useRef<HTMLVideoElement | null>(null);
  const pendingRef = useRef<PendingTransition | null>(null);
  const transitionDoneRef = useRef(false);

  const applyPending = useCallback((pending: PendingTransition) => {
    if (pending.action === "close") {
      setActiveCtrId(null);
      setActiveMedia(null);
      setContactOpen(false);
      setBgSrc(VID.default);
      setChannel(0);
      return;
    }

    setActiveCtrId(pending.ctrId);
    setChannel(pending.channel);

    if (pending.target === "contact") {
      contactDismissGuardUntil.current = Date.now() + 500;
      setActiveMedia(null);
      setBgSrc(VID.default);
      setContactOpen(true);
      return;
    }

    setContactOpen(false);
    setActiveMedia(pending.target);

    if (pending.target.kind === "background") {
      setBgSrc(VID[pending.target.key]);
    } else {
      setBgSrc(VID.default);
    }
  }, []);

  const finishTransition = useCallback(() => {
    if (transitionDoneRef.current) return;
    transitionDoneRef.current = true;

    const pending = pendingRef.current;
    if (pending?.action === "close") {
      applyPending(pending);
    }
    pendingRef.current = null;
    setIsTransitioning(false);
  }, [applyPending]);

  const closeContactImmediate = useCallback(() => {
    setActiveCtrId(null);
    setActiveMedia(null);
    setContactOpen(false);
    setBgSrc(VID.default);
    setChannel(0);
  }, []);

  const openContactImmediate = useCallback((ctrId: string, ch: ChannelIndex) => {
    contactDismissGuardUntil.current = Date.now() + 500;
    setActiveCtrId(ctrId);
    setChannel(ch);
    setActiveMedia(null);
    setBgSrc(VID.default);
    setContactOpen(true);
  }, []);

  const startTransition = useCallback(
    (pending: PendingTransition) => {
      if (isTransitioning) return;
      transitionDoneRef.current = false;

      if (pending.action === "open") {
        // Mount next clip under the wipe immediately so there is no dead air after transition ends.
        applyPending(pending);
      } else {
        pendingRef.current = pending;
        setBgSrc(VID.default);
      }

      setIsTransitioning(true);
    },
    [isTransitioning, applyPending],
  );

  useEffect(() => {
    if (!isTransitioning) return;
    const el = transitionRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.muted = false;
    el.volume = 1;
    void el.play().catch(() => finishTransition());
  }, [isTransitioning, finishTransition]);

  useEffect(() => {
    if (!isTransitioning) transitionDoneRef.current = false;
  }, [isTransitioning]);

  useEffect(() => {
    if (activeMedia?.kind !== "video") return;
    const el = ctrVideoRef.current;
    if (!el) return;
    el.muted = isTransitioning;
    if (!isTransitioning) {
      el.volume = 1;
      void el.play().catch(() => {});
    }
  }, [activeMedia, isTransitioning]);

  const handleCtrClick = useCallback(
    (ctrId: string, ch: ChannelIndex, target: CtrMedia | "contact") => {
      if (isTransitioning) return;

      if (target === "contact") {
        if (contactOpen && activeCtrId === ctrId) {
          closeContactImmediate();
        } else {
          openContactImmediate(ctrId, ch);
        }
        return;
      }

      if (activeCtrId === ctrId) {
        startTransition({ action: "close" });
        return;
      }

      startTransition({ action: "open", ctrId, channel: ch, target });
    },
    [activeCtrId, contactOpen, isTransitioning, startTransition, openContactImmediate, closeContactImmediate],
  );

  const dismissToDefault = useCallback(() => {
    if (isTransitioning) return;
    if (contactOpen) {
      closeContactImmediate();
      return;
    }
    if (!activeCtrId) return;
    startTransition({ action: "close" });
  }, [activeCtrId, contactOpen, isTransitioning, startTransition, closeContactImmediate]);

  const dismissContact = useCallback((force: boolean) => {
    if (!force && Date.now() < contactDismissGuardUntil.current) return;
    closeContactImmediate();
  }, [closeContactImmediate]);

  const previewChannel = useCallback((ch: ChannelIndex) => {
    setChannel(ch);
  }, []);

  const clearPreviewChannel = useCallback(() => {
    if (activeCtrId || contactOpen || isTransitioning) return;
    setChannel(0);
  }, [activeCtrId, contactOpen, isTransitioning]);

  const stepChannel = useCallback(
    (delta: -1 | 1) => {
      if (isTransitioning) return;

      const current = contactOpen ? CONTACT_CHANNEL : channel > 0 ? channel : 0;
      const next = channelAfterStep(current, delta);
      const entry = tunerEntryForChannel(next);
      if (!entry) return;

      const onSame =
        activeCtrId === entry.ctrId &&
        (entry.target === "contact" ? contactOpen : !contactOpen && activeMedia !== null);
      if (onSame) return;

      startTransition({
        action: "open",
        ctrId: entry.ctrId,
        channel: entry.channel,
        target: entry.target,
      });
    },
    [activeCtrId, activeMedia, channel, contactOpen, isTransitioning, startTransition],
  );

  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    dismissToDefault();
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "en" || stored === "zh") setLocale(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeLangAttribute(locale);
    document.documentElement.dataset.locale = locale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const stepLocale = useCallback((delta: -1 | 1) => {
    setLocale((prev) => nextLocale(prev, delta));
  }, []);

  const ui = UI[locale];
  const ctrLabel = CTR_LABEL[locale];

  useEffect(() => {
    const tick = () => {
      setHudTime(new Date().toLocaleString("en-US", {
        weekday: "short", month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).toUpperCase());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      const on = media.matches;
      setUseCustomCursor(on);
      document.documentElement.classList.toggle("has-custom-cursor", on);
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  useEffect(() => {
    if (!useCustomCursor) return;
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const interactive = Boolean(target?.closest("a, button, [role='button']"));
      setCursorState({ x: e.clientX, y: e.clientY, visible: true, interactive });
    };
    const onLeave = () => setCursorState((prev) => ({ ...prev, visible: false }));
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [useCustomCursor]);

  useEffect(() => {
    if (activeMedia?.kind === "image" || activeMedia?.kind === "video") return;
    const el = bgVideoRef.current;
    if (!el) return;
    const feature = activeMedia?.kind === "background";
    el.muted = isTransitioning || !feature;
    if (feature && !isTransitioning) {
      el.volume = 1;
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    void el.play().catch(() => {});
  }, [bgSrc, activeMedia, isTransitioning]);

  const handleTransitionTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (!v.duration || !Number.isFinite(v.duration)) return;
      if (v.currentTime >= v.duration - 0.1) finishTransition();
    },
    [finishTransition],
  );

  const renderBackgroundLayer = () => {
    const showCtr = activeMedia?.kind === "video";
    const showImage = activeMedia?.kind === "image";
    const feature = activeMedia?.kind === "background";

    return (
      <>
        <video
          ref={bgVideoRef}
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
          src={bgSrc}
          autoPlay
          muted={isTransitioning || !feature}
          loop={!feature}
          playsInline
          preload="auto"
          onLoadedData={(e) => {
            const v = e.currentTarget;
            v.muted = isTransitioning || !feature;
            if (feature && !isTransitioning) v.volume = 1;
            void v.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            if (feature) void e.currentTarget.play().catch(() => {});
          }}
          onEnded={() => {
            if (feature && !isTransitioning) dismissToDefault();
          }}
          onError={() => {
            setActiveMedia(null);
            setActiveCtrId(null);
            setBgSrc(VID.default);
          }}
        />
        {showCtr && (
          <video
            ref={ctrVideoRef}
            className="absolute inset-0 z-[1] h-full w-full scale-[1.02] object-cover"
            src={activeMedia.src}
            autoPlay
            muted={isTransitioning}
            playsInline
            preload="auto"
            onLoadedData={(e) => {
              const v = e.currentTarget;
              v.muted = isTransitioning;
              if (!isTransitioning) {
                v.volume = 1;
                void v.play().catch(() => {});
              }
            }}
          />
        )}
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeMedia.src}
            alt=""
            className="absolute inset-0 z-[1] h-full w-full object-cover"
          />
        )}
      </>
    );
  };

  return (
    <div
      className={`relative min-h-dvh w-full overflow-x-hidden bg-black text-[var(--text-primary)] selection:bg-white selection:text-black ${
        useCustomCursor ? "cursor-none" : ""
      }`}
      onClick={handleGlobalClick}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="relative h-full w-full">{renderBackgroundLayer()}</div>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {isTransitioning && (
        <video
          ref={transitionRef}
          className="pointer-events-none fixed inset-0 z-[1] h-full w-full scale-[1.02] object-cover"
          src={TRANSITION}
          autoPlay
          playsInline
          preload="auto"
          onTimeUpdate={handleTransitionTimeUpdate}
          onEnded={finishTransition}
          onError={finishTransition}
        />
      )}

      <div className="pointer-events-none fixed inset-0 z-[2] mix-blend-overlay opacity-[0.09] crt-noise" />
      <div className="pointer-events-none fixed inset-0 z-[3] opacity-[0.18] crt-scanlines" />
      <div className="pointer-events-none fixed inset-0 z-[4] crt-vignette" />

      <div className="relative z-[5] flex min-h-dvh flex-col">
      <header className="pointer-events-none min-h-0 uppercase tracking-wide text-[var(--text-secondary)] sm:min-h-[min(14vh,7rem)]">
        <div className="pointer-events-auto sticky top-0 z-[6] flex flex-col gap-3 px-[clamp(0.5rem,2.5vw,1.5rem)] pb-2 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-2 sm:pt-4">
          <nav className="flex flex-1 flex-col gap-2 sm:max-w-[55%]" aria-label="Primary">
            <ul className="crt-chrome crt-chrome-en flex list-none flex-col gap-2 font-[family-name:var(--font-active)] text-[var(--text-secondary)]">
              <li className="normal-case">{ui.siteTitle}</li>
            </ul>
            <ul className="crt-chrome-en glitchy-text flex list-none flex-col gap-2 sm:flex-row sm:gap-6">
              <li>
                <a className="text-[var(--text-secondary)] no-underline hover:opacity-80" href="#content">
                  {ui.archive}
                </a>
              </li>
              <li>
                <a className="text-[var(--text-secondary)] no-underline hover:opacity-80" href="#footer">
                  {ui.directory}
                </a>
              </li>
            </ul>
          </nav>
          <div className="crt-chrome-en glitchy-text flex flex-col items-start gap-2 text-right sm:items-end">
            <div className="max-w-[22rem] font-[family-name:var(--font-active)] text-[var(--text-secondary)]">{hudTime}</div>
            <div className="flex items-center gap-[0.35ch] text-[0.92em] font-[family-name:var(--font-active)] text-[var(--text-secondary)]">
              <span>{ui.language}:</span>
              <button
                type="button"
                aria-label={ui.prevLanguage}
                className="channel-step-btn min-h-8 min-w-8 bg-transparent p-0 text-[1.15em] leading-none hover:text-[var(--text-primary)]"
                onClick={() => stepLocale(-1)}
              >
                ◀
              </button>
              <span className="min-w-[2.5ch] tabular-nums">{ui.langCode}</span>
              <button
                type="button"
                aria-label={ui.nextLanguage}
                className="channel-step-btn min-h-8 min-w-8 bg-transparent p-0 text-[1.15em] leading-none hover:text-[var(--text-primary)]"
                onClick={() => stepLocale(1)}
              >
                ▶
              </button>
            </div>
            <div className="flex items-center gap-[0.35ch] font-[family-name:var(--font-active)] text-[var(--text-secondary)]">
              <button
                type="button"
                aria-label={ui.prevChannel}
                disabled={isTransitioning}
                className="channel-step-btn min-h-8 min-w-8 bg-transparent p-0 text-[1.15em] leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
                onClick={() => stepChannel(-1)}
              >
                ◀
              </button>
              <span className="min-w-[7.5ch] tabular-nums">
                {ui.channel} {formatChannel(channel)}
              </span>
              <button
                type="button"
                aria-label={ui.nextChannel}
                disabled={isTransitioning}
                className="channel-step-btn min-h-8 min-w-8 bg-transparent p-0 text-[1.15em] leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
                onClick={() => stepChannel(1)}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="content" className="pointer-events-auto mx-auto w-full max-w-[min(80%,72rem)] flex-1 px-[clamp(0.5rem,2.5vw,1.5rem)] pb-[clamp(1.5rem,6vh,3rem)] pt-[clamp(0.25rem,1vh,0.75rem)]">
        <div className="crt-body glitchy-text font-[family-name:var(--font-active)] font-normal text-[1.1rem]">
          {locale === "en" ? (
            <>
              <p className="crt-paragraph">
                Hi! I&apos;m{" "}
                <CrtSpan ctrId="name" media={{ kind: "video", src: CTR_VID.liunengfu }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel.name}</CrtSpan>
                —you can call me Afu. I&apos;m at the Beijing Film Academy, currently{" "}
                <CrtSpan ctrId="aigc-intern" media={{ kind: "video", src: CTR_VID.aigcIntern }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel["aigc-intern"]}</CrtSpan>
                , and a filmmaker who thinks in shots, not bullet points.
              </p>
              <p className="crt-paragraph">
                Off campus I orbit{" "}
                <CrtSpan ctrId="live-music" media={{ kind: "video", src: CTR_VID.yanchu }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel["live-music"]}</CrtSpan>,{" "}
                <CrtSpan ctrId="films" media={{ kind: "video", src: CTR_VID.dianying }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel.films}</CrtSpan>,{" "}
                <CrtSpan ctrId="exhibitions" media={{ kind: "video", src: CTR_VID.zhanlan }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel.exhibitions}</CrtSpan>, and{" "}
                <CrtSpan ctrId="travel" media={{ kind: "video", src: CTR_VID.lvxing }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel.travel}</CrtSpan>.
              </p>
              <p className="crt-paragraph">
                I cut and ship video—work spans{" "}
                <CrtSpan ctrId="vid-aigc" media={{ kind: "background", key: "aigc" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel["vid-aigc"]}</CrtSpan>,{" "}
                <CrtSpan ctrId="vid-live" media={{ kind: "background", key: "live" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel["vid-live"]}</CrtSpan>, and{" "}
                <CrtSpan ctrId="vid-theatrical" media={{ kind: "background", key: "theatrical" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel["vid-theatrical"]}</CrtSpan>.
              </p>
              <p className="crt-paragraph">
                I love this line of work. If the frequency matches,{" "}
                <CrtSpan ctrId="contact" contact onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>{ctrLabel.contact}</CrtSpan>.
              </p>
            </>
          ) : (
            <>
              <p className="crt-paragraph">
                你好呀！我是{" "}
                <CrtSpan ctrId="name" media={{ kind: "video", src: CTR_VID.liunengfu }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel.name} active /></CrtSpan>
                ，你也可以叫我阿富，就读于北京电影学院。
              </p>
              <p className="crt-paragraph">
                欢迎来到我的个人主页，希望你可以在这个网页了解到我的另一面～
              </p>
              <p className="crt-paragraph">
                我目前在{" "}
                <CrtSpan ctrId="aigc-intern" media={{ kind: "video", src: CTR_VID.aigcIntern }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel["aigc-intern"]} active /></CrtSpan>
                这个方向持续探索与学习中，同时是一名习惯于使用镜头语言思考的影像工作者。
              </p>
              <p className="crt-paragraph">
                日常生活中，我的爱好还集中在：{" "}
                <CrtSpan ctrId="live-music" media={{ kind: "video", src: CTR_VID.yanchu }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel["live-music"]} active /></CrtSpan>、{" "}
                <CrtSpan ctrId="films" media={{ kind: "video", src: CTR_VID.dianying }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel.films} active /></CrtSpan>、{" "}
                <CrtSpan ctrId="travel" media={{ kind: "video", src: CTR_VID.lvxing }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel.travel} active /></CrtSpan>
                ……如果你也和我臭气相投，那真是找对人了，赶快来一起玩！
              </p>
              <p className="crt-paragraph">
                内容创作上，我的作品集涵盖：{" "}
                <CrtSpan ctrId="vid-aigc" media={{ kind: "background", key: "aigc" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel["vid-aigc"]} active /></CrtSpan>、{" "}
                <CrtSpan ctrId="vid-live" media={{ kind: "background", key: "live" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel["vid-live"]} active /></CrtSpan>、{" "}
                <CrtSpan ctrId="vid-theatrical" media={{ kind: "background", key: "theatrical" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel["vid-theatrical"]} active /></CrtSpan>
                等等，详情请看我的作品集 <MixText text="PDF" active /> 文件。
              </p>
              <p className="crt-paragraph">
                总之，相逢即是缘分，这是{" "}
                <CrtSpan ctrId="contact" contact onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}><MixText text={ctrLabel.contact} active /></CrtSpan>
                ，欢迎骚扰～
              </p>
            </>
          )}
        </div>
        <nav
          id="footer"
          className="crt-directory crt-chrome-en glitchy-text pointer-events-auto mt-[2.5em] scroll-mt-8 font-[family-name:var(--font-active)] text-[1.1rem] font-normal uppercase leading-[1.35] tracking-[0.02em]"
          aria-label="External contact links"
        >
          <ul className="flex list-none flex-col gap-[0.25em]">
            {SOCIAL_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  className="inline-block py-0.5 text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)] hover:opacity-90"
                  href={href}
                  {...(href.startsWith("mailto:")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      </div>

      <AnimatePresence>
        {contactOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              dismissContact(false);
            }}
          >
            <motion.div
              className="mx-auto w-[min(92vw,440px)] border-2 border-gray-400 bg-[#c0c0c0] p-0 font-[family-name:var(--font-active)] text-black shadow-[4px_4px_0_#000]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex min-h-10 items-stretch justify-between gap-2 bg-blue-800 px-2 py-1 text-xs text-white">
                <span className="flex flex-1 items-center leading-tight">{ui.communicationProtocol}</span>
                <button
                  type="button"
                  aria-label={ui.closeContact}
                  className="flex h-8 min-w-10 shrink-0 items-center justify-center px-2 text-xl leading-none hover:bg-blue-900 active:bg-blue-950"
                  onClick={() => dismissContact(true)}
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col items-center gap-4 p-4">
                <div className="flex w-full justify-center border border-gray-600 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={IMG.contact}
                    alt="Contact"
                    className="mx-auto block max-h-[min(58vh,480px)] w-full object-contain"
                  />
                </div>
                <p className="w-full text-center text-sm tracking-wide text-black sm:text-base">
                  {ui.addWeChat}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {useCustomCursor && (
        <div
          className={`custom-cursor pointer-events-none fixed left-0 top-0 z-[10001] ${
            cursorState.interactive ? "is-interactive" : ""
          }`}
          style={{
            opacity: cursorState.visible ? 1 : 0,
            transform: `translate3d(${cursorState.x - (cursorState.interactive ? 17 : 2)}px, ${
              cursorState.y - (cursorState.interactive ? 9 : 2)
            }px, 0)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cursorState.interactive ? CURSOR_POINTER : CURSOR_DEFAULT} alt="" />
        </div>
      )}
    </div>
  );
}

function CrtSpan({
  children,
  ctrId,
  media,
  contact,
  onCtrClick,
  onChannelPreview,
  onChannelClear,
  isTransitioning,
}: {
  children: React.ReactNode;
  ctrId: CtrId;
  media?: CtrMedia;
  contact?: boolean;
  onCtrClick: (ctrId: string, ch: ChannelIndex, target: CtrMedia | "contact") => void;
  onChannelPreview?: (ch: ChannelIndex) => void;
  onChannelClear?: () => void;
  isTransitioning: boolean;
}) {
  const interactive = Boolean(media || contact);
  const channel = channelForCtr(ctrId);

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isTransitioning) return;
    if (contact) onCtrClick(ctrId, channel, "contact");
    else if (media) onCtrClick(ctrId, channel, media);
  };

  if (!interactive) return <span className="text-[var(--text-secondary)]">{children}</span>;

  return (
    <button
      type="button"
      className="crt-keyword group relative inline-block cursor-pointer underline decoration-dotted decoration-white/40 underline-offset-4 text-[var(--text-secondary)]"
      onClick={onClick}
      onMouseEnter={() => onChannelPreview?.(channel)}
      onMouseLeave={() => onChannelClear?.()}
      onFocus={() => onChannelPreview?.(channel)}
      onBlur={() => onChannelClear?.()}
    >
      <span className="crt-keyword-bars-wrap pointer-events-none absolute inset-[-2px_-4px] z-0 overflow-hidden opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100">
        <video className="crt-keyword-bars-video h-full w-full scale-150 object-cover" autoPlay muted playsInline loop>
          <source src={GLITCH_BARS_MP4} type="video/mp4" />
          <source src={GLITCH_BARS_MOV} type="video/quicktime" />
        </video>
      </span>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
