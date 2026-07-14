import { useEffect, useState, useRef } from "react";

export function useNavbarScroll() {
  const [isSticky, setIsSticky] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const wasStickyRef = useRef(false);

  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      const nav = document.getElementById("main-nav");
      if (!nav) return;

      const rect = nav.getBoundingClientRect();
      const isAtTop = window.scrollY < 5;
      const shouldBeSticky = rect.top <= 0 && !isAtTop;

      if (shouldBeSticky !== wasStickyRef.current) {
        wasStickyRef.current = shouldBeSticky;

        if (shouldBeSticky) {
          setIsSticky(true);
          setSlideIn(false);
          rafId = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setSlideIn(true);
            });
          });
        } else {
          if (rafId) cancelAnimationFrame(rafId);
          setIsSticky(false);
          setSlideIn(false);
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { isSticky, slideIn };
}
