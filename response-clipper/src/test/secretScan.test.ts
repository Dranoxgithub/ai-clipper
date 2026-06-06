import { scanForSecrets } from "../markdown/secretScan";

test("detects Bearer token", () => {
  const result = scanForSecrets("Authorization: Bearer abc123xyz");
  expect(result.hasSecrets).toBe(true);
});

test("detects AWS_SECRET_ACCESS_KEY", () => {
  const result = scanForSecrets("export AWS_SECRET_ACCESS_KEY=abc123");
  expect(result.hasSecrets).toBe(true);
});

test("detects private key block", () => {
  const result = scanForSecrets("-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----");
  expect(result.hasSecrets).toBe(true);
});

test("detects OPENAI_API_KEY", () => {
  const result = scanForSecrets("OPENAI_API_KEY=sk-abc123");
  expect(result.hasSecrets).toBe(true);
});

test("does not flag normal math text", () => {
  const result = scanForSecrets(
    "## Why this matters\n\n对，这个区别很重要。\n\n$\nW_{\\text{up}} \\cdot \\operatorname{RoPE}(c)\n$"
  );
  // Math content should not trigger false positives
  expect(result.hasSecrets).toBe(false);
});

test("does not flag plain code about types", () => {
  const result = scanForSecrets(
    '```ts\ntype Message = { id: string; role: "user" | "assistant"; text: string; };\n```'
  );
  expect(result.hasSecrets).toBe(false);
});
