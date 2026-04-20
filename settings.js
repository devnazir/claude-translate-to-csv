const keyEl = document.getElementById("key");
const showBtn = document.getElementById("show");
const saveBtn = document.getElementById("save");
const testBtn = document.getElementById("test");
const statusEl = document.getElementById("status");

chrome.storage.sync.get(["apiKey"], (d) => {
  if (d.apiKey) keyEl.value = d.apiKey;
});

showBtn.addEventListener("click", () => {
  const isPass = keyEl.type === "password";
  keyEl.type = isPass ? "text" : "password";
  showBtn.textContent = isPass ? "Hide" : "Show";
});

saveBtn.addEventListener("click", () => {
  const apiKey = keyEl.value.trim();
  if (!apiKey) {
    show("Please enter your API key", "err");
    return;
  }

  saveBtn.textContent = "Saving…";
  saveBtn.disabled = true;

  chrome.storage.sync.set({ apiKey }, () => {
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
  const apiKey = keyEl.value.trim();
  if (!apiKey) {
    show("Enter your API key first", "err");
    return;
  }

  testBtn.textContent = "Testing…";
  testBtn.disabled = true;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
      show("✓ Key works!", "ok");
    } else {
      const err = await res.json();
      show(`✗ ${err.error?.message || "Invalid key"}`, "err");
    }
  } catch (e) {
    show(`✗ ${e.message}`, "err");
  }

  testBtn.textContent = "Test key";
  testBtn.disabled = false;
});

function show(msg, type) {
  statusEl.textContent = msg;
  statusEl.style.color = type === "err" ? "#e07070" : "#6ec97a";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 3000);
}
