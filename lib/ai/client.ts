export function isAiConfigured(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
  );
}

export async function chatComplete(prompt: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    return chatAnthropic(prompt);
  }
  if (process.env.OPENAI_API_KEY) {
    return chatOpenAI(prompt);
  }
  throw new Error("No AI provider configured");
}

async function chatAnthropic(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.content as { text: string }[])
    .map((c) => c.text)
    .join("");
}

async function chatOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}
