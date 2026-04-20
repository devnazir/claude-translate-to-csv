chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "TRANSLATE_BATCH") {
    doTranslate(message.items, message.languages).then(sendResponse);
    return true;
  }
  if (message.type === "GET_SETTINGS") {
    chrome.storage.sync.get(["apiKey"], sendResponse);
    return true;
  }
});

async function doTranslate(items, languages) {
  const settings = await chrome.storage.sync.get(["apiKey"]);
  const apiKey = settings.apiKey;

  if (!apiKey || apiKey.length < 10) {
    return {
      error:
        "No API key set. Click the extension icon (🌐) to enter your Anthropic API key.",
    };
  }

  const sourceObj = {};
  items.forEach((text, i) => {
    const key = textToKey(text, i);
    sourceObj[key] = text;
  });

  const sourceJson = JSON.stringify(sourceObj, null, 2);

  const prompt = `You are a professional localization engineer.

Translate all values in the source JSON into English (en) and Indonesian (id).

Source JSON (keys must be preserved exactly):
${sourceJson}

Return ONLY a valid JSON object with this exact structure:
{
  "source": { ...original key-value pairs... },
  "languages": {
    "English": { ...same keys, English translated values... },
    "Indonesian": { ...same keys, Indonesian translated values... }
  }
}

Rules:
- No markdown, no code fences, no explanation. Raw JSON only.
- Preserve every key exactly as-is.
- Keep placeholders like {name}, %s, {{var}} unchanged.
- If the source text is already in English, keep it as-is in the English object.
- If the source text is already in Indonesian, keep it as-is in the Indonesian object.
- Translate naturally and professionally.`;

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

function textToKey(text, index) {
  // Convert text to a snake_case key, max 40 chars
  const key = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40)
    .replace(/_+$/, "");
  return key || `item_${index + 1}`;
}
