/**
 * In-app browser (WebView) detection and breakout helpers.
 *
 * Social webviews (Instagram, Facebook, TikTok) ship a limited WebGL
 * implementation, so the AR / 3D try-on renders a black screen there. These
 * helpers detect those webviews and hand the user off to a real browser:
 * an automatic Chrome intent on Android, and an explicit Safari prompt on iOS
 * (iOS gives no programmatic way to leave a webview).
 */

export type InAppBrowserInfo = {
  /** True when running inside a known social in-app browser (WebView). */
  isInApp: boolean;
  isAndroid: boolean;
  isIOS: boolean;
};

const IN_APP_UA = /Instagram|FBAN|FBAV|TikTok/i;
const ANDROID_UA = /Android/i;
const IOS_UA = /iPhone|iPad|iPod/i;

/**
 * Detect whether the current page is inside an in-app browser and which mobile
 * platform we're on. Safe to call during SSR — returns an inert result when
 * there is no `window`.
 */
export function getInAppBrowserInfo(): InAppBrowserInfo {
  if (typeof window === "undefined") {
    return { isInApp: false, isAndroid: false, isIOS: false };
  }

  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    (window as unknown as { opera?: string }).opera ||
    "";
  const isInApp = IN_APP_UA.test(ua);
  const isAndroid = ANDROID_UA.test(ua);
  const isIOS = IOS_UA.test(ua);

  return { isInApp, isAndroid, isIOS };
}

/**
 * Build an Android `intent://` URL that forces the link to open in Chrome,
 * falling back to the default browser if Chrome is not installed.
 */
export function buildChromeIntentUrl(target: string): string {
  const resolved = new URL(target);
  const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  const fallback = encodeURIComponent(resolved.href);
  return (
    `intent://${resolved.host}${path}#Intent;scheme=https;` +
    `package=com.android.chrome;S.browser_fallback_url=${fallback};end`
  );
}

/**
 * The page we want the user to land on after leaving the in-app browser.
 * Always the site root — deep links such as `/clothes` are client-rendered and
 * 404 when a fresh browser opens them directly, so we send everyone to `/`.
 */
export function getBreakoutTarget(): string {
  if (typeof window === "undefined") return "/";
  return new URL("/", window.location.origin).href;
}

export type BreakoutResult =
  /** Nothing to do — we're already in a normal browser. */
  | "not-needed"
  /** Triggered an automatic hand-off (Android). */
  | "redirected"
  /** Cannot be automated — the caller should show manual instructions (iOS). */
  | "manual";

/**
 * Try to leave the in-app browser automatically.
 *
 * Android can be redirected straight into Chrome via an `intent://` URL.
 * iOS has no supported programmatic hand-off, so we return "manual" and let the
 * UI walk the user through the ⋯ → "Open in Safari" flow.
 */
export function breakoutToNativeBrowser(target: string): BreakoutResult {
  const { isInApp, isAndroid } = getInAppBrowserInfo();
  if (!isInApp) return "not-needed";

  if (isAndroid) {
    window.location.href = buildChromeIntentUrl(target);
    return "redirected";
  }

  return "manual";
}

/**
 * Best-effort iOS hand-off to Safari using the `x-safari-https://` scheme.
 * Must be called from a user gesture (e.g. a tap) to have any chance of
 * working; always pair it with visible instructions as a fallback.
 */
export function openInSafari(target: string): void {
  if (typeof window === "undefined") return;
  const httpsUrl = target.replace(/^http:/, "https:");
  window.location.href = httpsUrl.replace(/^https:\/\//, "x-safari-https://");
}
