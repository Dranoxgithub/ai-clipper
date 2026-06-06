import { ChatProviderId, Conversation } from "../types";

export type ChatProvider = {
  id: ChatProviderId;
  displayName: string;
  isAvailable(): Promise<boolean>;
  listConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation | undefined>;
};
