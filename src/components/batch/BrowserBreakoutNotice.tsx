import { useEffect, useState } from "react";
import { ExternalLink, MoreHorizontal, RotateCw } from "lucide-react";
import {
  breakoutToNativeBrowser,
  openInSafari,
  type InAppBrowserInfo,
} from "@/lib/browser";

/**
 * Shown in place of a WebGL-dependent feature (AR / 3D try-on) when the page is
 * running inside a social in-app browser. Android is handed off to Chrome
 * automatically; iOS gets explicit "Open in Safari" instructions.
 */
export function BrowserBreakoutNotice({
  info,
  feature = "3D try-on",
}: {
  info: InAppBrowserInfo;
  feature?: string;
}) {
  const [phase, setPhase] = useState<"redirecting" | "manual">(
    info.isAndroid ? "redirecting" : "manual",
  );

  useEffect(() => {
    if (!info.isAndroid) return;
    const timer = setTimeout(() => {
      const result = breakoutToNativeBrowser(window.location.href);
      setPhase(result === "redirected" ? "redirecting" : "manual");
    }, 700);
    return () => clearTimeout(timer);
  }, [info.isAndroid]);

  return (
    <div className="rounded-3xl p-4 glass" role="alert">
      <div className="eyebrow">Open in a real browser</div>
      <div className="mt-1 text-[13px] font-semibold">
        {feature} needs Chrome or Safari
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        You're viewing this from an in-app browser, which can't render {feature}
        . Open the page in your phone's browser to continue — it only takes a
        second.
      </p>

      {phase === "redirecting" ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-well px-4 py-3 text-[12px] text-muted-foreground ring-1 ring-inset ring-border">
          <RotateCw className="size-4 animate-spin text-accent" aria-hidden />
          Opening in Chrome…
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
            onClick={() => openInSafari(window.location.href)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98]"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open in Safari
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <a
            href={window.location.href}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98]"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open in browser
          </a>
        </div>
      )}
    </div>
  );
}
