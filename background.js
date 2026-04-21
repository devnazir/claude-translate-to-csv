chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "TRANSLATE_BATCH") {
    doTranslate(message.items, message.languages).then(sendResponse);
    return true;
  }
  if (message.type === "GET_SETTINGS") {
    chrome.storage.sync.get(
      [
        "provider",
        "apiKey",
        "githubToken",
        "openaiKey",
        "geminiKey",
        "groqKey",
        "openrouterKey",
      ],
      sendResponse
    );
    return true;
  }
});

async function doTranslate(items, languages) {
  const settings = await chrome.storage.sync.get([
    "provider",
    "apiKey",
    "githubToken",
    "openaiKey",
    "geminiKey",
    "groqKey",
    "openrouterKey",
  ]);
  const provider = settings.provider || "anthropic";

  if (provider === "openai")
    return await translateWithOpenAI(items, languages, settings.openaiKey);
  if (provider === "gemini")
    return await translateWithGemini(items, languages, settings.geminiKey);
  if (provider === "groq")
    return await translateWithGroq(items, languages, settings.groqKey);
  if (provider === "openrouter")
    return await translateWithOpenRouter(
      items,
      languages,
      settings.openrouterKey
    );
  if (provider === "github")
    return await translateWithGitHub(items, languages, settings.githubToken);

  return await translateWithAnthropic(items, languages, settings.apiKey);
}

async function translateWithAnthropic(items, languages, apiKey) {
  if (!apiKey || apiKey.length < 10) {
    return {
      error:
        "No Anthropic API key set. Click the extension icon (🌐) to enter your API key.",
    };
  }

  const sourceObj = {};
  items.forEach((text, i) => {
    const key = textToKey(text, i);
    sourceObj[key] = text;
  });

  const sourceJson = JSON.stringify(sourceObj, null, 2);
  const prompt = buildPrompt(sourceJson, languages);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.error?.message || "API error. Check your API key." };
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { result: parsed };
  } catch (e) {
    return { error: `Failed: ${e.message}` };
  }
}

async function translateWithGitHub(items, languages, githubToken) {
  if (!githubToken || githubToken.length < 10) {
    return {
      error:
        "No GitHub token set. Click the extension icon (🌐) to enter your token.",
    };
  }

  const sourceObj = {};
  items.forEach((text, i) => {
    const key = textToKey(text, i);
    sourceObj[key] = text;
  });

  const sourceJson = JSON.stringify(sourceObj, null, 2);
  const prompt = buildPrompt(sourceJson, languages);

  try {
    const response = await fetch(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2048,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return {
        error:
          err.error?.message || err.message || "API error. Check your token.",
      };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { result: parsed };
  } catch (e) {
    return { error: `Failed: ${e.message}` };
  }
}

async function translateWithOpenAICompat(
  items,
  languages,
  apiKey,
  endpoint,
  model,
  providerName
) {
  if (!apiKey || apiKey.length < 10) {
    return {
      error: `No ${providerName} key set. Click the extension icon (🌐) to enter your key.`,
    };
  }

  const sourceObj = {};
  items.forEach((text, i) => {
    sourceObj[textToKey(text, i)] = text;
  });

  const prompt = buildPrompt(JSON.stringify(sourceObj, null, 2), languages);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.error?.message || err.message || "API error." };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    return { result: JSON.parse(clean) };
  } catch (e) {
    return { error: `Failed: ${e.message}` };
  }
}

async function translateWithOpenAI(items, languages, apiKey) {
  return translateWithOpenAICompat(
    items,
    languages,
    apiKey,
    "https://api.openai.com/v1/chat/completions",
    "gpt-4o-mini",
    "OpenAI"
  );
}

async function translateWithGroq(items, languages, apiKey) {
  return translateWithOpenAICompat(
    items,
    languages,
    apiKey,
    "https://api.groq.com/openai/v1/chat/completions",
    "llama-3.3-70b-versatile",
    "Groq"
  );
}

async function translateWithOpenRouter(items, languages, apiKey) {
  return translateWithOpenAICompat(
    items,
    languages,
    apiKey,
    "https://openrouter.ai/api/v1/chat/completions",
    "openai/gpt-4o-mini",
    "OpenRouter"
  );
}

async function translateWithGemini(items, languages, apiKey) {
  if (!apiKey || apiKey.length < 10) {
    return {
      error:
        "No Gemini key set. Click the extension icon (🌐) to enter your key.",
    };
  }

  const sourceObj = {};
  items.forEach((text, i) => {
    sourceObj[textToKey(text, i)] = text;
  });

  const prompt = buildPrompt(JSON.stringify(sourceObj, null, 2), languages);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return { error: err.error?.message || "Gemini API error." };
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    return { result: JSON.parse(clean) };
  } catch (e) {
    return { error: `Failed: ${e.message}` };
  }
}

function buildPrompt(sourceJson, languages) {
  const langList = Array.isArray(languages) ? languages.join(", ") : languages;
  const langStructure = Array.isArray(languages)
    ? languages
        .map((l) => `    "${l}": { ...same keys, ${l} translated values... }`)
        .join(",\n")
    : `    "English": { ...same keys, English translated values... }`;

  return `You are a professional localization engineer.

Translate all values in the source JSON into the following languages: ${langList}.

Source JSON (keys must be preserved exactly):
${sourceJson}

Return ONLY a valid JSON object with this exact structure:
{
  "source": { ...original key-value pairs... },
  "languages": {
${langStructure}
  }
}

Rules:
- No markdown, no code fences, no explanation. Raw JSON only.
- Preserve every key exactly as-is.
- Keep existing placeholders like {name}, %s, {{var}} unchanged.
- If the source text is already in one of the target languages, keep it as-is for that language.
- Translate naturally and professionally.
- IMPORTANT — detect dynamic runtime values and replace them with {{placeholder}} syntax:
  * Standalone leading integers or numbers followed by a noun (e.g. "1 branch", "3 tags", "10 commits") — the number MUST become {{count}}: "{{count}} branch", "{{count}} tags", "{{count}} commits"
  * Proper names of people (e.g. "Nazir", "John") → {{name}}
  * Company or organization names (e.g. "NAZIR DEVELOPMENT", "Acme Corp") → {{company}}
  * Dates or times (e.g. "Monday", "Jan 1 2024") → {{date}}
  * Any other value that is clearly injected at runtime → {{value}}
  * Apply this to ALL language translations including the source.
  * The raw digit must NEVER appear in the output — always replace it with {{count}}.
  * Example: "1 branch" → "{{count}} branch", "3 tags" → "{{count}} tags", "100 users" → "{{count}} users"
  * Example: "Hello, Nazir 👋" → "Hello, {{name}} 👋"
  * Example: "Overview of NAZIR DEVELOPMENT" → "Overview of {{company}}"`;
}

function textToKey(text, index) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8); // limit word count before slicing
  if (!words.length) return `item${index + 1}`;
  const camel =
    words[0] +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  return camel.slice(0, 40) || `item${index + 1}`;
}
