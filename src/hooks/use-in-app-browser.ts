import { useEffect, useState } from "react";
import { getInAppBrowserInfo, type InAppBrowserInfo } from "@/lib/browser";

const SSR_SAFE_INFO: InAppBrowserInfo = {
  isInApp: false,
  isAndroid: false,
  isIOS: false,
};

/**
 * Client-only in-app browser detection. Reads the user agent after mount so
 * server rendering stays deterministic (always "not an in-app browser").
 */
export function useInAppBrowser(): InAppBrowserInfo {
  const [info, setInfo] = useState<InAppBrowserInfo>(SSR_SAFE_INFO);

  useEffect(() => {
    setInfo(getInAppBrowserInfo());
  }, []);

  return info;
}
