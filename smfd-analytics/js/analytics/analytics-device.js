/* Best-effort device / OS / browser classifier.
   User-agent strings can be reduced or spoofed, so anything unclear is "unknown"/"other".
   OS and browser are classified independently (an iPhone may run Chrome; Android may run Firefox). */
export function classifyDevice(nav = navigator) {
  const ua = nav.userAgent || "";
  const touch = (nav.maxTouchPoints || 0) > 1;
  const hintMobile = nav.userAgentData && typeof nav.userAgentData.mobile === "boolean" ? nav.userAgentData.mobile : null;

  // iPadOS 13+ reports a Macintosh UA; touch support distinguishes it from a real Mac.
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch);
  const isIPhone = /iPhone|iPod/.test(ua);

  let os = "other";
  if (isIPhone || isIPad) os = "ios";
  else if (/Android/.test(ua)) os = "android";
  else if (/Windows/.test(ua)) os = "windows";
  else if (/Macintosh|Mac OS X/.test(ua)) os = "macos";
  else if (/CrOS/.test(ua)) os = "other";
  else if (/Linux|X11/.test(ua)) os = "linux";

  let device = "unknown";
  if (isIPad || /Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) device = "tablet";
  else if (isIPhone || (/Android/.test(ua) && /Mobile/.test(ua)) || /Mobi/.test(ua) || hintMobile === true) device = "mobile";
  else if (["windows", "macos", "linux"].includes(os) || /CrOS/.test(ua)) device = "desktop";

  let browser = "other";
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = "edge";
  else if (/OPR\/|Opera|SamsungBrowser|UCBrowser|FBAN|FBAV|Instagram|MiuiBrowser|YaBrowser/.test(ua)) browser = "other";
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = "firefox";
  else if (/Chrome\/|CriOS\//.test(ua)) browser = "chrome";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "safari";

  return { device, os, browser };
}
