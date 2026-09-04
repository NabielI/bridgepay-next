const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export class TranslationUnavailableError extends Error {
  constructor(message = "Translation belum tersedia.") {
    super(message);
    this.name = "TranslationUnavailableError";
  }
}

interface OpenAITextContent {
  type?: unknown;
  text?: unknown;
}

interface OpenAIOutputItem {
  type?: unknown;
  content?: unknown;
}

interface OpenAIResponsePayload {
  output_text?: unknown;
  output?: unknown;
}

function extractOutputText(payload: OpenAIResponsePayload | null) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) {
    return null;
  }

  for (const item of payload.output as OpenAIOutputItem[]) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content as OpenAITextContent[]) {
      if (
        (content.type === "output_text" || content.type === "text") &&
        typeof content.text === "string"
      ) {
        const text = content.text.trim();

        if (text) {
          return text;
        }
      }
    }
  }

  return null;
}

export async function translateText(
  text: string,
  targetLanguage = "English",
) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-5-mini";

  if (!apiKey) {
    throw new TranslationUnavailableError(
      "OPENAI_API_KEY belum dikonfigurasi untuk translation.",
    );
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `Translate the user's message to ${targetLanguage}. Return only the translated text.`,
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text }],
        },
      ],
      max_output_tokens: 500,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    throw new TranslationUnavailableError();
  }

  const payload = (await response.json().catch(() => null)) as
    | OpenAIResponsePayload
    | null;
  const translated = extractOutputText(payload);

  if (!translated) {
    throw new TranslationUnavailableError();
  }

  return translated;
}
