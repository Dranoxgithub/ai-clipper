const SECRET_PATTERNS = [
  /AWS_SECRET_ACCESS_KEY/i,
  /AWS_ACCESS_KEY_ID/i,
  /OPENAI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /\bapi[_-]?key\b/i,
  /\bsecret\b/i,
  /\btoken\b/i,
  /Bearer\s+\S+/,
  /-----BEGIN PRIVATE KEY-----/,
  /-----BEGIN RSA PRIVATE KEY-----/,
];

export type ScanResult = {
  hasSecrets: boolean;
  matches: string[];
};

export function scanForSecrets(text: string): ScanResult {
  const matches: string[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  return {
    hasSecrets: matches.length > 0,
    matches,
  };
}
