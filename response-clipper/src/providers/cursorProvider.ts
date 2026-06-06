import { ChatProvider } from "./ChatProvider";

// Future: read from ~/Library/Application Support/Cursor/User/workspaceStorage/*/state.vscdb
export const cursorProvider: ChatProvider = {
  id: "cursor",
  displayName: "Cursor",
  async isAvailable() {
    return false;
  },
  async listConversations() {
    return [];
  },
  async getConversation() {
    return undefined;
  },
};
