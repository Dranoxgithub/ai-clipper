export type ChatProviderId = "sample" | "cursor" | "kiro";

export type ChatRole = "user" | "assistant" | "tool" | "system" | "unknown";

export type Conversation = {
  id: string;
  title: string;
  providerId: ChatProviderId;
  workspacePath?: string;
  createdAt?: number;
  updatedAt?: number;
  messages: Message[];
  raw?: unknown;
};

export type Message = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt?: number;
  raw?: unknown;
};

export type SelectableBlockKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "code"
  | "math"
  | "table"
  | "quote"
  | "thematic_break"
  | "unknown";

export type SelectableBlock = {
  id: string;
  kind: SelectableBlockKind;
  markdown: string;
  plainText: string;
  selected: boolean;
  order: number;
  sourceProviderId?: ChatProviderId;
  sourceConversationId?: string;
  sourceMessageId?: string;
};
