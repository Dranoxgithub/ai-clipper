import { ChatProvider } from "./ChatProvider";

// Future: read from Kiro local conversation/spec history
export const kiroProvider: ChatProvider = {
  id: "kiro",
  displayName: "Kiro",
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
