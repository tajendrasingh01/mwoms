import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT_PX = 1024; // matches Tailwind's `lg` breakpoint

/**
 * Returns true when the viewport is narrower than the app's desktop
 * breakpoint. Used to switch the sidebar between a permanent rail
 * (desktop) and a slide-over Sheet (mobile/tablet).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.innerWidth < MOBILE_BREAKPOINT_PX,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    );

    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
