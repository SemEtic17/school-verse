import { useEffect, useRef, useState } from "react";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import {
  breakoutToNativeBrowser,
  getBreakoutTarget,
  openInSafari,
  type InAppBrowserInfo,
} from "@/lib/browser";

/**
 * Site-wide banner shown whenever the app runs inside a social in-app browser
 * (Instagram, Facebook, TikTok). Those WebViews render WebGL as a black screen,
 * so this hands the user off to a real browser:
 *
 * - Android: attempts an automatic Chrome `intent://` on mount and always
 *   offers a tap-triggered button as well (Instagram only honours external-app
 *   opens from a real user gesture, so the tap is the reliable path).
 * - iOS: Safari has no programmatic hand-off, so we show instructions plus a
 *   best-effort `x-safari-https://` button.
 *
 * Mounted at the root so it appears on every route, not just the try-on page.
 */
export function BrowserBreakoutBanner({
  info,
  feature = "3D try-on",
}: {
  info: InAppBrowserInfo;
  feature?: string;
}) {
  const [attempting, setAttempting] = useState(false);
  const autoTried = useRef(false);

  // Best-effort automatic hand-off on Android. Kept to one attempt per page
  // load so dismissed dialogs don't keep re-firing.
  useEffect(() => {
    if (!info.isInApp || !info.isAndroid || autoTried.current) return;
    autoTried.current = true;
    const timer = setTimeout(() => {
      setAttempting(true);
      breakoutToNativeBrowser(getBreakoutTarget());
    }, 600);
    return () => clearTimeout(timer);
  }, [info.isInApp, info.isAndroid]);

  if (!info.isInApp) return null;

  function openNow() {
    setAttempting(true);
    breakoutToNativeBrowser(getBreakoutTarget());
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3"
      role="alert"
      aria-live="polite"
    >
      <div className="animate-rise mx-auto max-w-[430px] rounded-3xl p-4 glass-strong ring-1 ring-inset ring-accent/30 lg:max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="eyebrow">Open in a real browser</div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            In-app browser
          </span>
        </div>

        <div className="mt-1 text-[13px] font-semibold">
          {feature} needs Chrome or Safari
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          You&apos;re viewing this from an in-app browser, which can&apos;t
          render {feature}. Open the page in your phone&apos;s browser to
          continue — it only takes a second.
        </p>

        {info.isAndroid ? (
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={openNow}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98]"
            >
              <ExternalLink className="size-4" aria-hidden />
              {attempting ? "Opening Chrome…" : "Continue in Chrome"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Tap{" "}
              <span className="font-semibold text-foreground">Continue</span> if
              Chrome asks to open an external app.
            </p>
          </div>
        ) : info.isIOS ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 rounded-2xl bg-well px-4 py-3 text-[12px] text-muted-foreground ring-1 ring-inset ring-border">
              <MoreHorizontal
                className="mt-0.5 size-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>
                Tap the <span className="font-semibold text-foreground">⋯</span>{" "}
                menu at the top, then choose{" "}
                <span className="font-semibold text-foreground">
                  Open in Safari
                </span>
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => openInSafari(getBreakoutTarget())}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98]"
            >
              <ExternalLink className="size-4" aria-hidden />
              Open in Safari
            </button>
          </div>
        ) : (
          <a
            href={getBreakoutTarget()}
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98]"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open in browser
          </a>
        )}
      </div>
    </div>
  );
}
