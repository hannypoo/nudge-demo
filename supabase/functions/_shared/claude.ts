const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = 'claude-sonnet-4-5-20250929';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeOptions {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}

export async function callClaude(options: ClaudeOptions): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: options.messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

export function truncateForLlm(text: string, maxChars: number = 40000): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n...[truncated]';
}

export function extractJsonFromResponse(text: string): Record<string, unknown> | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch { /* continue */ }

  // Strategy 2: JSON fence extraction
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch { /* continue */ }
  }

  // Strategy 3: Brace matching
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch { /* continue */ }
  }

  return null;
}
