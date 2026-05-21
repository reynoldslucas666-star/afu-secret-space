"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const IMG = {
  liunengfu: "/assets/images/liunengfu.png",
  aigcIntern: "/assets/images/AIGCshixi.png",
  yanchu: "/assets/images/yanchu.png",
  dianying: "/assets/images/dianying.png",
  zhanlan: "/assets/images/zhanlan.png",
  lvxing: "/assets/images/lvxing.png",
  contact: "/assets/images/lianxifangshi.png",
} as const;

const VID = {
  default: "/assets/video/background-loop.mp4",
  aigc: "/assets/video/aigc-bg.mp4",
  live: "/assets/video/live-action-bg.mp4",
  theatrical: "/assets/video/theatrical-bg.mp4",
} as const;

const GLITCH_BARS_MP4 = "/assets/video/glitch-bars.mp4";
const GLITCH_BARS_MOV = "/assets/video/glitch-bars.mov";
const CURSOR_DEFAULT = "/assets/images/cursor-default.png";
const CURSOR_POINTER = "/assets/images/cursor-pointer.png";

type VideoKey = keyof typeof VID;
type ChannelIndex = 1 | 2 | 3 | 4;

function formatChannel(n: number) {
  return String(n).padStart(2, "0");
}

export default function Portfolio() {
  const [bgSrc, setBgSrc] = useState<string>(VID.default);
  const [activeVideo, setActiveVideo] = useState<Exclude<VideoKey, "default"> | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [hudTime, setHudTime] = useState("");
  const [useCustomCursor, setUseCustomCursor] = useState(false);
  const [cursorState, setCursorState] = useState({ x: 0, y: 0, visible: false, interactive: false });
  const [channel, setChannel] = useState(0);

  const contactDismissGuardUntil = useRef(0);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const toggleImageFullscreen = useCallback((src: string, ch: ChannelIndex) => {
    setActiveImage((prev) => {
      const next = prev === src ? null : src;
      setChannel(next ? ch : 0);
      return next;
    });
    setActiveVideo(null);
  }, []);

  const openContact = useCallback(() => {
    contactDismissGuardUntil.current = Date.now() + 500;
    setContactOpen(true);
    setChannel(4);
  }, []);

  const dismissContact = useCallback((force: boolean) => {
    if (!force && Date.now() < contactDismissGuardUntil.current) return;
    setContactOpen(false);
    setChannel(0);
  }, []);

  const switchVideo = useCallback((key: Exclude<VideoKey, "default">, ch: ChannelIndex) => {
    setActiveImage(null);
    setBgSrc(VID[key]);
    setActiveVideo(key);
    setChannel(ch);
  }, []);

  const backToDefaultVideo = useCallback(() => {
    setActiveVideo(null);
    setBgSrc(VID.default);
    setChannel(0);
  }, []);

  const previewChannel = useCallback((ch: ChannelIndex) => {
    setChannel(ch);
  }, []);

  const clearPreviewChannel = useCallback(() => {
    if (activeImage || activeVideo || contactOpen) return;
    setChannel(0);
  }, [activeImage, activeVideo, contactOpen]);

  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only clicks on the page backdrop should reset preview/video.
    if (e.target !== e.currentTarget) return;
    if (activeVideo) {
      backToDefaultVideo();
    }
    if (activeImage) {
      setActiveImage(null);
      setChannel(0);
    }
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

  // Default loop stays muted (autoplay policy). CTR feature clips play with sound; nudge play after src/state changes.
  useEffect(() => {
    if (activeImage) return;
    const el = bgVideoRef.current;
    if (!el) return;
    el.muted = activeVideo === null;
    if (activeVideo !== null) {
      el.volume = 1;
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    void el.play().catch(() => {});
  }, [bgSrc, activeVideo, activeImage]);

  return (
    <div
      className={`relative min-h-dvh w-full overflow-x-hidden bg-black text-[var(--text-primary)] selection:bg-white selection:text-black ${
        useCustomCursor ? "has-custom-cursor" : ""
      }`}
      onClick={handleGlobalClick}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <video
            key={bgSrc}
            ref={bgVideoRef}
            className="h-full w-full scale-[1.02] object-cover"
            src={bgSrc}
            autoPlay
            muted={activeVideo === null}
            loop={activeVideo === null}
            playsInline
            preload="auto"
            onLoadedData={(e) => {
              const v = e.currentTarget;
              v.muted = activeVideo === null;
              if (activeVideo !== null) v.volume = 1;
              void v.play().catch(() => {});
            }}
            onCanPlay={(e) => {
              const v = e.currentTarget;
              if (activeVideo !== null) void v.play().catch(() => {});
            }}
            onEnded={() => {
              if (activeVideo) backToDefaultVideo();
            }}
            onError={() => {
              setActiveVideo(null);
              setBgSrc(VID.default);
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[2] mix-blend-overlay opacity-[0.09] crt-noise" />
      <div className="pointer-events-none fixed inset-0 z-[3] opacity-[0.18] crt-scanlines" />
      <div className="pointer-events-none fixed inset-0 z-[4] crt-vignette" />

      <header className="pointer-events-none relative z-[5] min-h-0 uppercase tracking-wide text-[var(--text-secondary)] sm:min-h-[min(28vh,14rem)]">
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

      <main id="content" className="pointer-events-auto relative z-[5] mx-auto w-full max-w-[min(80%,72rem)] px-[clamp(1rem,5vw,3rem)] pb-28 pt-[clamp(0.5rem,2vh,1.5rem)]">
        <div className="crt-body glitchy-text font-[family-name:var(--font-vcr)] font-normal text-[1.1rem]">
          <p className="crt-paragraph">
            Hi! I&apos;m{" "}
            <CrtSpan channel={1} img={IMG.liunengfu} onImage={toggleImageFullscreen} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>Liu Nengfu</CrtSpan>
            —you can call me Afu. I&apos;m at the Beijing Film Academy, currently{" "}
            <CrtSpan channel={1} img={IMG.aigcIntern} onImage={toggleImageFullscreen} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>interning on the AIGC product side</CrtSpan>
            , and a filmmaker who thinks in shots, not bullet points.
          </p>
          <p className="crt-paragraph">
            Off campus I orbit{" "}
            <CrtSpan channel={2} img={IMG.yanchu} onImage={toggleImageFullscreen} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>live sets and room acoustics</CrtSpan>,{" "}
            <CrtSpan channel={2} img={IMG.dianying} onImage={toggleImageFullscreen} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>films wherever they screen</CrtSpan>,{" "}
            <CrtSpan channel={2} img={IMG.zhanlan} onImage={toggleImageFullscreen} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>exhibitions with sharp lighting</CrtSpan>, and{" "}
            <CrtSpan channel={2} img={IMG.lvxing} onImage={toggleImageFullscreen} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>travel that wanders on purpose</CrtSpan>.
          </p>
          <p className="crt-paragraph">
            I cut and ship video—work spans{" "}
            <CrtSpan channel={3} video="aigc" onVideo={switchVideo} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>AIGC-generated video</CrtSpan>,{" "}
            <CrtSpan channel={3} video="live" onVideo={switchVideo} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>live-action</CrtSpan>, and{" "}
            <CrtSpan channel={3} video="theatrical" onVideo={switchVideo} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>theatrical campaigns</CrtSpan>.
          </p>
          <p className="crt-paragraph">
            I love this line of work. If the frequency matches,{" "}
            <CrtSpan channel={4} onContact={openContact} onChannelPreview={previewChannel} onChannelClear={clearPreviewChannel}>open a line</CrtSpan>.
          </p>
        </div>
      </main>

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
              className="w-full max-w-sm border-2 border-gray-400 bg-[#c0c0c0] p-0 font-[family-name:var(--font-vcr)] text-black shadow-[4px_4px_0_#000]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between bg-blue-800 px-2 py-1 text-xs text-white">
                <span>COMMUNICATION.PROTOCOL</span>
                <button type="button" onClick={() => dismissContact(true)}>×</button>
              </div>
              <div className="space-y-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IMG.contact} alt="Contact" className="w-full border border-gray-600 bg-white" />
                <p className="text-center text-[10px] uppercase">Click outside the pane to dismiss</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {useCustomCursor && cursorState.visible && (
        <div
          className="custom-cursor pointer-events-none fixed left-0 top-0 z-[999]"
          style={{
            transform: `translate3d(${cursorState.x - (cursorState.interactive ? 18 : 2)}px, ${
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
  channel,
  img,
  video,
  onImage,
  onVideo,
  onContact,
  onChannelPreview,
  onChannelClear,
}: {
  children: React.ReactNode;
  channel: ChannelIndex;
  img?: string;
  video?: Exclude<VideoKey, "default">;
  onImage?: (src: string, ch: ChannelIndex) => void;
  onVideo?: (k: Exclude<VideoKey, "default">, ch: ChannelIndex) => void;
  onContact?: () => void;
  onChannelPreview?: (ch: ChannelIndex) => void;
  onChannelClear?: () => void;
}) {
  const interactive = Boolean(img || video || onContact);

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (video && onVideo) onVideo(video, channel);
    if (img && onImage) onImage(img, channel);
    if (onContact) onContact();
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
