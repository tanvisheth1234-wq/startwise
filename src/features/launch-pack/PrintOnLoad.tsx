"use client";
// Opens the print dialog once fonts are ready, so Devanagari never prints as boxes.
import { useEffect } from "react";

export function PrintOnLoad() {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled && !navigator.webdriver) setTimeout(() => window.print(), 400);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
