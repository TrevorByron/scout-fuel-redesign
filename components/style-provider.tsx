"use client";

/** Persists `style-template` (slug: teal | glass | uber), mirrors to `html[data-style]` and `body[data-font]` (system for Uber). */

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import {
  DEFAULT_STYLE_ID,
  migrateStoredStyle,
  STORAGE_KEY,
  type StyleId,
  isUberStyle,
} from "@/lib/ui-styles";

export type { StyleId };

type StyleContextValue = {
  style: StyleId;
  setStyle: (id: StyleId) => void;
};

const StyleContext = createContext<StyleContextValue | null>(null);

function readStoredStyle(): StyleId {
  if (typeof window === "undefined") return DEFAULT_STYLE_ID;
  return migrateStoredStyle(localStorage.getItem(STORAGE_KEY));
}

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<StyleId>(DEFAULT_STYLE_ID);

  // useLayoutEffect: sync DOM + context before paint. useEffect runs too late — first paint used wrong
  // theme tokens and wrong Uber vs default React trees after hydration.
  useLayoutEffect(() => {
    const stored = readStoredStyle();
    setStyleState(stored);
    document.documentElement.setAttribute("data-style", stored);
    document.body.setAttribute(
      "data-font",
      isUberStyle(stored) ? "system" : "default",
    );
  }, []);

  const setStyle = useCallback((id: StyleId) => {
    setStyleState(id);
    document.documentElement.setAttribute("data-style", id);
    document.body.setAttribute(
      "data-font",
      isUberStyle(id) ? "system" : "default",
    );
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <StyleContext.Provider value={{ style, setStyle }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle() {
  const ctx = useContext(StyleContext);
  if (!ctx) {
    throw new Error("useStyle must be used within StyleProvider");
  }
  return ctx;
}
