import type { UIMessage as Message } from "ai";
import type { ToolEvent } from "@/types/tool-event";

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  events: ToolEvent[];
};
