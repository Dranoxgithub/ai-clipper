import { ChatProvider } from "./ChatProvider";
import { Conversation } from "../types";

const SAMPLE_RESPONSE = `## Why this matters

对，这个区别很重要。

如果先在 latent 上做：

$
\\operatorname{RoPE}(c)
$

然后再乘：

$
W_{\\text{up}}
$

那么：

$
W_{\\text{up}} \\cdot \\operatorname{RoPE}(c)
\\ne
\\operatorname{RoPE}(W_{\\text{up}} c)
$

原因：

- RoPE operates on paired dimensions.
- Projection changes the basis.
- Arbitrary projection generally does not commute with RoPE.

\`\`\`ts
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};
\`\`\`

| Concept | Meaning |
|---|---|
| RoPE | Rotation in paired dimensions |
| Projection | Basis-changing linear map |`;

const sampleConversation: Conversation = {
  id: "sample-001",
  title: "Sample: MLA RoPE Discussion",
  providerId: "sample",
  messages: [
    {
      id: "msg-001",
      role: "user",
      text: "Why can't you apply RoPE after projection in MLA?",
    },
    {
      id: "msg-002",
      role: "assistant",
      text: SAMPLE_RESPONSE,
    },
  ],
};

export const sampleProvider: ChatProvider = {
  id: "sample",
  displayName: "Sample Response",
  async isAvailable() {
    return true;
  },
  async listConversations() {
    return [sampleConversation];
  },
  async getConversation(conversationId: string) {
    if (conversationId === sampleConversation.id) {
      return sampleConversation;
    }
    return undefined;
  },
};
