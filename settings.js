const PROVIDERS = [
  "anthropic",
  "openai",
  "gemini",
  "groq",
  "openrouter",
  "github",
];

const fields = {
  anthropic: document.getElementById("anthropic-key"),
  openai: document.getElementById("openai-key"),
  gemini: document.getElementById("gemini-key"),
  groq: document.getElementById("groq-key"),
  openrouter: document.getElementById("openrouter-key"),
  github: document.getElementById("github-token"),
};

const storageKeys = {
  anthropic: "apiKey",
  openai: "openaiKey",
  gemini: "geminiKey",
  groq: "groqKey",
  openrouter: "openrouterKey",
  github: "githubToken",
};

const saveBtn = document.getElementById("save");
const testBtn = document.getElementById("test");
const statusEl = document.getElementById("status");
const providerRadios = document.querySelectorAll('input[name="provider"]');

for (const provider of PROVIDERS) {
  const showBtn = document.getElementById(`show-${provider}`);
  const input = fields[provider];
  if (!showBtn || !input) continue;
  showBtn.addEventListener("click", () => {
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    showBtn.textContent = isPass ? "Hide" : "Show";
  });
}

chrome.storage.sync.get(
  [
    "provider",
    "apiKey",
    "openaiKey",
    "geminiKey",
    "groqKey",
    "openrouterKey",
    "githubToken",
  ],
  (d) => {
    const provider = d.provider || "anthropic";
    document.getElementById(`provider-${provider}`).checked = true;
    updateProviderSections(provider);
    for (const p of PROVIDERS) {
      const key = storageKeys[p];
      if (d[key] && fields[p]) fields[p].value = d[key];
    }
  }
);

for (const radio of providerRadios) {
  radio.addEventListener("change", (e) =>
    updateProviderSections(e.target.value)
  );
}

function updateProviderSections(active) {
  for (const p of PROVIDERS) {
    const section = document.getElementById(`${p}-section`);
    if (section) section.classList.toggle("active", p === active);
  }
}

function getSelectedProvider() {
  return document.querySelector('input[name="provider"]:checked').value;
}

saveBtn.addEventListener("click", () => {
  const provider = getSelectedProvider();
  const val = fields[provider]?.value.trim();

  if (!val) {
    show(`Please enter your ${providerLabel(provider)} key`, "err");
    return;
  }

  saveBtn.textContent = "Saving…";
  saveBtn.disabled = true;

  const toSave = { provider };
  for (const p of PROVIDERS) {
    toSave[storageKeys[p]] = fields[p]?.value.trim() || "";
  }

  chrome.storage.sync.set(toSave, () => {
    if (chrome.runtime.lastError) {
      show(`Error: ${chrome.runtime.lastError.message}`, "err");
    } else {
      show("✓ Saved!", "ok");
    }
    saveBtn.textContent = "Save";
    saveBtn.disabled = false;
  });
});

testBtn.addEventListener("click", async () => {
  const provider = getSelectedProvider();
  const val = fields[provider]?.value.trim();

  if (!val) {
    show(`Enter your ${providerLabel(provider)} key first`, "err");
    return;
  }

  testBtn.textContent = "Testing…";
  testBtn.disabled = true;

  try {
    await testProviders[provider]?.(val);
  } catch (e) {
    show(`✗ ${e.message}`, "err");
  }

  testBtn.textContent = "Test key";
  testBtn.disabled = false;
});

const testProviders = {
  async anthropic(key) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) {
      show("✓ Anthropic key works!", "ok");
      return;
    }
    const e = await res.json();
    show(`✗ ${e.error?.message || "Invalid key"}`, "err");
  },

  async openai(key) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) {
      show("✓ OpenAI key works!", "ok");
      return;
    }
    const e = await res.json();
    show(`✗ ${e.error?.message || "Invalid key"}`, "err");
  },

  async gemini(key) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] }),
      }
    );
    if (res.ok) {
      show("✓ Gemini key works!", "ok");
      return;
    }
    const e = await res.json();
    show(`✗ ${e.error?.message || "Invalid key"}`, "err");
  },

  async groq(key) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) {
      show("✓ Groq key works!", "ok");
      return;
    }
    const e = await res.json();
    show(`✗ ${e.error?.message || "Invalid key"}`, "err");
  },

  async openrouter(key) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) {
      show("✓ OpenRouter key works!", "ok");
      return;
    }
    const e = await res.json();
    show(`✗ ${e.error?.message || "Invalid key"}`, "err");
  },

  async github(token) {
    const res = await fetch(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 10,
        }),
      }
    );
    if (res.ok) {
      show("✓ GitHub token works!", "ok");
      return;
    }
    const e = await res.json();
    show(`✗ ${e.error?.message || e.message || "Invalid token"}`, "err");
  },
};

function providerLabel(p) {
  const labels = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    gemini: "Gemini",
    groq: "Groq",
    openrouter: "OpenRouter",
    github: "GitHub",
  };
  return labels[p] || p;
}

function show(msg, type) {
  statusEl.textContent = msg;
  statusEl.style.color = type === "err" ? "#e07070" : "#6ec97a";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 3000);
}
