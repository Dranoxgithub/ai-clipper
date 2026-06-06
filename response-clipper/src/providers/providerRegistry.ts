import { ChatProvider } from "./ChatProvider";
import { sampleProvider } from "./sampleProvider";
import { cursorProvider } from "./cursorProvider";
import { kiroProvider } from "./kiroProvider";

const providers: ChatProvider[] = [sampleProvider, cursorProvider, kiroProvider];

export function getProvider(id: string): ChatProvider | undefined {
  return providers.find((p) => p.id === id);
}

export async function getAvailableProviders(): Promise<ChatProvider[]> {
  const results = await Promise.all(
    providers.map(async (p) => ({ provider: p, available: await p.isAvailable() }))
  );
  return results.filter((r) => r.available).map((r) => r.provider);
}

export { providers };
