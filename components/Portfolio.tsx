"use client";

import { AnimatePresence, motion } from "framer-motion";
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
type ChannelIndex = 1 | 2 | 3 | 4;

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

  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    dismissToDefault();
  };

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
    const update = () => setUseCustomCursor(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("has-custom-cursor", useCustomCursor);
    return () => document.documentElement.classList.remove("has-custom-cursor");
  }, [useCustomCursor]);

  useEffect(() => {
    if (!useCustomCursor) return;
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const interactive = Boolean(target?.closest("a, button, [role='button']"));
      setCursorState({ x: e.clientX, y: e.clientY, visible: true, interactive });
    };
    const onLeave = () => setCursorState((prev) => ({ ...prev, visible: false }));
    window.addEventListener("mousemove", onMove);
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
      className="relative min-h-dvh w-full overflow-x-hidden bg-black text-[var(--text-primary)] selection:bg-white selection:text-black"
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
      <header className="pointer-events-none min-h-0 uppercase tracking-wide text-[var(--text-secondary)] sm:min-h-[min(28vh,14rem)]">
        <div className="pointer-events-auto sticky top-0 z-[6] flex flex-col gap-5 px-[clamp(1rem,5vw,3rem)] pb-3 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:pb-4 sm:pt-8">
          <nav className="flex flex-1 flex-col gap-4 sm:max-w-[55%]" aria-label="Primary">
            <ul className="flex list-none items-center gap-0 font-[family-name:var(--font-vcr)] text-[var(--text-secondary)]">
              <li className="normal-case flex items-center after:ml-[0.5ch] after:text-[1.15em] after:content-['▶']">{"Afu's secret space"}</li>
            </ul>
            <ul className="glitchy-text flex list-none flex-col gap-2 sm:flex-row sm:gap-6">
              <li><a className="text-[var(--text-secondary)] no-underline hover:opacity-80" href="#content">ARCHIVE_01</a></li>
              <li><a className="text-[var(--text-secondary)] no-underline hover:opacity-80" href="#footer">DIRECTORY</a></li>
            </ul>
          </nav>
          <div className="glitchy-text flex flex-col items-start gap-2 text-right sm:items-end">
            <div className="max-w-[22rem] font-[family-name:var(--font-vcr)] text-[var(--text-secondary)]">{hudTime}</div>
            <div className="flex items-center gap-2 font-[family-name:var(--font-vcr)] text-[var(--text-secondary)]">
              <span>CHANNEL {formatChannel(channel)}</span>
            </div>
          </div>
        </div>
      </header>

      <main id="content" className="pointer-events-auto mx-auto w-full max-w-[min(80%,72rem)] flex-1 px-[clamp(1rem,5vw,3rem)] pb-[clamp(3rem,12vh,6rem)] pt-[clamp(0.5rem,2vh,1.5rem)]">
        <div className="crt-body glitchy-text font-[family-name:var(--font-vcr)] font-normal text-[1.1rem]">
          <p className="crt-paragraph">
            Hi! I&apos;m{" "}
            <CrtSpan ctrId="name" channel={1} media={{ kind: "video", src: CTR_VID.liunengfu }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>Liu Nengfu</CrtSpan>
            —you can call me Afu. I&apos;m at the Beijing Film Academy, currently{" "}
            <CrtSpan ctrId="aigc-intern" channel={1} media={{ kind: "video", src: CTR_VID.aigcIntern }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>interning on the AIGC product side</CrtSpan>
            , and a filmmaker who thinks in shots, not bullet points.
          </p>
          <p className="crt-paragraph">
            Off campus I orbit{" "}
            <CrtSpan ctrId="live-music" channel={2} media={{ kind: "video", src: CTR_VID.yanchu }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>live sets and room acoustics</CrtSpan>,{" "}
            <CrtSpan ctrId="films" channel={2} media={{ kind: "video", src: CTR_VID.dianying }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>films wherever they screen</CrtSpan>,{" "}
            <CrtSpan ctrId="exhibitions" channel={2} media={{ kind: "video", src: CTR_VID.zhanlan }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>exhibitions with sharp lighting</CrtSpan>, and{" "}
            <CrtSpan ctrId="travel" channel={2} media={{ kind: "video", src: CTR_VID.lvxing }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>travel that wanders on purpose</CrtSpan>.
          </p>
          <p className="crt-paragraph">
            I cut and ship video—work spans{" "}
            <CrtSpan ctrId="vid-aigc" channel={3} media={{ kind: "background", key: "aigc" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>AIGC-generated video</CrtSpan>,{" "}
            <CrtSpan ctrId="vid-live" channel={3} media={{ kind: "background", key: "live" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>live-action</CrtSpan>, and{" "}
            <CrtSpan ctrId="vid-theatrical" channel={3} media={{ kind: "background", key: "theatrical" }} onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>theatrical campaigns</CrtSpan>.
          </p>
          <p className="crt-paragraph">
            I love this line of work. If the frequency matches,{" "}
            <CrtSpan ctrId="contact" channel={4} contact onCtrClick={handleCtrClick} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel} isTransitioning={isTransitioning}>open a line</CrtSpan>.
          </p>
        </div>
        <nav
          id="footer"
          className="crt-directory glitchy-text pointer-events-auto mt-[1.5em] scroll-mt-8 font-[family-name:var(--font-vcr)] text-[1.1rem] font-normal uppercase leading-[1.35] tracking-[0.02em]"
          aria-label="External contact links"
        >
          <ul className="flex list-none flex-col gap-[0.5em]">
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
              className="mx-auto w-[min(92vw,280px)] border-2 border-gray-400 bg-[#c0c0c0] p-0 font-[family-name:var(--font-vcr)] text-black shadow-[4px_4px_0_#000]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-stretch bg-blue-800 text-xs text-white">
                <span className="flex min-h-10 flex-1 items-center px-2 py-1 leading-tight">
                  COMMUNICATION.PROTOCOL
                </span>
                <button
                  type="button"
                  aria-label="Close contact window"
                  className="flex min-h-10 min-w-12 shrink-0 items-center justify-center border-l border-blue-900/60 px-3 text-xl leading-none hover:bg-blue-900 active:bg-blue-950"
                  onClick={() => dismissContact(true)}
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col items-center gap-3 p-3">
                <div className="w-full overflow-hidden border border-gray-600 bg-white aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={IMG.contact}
                    alt="Contact"
                    className="mx-auto block h-full w-full object-cover object-[50%_42%]"
                  />
                </div>
                <button
                  type="button"
                  className="min-h-10 w-full border border-gray-500 bg-[#d4d4d4] px-3 py-2 text-center text-[10px] uppercase leading-tight hover:bg-[#e8e8e8] active:bg-white"
                  onClick={() => dismissContact(true)}
                >
                  Close window
                </button>
                <p className="text-center text-[10px] uppercase leading-tight text-black/70">
                  Or click the dark area outside to dismiss
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {useCustomCursor && cursorState.visible && (
        <div
          className={`custom-cursor pointer-events-none fixed left-0 top-0 z-[999] ${
            cursorState.interactive ? "is-interactive" : ""
          }`}
          style={{
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
  channel,
  media,
  contact,
  onCtrClick,
  onChannelPreview,
  onChannelClear,
  isTransitioning,
}: {
  children: React.ReactNode;
  ctrId: string;
  channel: ChannelIndex;
  media?: CtrMedia;
  contact?: boolean;
  onCtrClick: (ctrId: string, ch: ChannelIndex, target: CtrMedia | "contact") => void;
  onChannelPreview?: (ch: ChannelIndex) => void;
  onChannelClear?: () => void;
  isTransitioning: boolean;
}) {
  const interactive = Boolean(media || contact);

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
