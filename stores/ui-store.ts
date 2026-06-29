"use client";

import { create } from "zustand";

export type MobileView = "sessions" | "chat" | "desktop";

type UIStore = {
  sandboxId: string | null;
  streamUrl: string | null;
  isDesktopInitializing: boolean;
  desktopError: string | null;
  selectedEventId: string | null;
  isDebugOpen: boolean;
  mobileView: MobileView;
  setSandbox: (sandboxId: string | null, streamUrl: string | null) => void;
  setDesktopInitializing: (isDesktopInitializing: boolean) => void;
  setDesktopError: (desktopError: string | null) => void;
  setSelectedEventId: (selectedEventId: string | null) => void;
  setDebugOpen: (isDebugOpen: boolean) => void;
  setMobileView: (mobileView: MobileView) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  sandboxId: null,
  streamUrl: null,
  isDesktopInitializing: false,
  desktopError: null,
  selectedEventId: null,
  isDebugOpen: false,
  mobileView: "chat",
  setSandbox: (sandboxId, streamUrl) =>
    set({ sandboxId, streamUrl, desktopError: null }),
  setDesktopInitializing: (isDesktopInitializing) =>
    set({ isDesktopInitializing }),
  setDesktopError: (desktopError) => set({ desktopError }),
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
  setDebugOpen: (isDebugOpen) => set({ isDebugOpen }),
  setMobileView: (mobileView) => set({ mobileView }),
}));
