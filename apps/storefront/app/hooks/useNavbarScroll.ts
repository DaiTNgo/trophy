import { useEffect } from "react";

export function useNavbarScroll() {
  useEffect(() => {
    const nav = document.getElementById("main-nav");
    function handleScroll() {
      if (window.scrollY > 50) {
        nav?.classList.add("h-16");
        nav?.classList.remove("h-20");
      } else {
        nav?.classList.add("h-20");
        nav?.classList.remove("h-16");
      }
    }
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
}
