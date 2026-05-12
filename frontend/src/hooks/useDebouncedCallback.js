import { useCallback, useEffect, useRef } from "react";

export default function useDebouncedCallback(fn, delay) {
  const tRef = useRef(null);
  const cb = useCallback(
    (...args) => {
      if (tRef.current) clearTimeout(tRef.current);
      tRef.current = setTimeout(() => {
        tRef.current = null;
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
  useEffect(
    () => () => {
      if (tRef.current) clearTimeout(tRef.current);
    },
    []
  );
  return cb;
}
