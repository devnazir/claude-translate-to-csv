<img width="50" height="50" alt="icon" src="https://github.com/user-attachments/assets/05362d83-73a9-48eb-ae3d-d4c0fc86b3eb" />

# Pickslate

A Chrome extension that lets you pick any text elements on a webpage and instantly translate them into multiple languages — powered by your choice of AI provider (Anthropic, OpenAI, Gemini, Groq, OpenRouter, or GitHub Copilot). Export results as CSV or JSON, ready for your localization workflow.



https://github.com/user-attachments/assets/e7810e3e-be51-4f65-b2ee-f4c6a58cd52f


---

## ✨ Features

- 🖱️ **Click to collect** — pick any visible text element on any page
- 🤖 **Multi-provider AI** — supports Anthropic Claude, OpenAI, Gemini, Groq, OpenRouter, and GitHub Copilot
- 🌍 **14 target languages** — translate into Indonesian, English, Japanese, Korean, Chinese, Spanish, French, German, Arabic, Malay, Thai, Vietnamese, Hindi, and Portuguese
- 📋 **CSV & JSON export** — copy results in CSV, JSON, or per-language tab formats
- 🔁 **Toggle header row** — choose whether to include the header when copying
- 🏷️ **Smart placeholder detection** — automatically replaces dynamic values like counts (`{{count}}`), names (`{{name}}`), dates (`{{date}}`), and companies (`{{company}}`) across all translations
- ✏️ **Inline editing** — edit translation results directly in the modal before copying
- 🔑 **Key prefix** — optionally namespace your translation keys (e.g. `home.welcomeMessage`)

---

## 📦 Installation

> The extension is not yet on the Chrome Web Store. Install it manually via Developer Mode.

### Requirements

- Google Chrome (or any Chromium-based browser)
- An API key for your chosen AI provider

### Steps

1. **Clone or download this repository**

   ```bash
   git clone https://github.com/devnazir/claude-translate-to-csv.git
   ```

   Or download the ZIP from GitHub and extract it.

2. **Open Chrome Extensions page**

   Navigate to:

   ```
   chrome://extensions
   ```

3. **Enable Developer Mode**

   Toggle the **Developer mode** switch in the top-right corner.

4. **Load the extension**

   - Click **"Load unpacked"**
   - Select the folder where you cloned/extracted the repo

5. **Pin the extension** _(optional but recommended)_

   - Click the 🧩 puzzle icon in the Chrome toolbar
   - Click the 📌 pin icon next to **Pickslate**

---

## 🔑 Setup

1. Click the extension icon in the toolbar to open **Settings**
2. Choose your **AI provider** (Anthropic, OpenAI, Gemini, Groq, OpenRouter, or GitHub)
3. Enter your **API key** or token
4. Click **Save Settings**

| Provider   | Where to get a key                                                         |
| ---------- | -------------------------------------------------------------------------- |
| Anthropic  | [console.anthropic.com](https://console.anthropic.com/)                    |
| OpenAI     | [platform.openai.com/api-keys](https://platform.openai.com/api-keys)       |
| Gemini     | [aistudio.google.com](https://aistudio.google.com/app/apikey)              |
| Groq       | [console.groq.com/keys](https://console.groq.com/keys)                     |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys)                           |
| GitHub     | [github.com/settings/tokens](https://github.com/settings/tokens?type=beta) |

---

## 🚀 How to Use

1. Open any webpage — the **Pickslate** panel appears automatically
2. Click **"Start clicking elements"** to enter pick mode
3. Click any text on the page to collect it (click again to deselect)
4. Choose your **target languages** from the chip grid
5. Optionally set a **key prefix** (e.g. `home` → `home.welcomeMessage`)
6. Click **"Translate →"**
7. The result modal shows tabs for CSV, JSON, and each language
8. Edit results inline if needed, then click **"Copy to clipboard"**

---

## 🏷️ Smart Placeholder Detection

Pickslate automatically detects dynamic runtime values and replaces them with `{{placeholder}}` syntax across all translations:

| Source text              | Translated output         |
| ------------------------ | ------------------------- |
| `1 branch`               | `{{count}} branch`        |
| `3 tags`                 | `{{count}} tags`          |
| `Hello, Nazir 👋`        | `Hello, {{name}} 👋`      |
| `Overview of Nazir Corp` | `Overview of {{company}}` |
| `Last updated Monday`    | `Last updated {{date}}`   |

---

## 📄 Output Format

**CSV**

```csv
"key","en","id","ja"
"welcomeMessage","Welcome","Selamat datang","ようこそ"
"signIn","Sign in","Masuk","サインイン"
```

**JSON**

```json
{
  "source": { "welcomeMessage": "Welcome" },
  "languages": {
    "en": { "welcomeMessage": "Welcome" },
    "id": { "welcomeMessage": "Selamat datang" }
  }
}
```

---

## 🛠️ Tech Stack

- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Multi-provider AI support (Anthropic, OpenAI, Gemini, Groq, OpenRouter, GitHub)

---

## 📝 License

MIT
