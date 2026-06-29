"use client";

import type { UIMessage as Message } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChatSession } from "@/types/session";
import type { ToolEvent } from "@/types/tool-event";

export const STORAGE_KEY = "cambio-ai-agent-dashboard-sessions";

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEmptySession = (): ChatSession => {
  const now = Date.now();

  return {
    id: createId(),
    title: "New Session",
    createdAt: now,
    updatedAt: now,
    messages: [],
    events: [],
  };
};

const getTitleFromMessages = (messages: Message[], fallback: string) => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text =
    typeof firstUserMessage?.content === "string"
      ? firstUserMessage.content.trim()
      : "";

  if (!text) {
    return fallback;
  }

  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
};

type SessionStore = {
  sessions: ChatSession[];
  currentSessionId: string;
  createSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateCurrentSessionMessages: (messages: Message[]) => void;
  updateCurrentSessionEvents: (events: ToolEvent[]) => void;
  ensureSession: () => void;
};

const initialSession = createEmptySession();

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [initialSession],
      currentSessionId: initialSession.id,
      createSession: () => {
        const session = createEmptySession();
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
        }));
        return session.id;
      },
      switchSession: (id) => {
        if (get().sessions.some((session) => session.id === id)) {
          set({ currentSessionId: id });
        }
      },
      deleteSession: (id) =>
        set((state) => {
          const remainingSessions = state.sessions.filter(
            (session) => session.id !== id,
          );

          if (remainingSessions.length === 0) {
            const session = createEmptySession();
            return {
              sessions: [session],
              currentSessionId: session.id,
            };
          }

          return {
            sessions: remainingSessions,
            currentSessionId:
              state.currentSessionId === id
                ? remainingSessions[0].id
                : state.currentSessionId,
          };
        }),
      updateCurrentSessionMessages: (messages) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === state.currentSessionId
              ? {
                  ...session,
                  title: getTitleFromMessages(messages, session.title),
                  updatedAt: Date.now(),
                  messages,
                }
              : session,
          ),
        })),
      updateCurrentSessionEvents: (events) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === state.currentSessionId
              ? {
                  ...session,
                  updatedAt: Date.now(),
                  events,
                }
              : session,
          ),
        })),
      ensureSession: () =>
        set((state) => {
          if (state.sessions.length > 0) {
            const currentSessionExists = state.sessions.some(
              (session) => session.id === state.currentSessionId,
            );
            return {
              currentSessionId: currentSessionExists
                ? state.currentSessionId
                : state.sessions[0].id,
            };
          }

          const session = createEmptySession();
          return {
            sessions: [session],
            currentSessionId: session.id,
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.ensureSession();
      },
    },
  ),
);
