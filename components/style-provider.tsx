"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "style-template";

export type StyleId = "1" | "2" | "3" | "4" | "5";

type StyleContextValue = {
  style: StyleId;
  setStyle: (id: StyleId) => void;
};

const StyleContext = createContext<StyleContextValue | null>(null);

function readStoredStyle(): StyleId {
  if (typeof window === "undefined") return "4";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (
    stored === "1" ||
    stored === "2" ||
    stored === "3" ||
    stored === "4" ||
    stored === "5"
  )
    return stored;
  return "4";
}

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<StyleId>("4");

  useEffect(() => {
    const stored = readStoredStyle();
    setStyleState(stored);
    document.documentElement.setAttribute("data-style", stored);
  }, []);

  const setStyle = useCallback((id: StyleId) => {
    setStyleState(id);
    document.documentElement.setAttribute("data-style", id);
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
