"use client";

import { Input } from "@/components/input";

type MessageInputProps = {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isInitializing: boolean;
  isLoading: boolean;
  status: string;
  stop: () => void;
};

export function MessageInput(props: MessageInputProps) {
  return <Input {...props} />;
}
