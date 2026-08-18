import { useEffect, useRef } from "react";

type UseClickOutsideOptions = {
  isInside?: (target: Node) => boolean;
};

export function useClickOutside<T extends HTMLElement>(
  onOutsideClick: () => void,
  options?: UseClickOutsideOptions
) {
  const ref = useRef<T>(null);
  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    function isInside(target: Node) {
      if (ref.current?.contains(target)) return true;
      if (optionsRef.current?.isInside?.(target)) return true;
      return false;
    }
    function handlePointer(event: MouseEvent) {
      if (!isInside(event.target as Node)) {
        callbackRef.current();
      }
    }
    function handleFocusIn(event: FocusEvent) {
      if (!isInside(event.target as Node)) {
        callbackRef.current();
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return ref;
}
