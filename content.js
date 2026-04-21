(() => {
  if (window.__claudeTranslateLoaded) return;
  window.__claudeTranslateLoaded = true;

  const LANGS = [
    { code: "id", label: "Indonesian", flag: "🇮🇩" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "ja", label: "Japanese", flag: "🇯🇵" },
    { code: "ko", label: "Korean", flag: "🇰🇷" },
    { code: "zh", label: "Chinese", flag: "🇨🇳" },
    { code: "es", label: "Spanish", flag: "🇪🇸" },
    { code: "fr", label: "French", flag: "🇫🇷" },
    { code: "de", label: "German", flag: "🇩🇪" },
    { code: "ar", label: "Arabic", flag: "🇸🇦" },
    { code: "ms", label: "Malay", flag: "🇲🇾" },
    { code: "th", label: "Thai", flag: "🇹🇭" },
    { code: "vi", label: "Vietnamese", flag: "🇻🇳" },
    { code: "hi", label: "Hindi", flag: "🇮🇳" },
    { code: "pt", label: "Portuguese", flag: "🇧🇷" },
  ];

  let isPickMode = false;
  let collectedItems = [];
  const selectedLangs = new Set(["id", "en"]);
  let panel = null;
  let resultModal = null;

  function buildPanel() {
    if (panel) return;
    panel = document.createElement("div");
    panel.id = "ct-panel";
    panel.innerHTML = `
      <div class="ct-panel-head">
        <span class="ct-panel-title">Pickslate</span>
        <button class="ct-panel-close" title="Close">✕</button>
      </div>
      <div class="ct-provider-badge" id="ct-provider-badge">Loading...</div>

      <div class="ct-section-label">1 · Pick mode</div>
      <button class="ct-pick-btn" id="ct-pick-btn">Start clicking elements</button>
      <div class="ct-pick-hint" id="ct-pick-hint">Click to activate, then click any text on the page</div>

      <div class="ct-divider"></div>

      <div class="ct-section-label">2 · Collected <span id="ct-count">(0)</span></div>
      <div class="ct-items" id="ct-items">
        <div class="ct-empty">Nothing collected yet</div>
      </div>
      <button class="ct-clear-btn" id="ct-clear-btn">Clear all</button>

      <div class="ct-divider"></div>

      <div class="ct-section-label">3 · Target languages</div>
      <div class="ct-langs" id="ct-langs"></div>

      <div class="ct-divider"></div>

      <div class="ct-section-label">3 · Key prefix <span class="ct-optional">(optional)</span></div>
      <input class="ct-prefix-input" id="ct-prefix-input" type="text" placeholder="e.g. home or home.custom" spellcheck="false" />

      <div class="ct-divider"></div>

      <button class="ct-translate-btn" id="ct-translate-btn" disabled>
        Translate →
      </button>
    `;
    document.body.appendChild(panel);

    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
      const provider = settings?.provider || "anthropic";
      const badge = panel.querySelector("#ct-provider-badge");
      if (badge) {
        if (provider === "github") {
          badge.textContent = "Using: GitHub Copilot";
          badge.style.background = "#0d1117";
          badge.style.color = "#58a6ff";
        } else {
          badge.textContent = "Using: Anthropic Claude";
          badge.style.background = "#2d1810";
          badge.style.color = "#d4a574";
        }
      }
    });

    const langGrid = panel.querySelector("#ct-langs");

    for (const l of LANGS) {
      const chip = document.createElement("button");
      chip.className = `ct-lang-chip${
        selectedLangs.has(l.code) ? " active" : ""
      }`;
      chip.textContent = `${l.flag} ${l.label}`;
      chip.dataset.code = l.code;
      chip.addEventListener("click", () => {
        if (selectedLangs.has(l.code)) selectedLangs.delete(l.code);
        else selectedLangs.add(l.code);
        chip.classList.toggle("active", selectedLangs.has(l.code));
        updateTranslateBtn();
      });
      langGrid.appendChild(chip);
    }

    panel
      .querySelector(".ct-panel-close")
      .addEventListener("click", destroyPanel);
    panel
      .querySelector("#ct-pick-btn")
      .addEventListener("click", togglePickMode);
    panel.querySelector("#ct-clear-btn").addEventListener("click", clearAll);
    panel
      .querySelector("#ct-translate-btn")
      .addEventListener("click", runTranslate);

    makeDraggable(panel, panel.querySelector(".ct-panel-head"));
    renderItems();
  }

  function destroyPanel() {
    stopPickMode();
    clearAll();
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  function togglePickMode() {
    if (isPickMode) stopPickMode();
    else startPickMode();
  }

  function startPickMode() {
    isPickMode = true;
    document.body.classList.add("ct-pick-active");
    const btn = panel?.querySelector("#ct-pick-btn");
    const hint = panel?.querySelector("#ct-pick-hint");
    if (btn) {
      btn.textContent = "⏹ Stop picking";
      btn.classList.add("active");
    }
    if (hint)
      hint.textContent = "Click any text element on the page to collect it";
    document.addEventListener("click", onPageClick, true);
    document.addEventListener("mouseover", onPageHover, true);
    document.addEventListener("mouseout", onPageOut, true);
  }

  function stopPickMode() {
    isPickMode = false;
    document.body.classList.remove("ct-pick-active");
    const btn = panel?.querySelector("#ct-pick-btn");
    const hint = panel?.querySelector("#ct-pick-hint");
    if (btn) {
      btn.textContent = "Start clicking elements";
      btn.classList.remove("active");
    }
    if (hint)
      hint.textContent = "Click to activate, then click any text on the page";
    document.removeEventListener("click", onPageClick, true);
    document.removeEventListener("mouseover", onPageHover, true);
    document.removeEventListener("mouseout", onPageOut, true);

    for (const el of document.querySelectorAll(".ct-hover")) {
      el.classList.remove("ct-hover");
    }
  }

  function onPageHover(e) {
    if (!isPickMode) return;
    if (panel?.contains(e.target)) return;
    for (const el of document.querySelectorAll(".ct-hover")) {
      el.classList.remove("ct-hover");
    }
    const el = e.target;
    const text = getElText(el);
    if (text) el.classList.add("ct-hover");
  }

  function onPageOut(e) {
    if (!isPickMode) return;
    e.target.classList.remove("ct-hover");
  }

  function onPageClick(e) {
    if (!isPickMode) return;
    if (panel?.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    const text = getElText(el);
    if (!text) return;

    const existing = collectedItems.findIndex((i) => i.el === el);
    if (existing !== -1) {
      collectedItems[existing].el.classList.remove("ct-selected");
      collectedItems.splice(existing, 1);
    } else {
      el.classList.add("ct-selected");
      collectedItems.push({ text, el });
    }

    renderItems();
    updateTranslateBtn();
  }

  function getElText(el) {
    if (!el || el === document.body || el === document.documentElement)
      return null;
    // Get direct text, not children
    const direct = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (direct.length >= 1) return direct;
    // Fallback: innerText if el has no children with text
    const inner = el.innerText?.trim();
    if (inner && inner.length >= 1 && inner.length <= 300) return inner;
    return null;
  }

  function renderItems() {
    const container = panel?.querySelector("#ct-items");
    const countEl = panel?.querySelector("#ct-count");
    if (!container) return;
    if (countEl) countEl.textContent = `(${collectedItems.length})`;

    if (collectedItems.length === 0) {
      container.innerHTML = `<div class="ct-empty">Nothing collected yet</div>`;
      return;
    }

    container.innerHTML = "";
    collectedItems.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "ct-item-row";
      row.innerHTML = `
        <span class="ct-item-num">${i + 1}</span>
        <span class="ct-item-text" title="${escAttr(item.text)}">${escHtml(
        truncate(item.text, 45)
      )}</span>
        <button class="ct-item-remove" data-i="${i}" title="Remove">✕</button>
      `;
      row.querySelector(".ct-item-remove").addEventListener("click", () => {
        collectedItems[i].el.classList.remove("ct-selected");
        collectedItems.splice(i, 1);
        renderItems();
        updateTranslateBtn();
      });
      container.appendChild(row);
    });
  }

  function clearAll() {
    for (const item of collectedItems) {
      item.el.classList.remove("ct-selected");
    }
    collectedItems = [];
    renderItems();
    updateTranslateBtn();
  }

  function updateTranslateBtn() {
    const btn = panel?.querySelector("#ct-translate-btn");
    if (!btn) return;
    const ready = collectedItems.length > 0 && selectedLangs.size > 0;
    btn.disabled = !ready;
    btn.textContent = ready
      ? `Translate ${collectedItems.length} item${
          collectedItems.length > 1 ? "s" : ""
        } →`
      : "Translate →";
  }

  function runTranslate() {
    if (collectedItems.length === 0 || selectedLangs.size === 0) return;

    const btn = panel.querySelector("#ct-translate-btn");
    btn.disabled = true;
    btn.textContent = "Translating…";

    const items = collectedItems.map((i) => i.text);
    const languages = LANGS.filter((l) => selectedLangs.has(l.code)).map(
      (l) => l.label
    );
    const prefix = panel.querySelector("#ct-prefix-input")?.value.trim() || "";

    chrome.runtime.sendMessage(
      { type: "TRANSLATE_BATCH", items, languages },
      (response) => {
        btn.disabled = false;
        updateTranslateBtn();
        if (response?.error) {
          showError(response.error);
        } else if (response?.result) {
          showResultModal(response.result, prefix);
        }
      }
    );
  }

  function showResultModal(initialResult, initialPrefix = "") {
    if (resultModal) resultModal.remove();

    let result = initialResult;
    let prefix = initialPrefix;
    const source = { ...result.source };
    const languages = Object.fromEntries(
      Object.entries(result.languages || {}).map(([l, d]) => [l, { ...d }])
    );
    const langNames = Object.keys(languages);

    stopPickMode();
    for (const el of document.querySelectorAll(".ct-hover, .ct-selected")) {
      el.classList.remove("ct-hover");
    }

    const tabs = [
      { id: "csv", label: "CSV" },
      { id: "json", label: "JSON" },
      ...langNames.map((l) => ({ id: `lang_${l}`, label: l })),
    ];

    resultModal = document.createElement("div");
    resultModal.id = "ct-result-modal";
    resultModal.innerHTML = `
      <div class="ct-modal-backdrop"></div>
      <div class="ct-modal-box">
        <div class="ct-modal-head">
          <span class="ct-modal-title">Translation Result</span>
          <div class="ct-modal-head-actions">
            <button class="ct-fullscreen-btn" id="ct-fullscreen-btn" title="Toggle fullscreen">⛶</button>
            <button class="ct-modal-close" title="Close">✕</button>
          </div>
        </div>
        <div class="ct-modal-tabs" id="ct-modal-tabs">
          ${tabs
            .map(
              (t, i) =>
                `<button class="ct-tab${i === 0 ? " active" : ""}" data-tab="${
                  t.id
                }">${t.label}</button>`
            )
            .join("")}
        </div>
        <div class="ct-modal-prefix-row" id="ct-modal-prefix-row">
          <label class="ct-modal-prefix-label" for="ct-modal-prefix-input">Prefix</label>
          <input class="ct-modal-prefix-input" id="ct-modal-prefix-input" type="text" value="${escAttr(
            prefix
          )}" placeholder="e.g. home or home.custom" spellcheck="false" />
        </div>
        <div class="ct-modal-body" id="ct-modal-body"></div>
        <div class="ct-modal-footer">
          <button class="ct-copy-btn" id="ct-copy-main">Copy to clipboard</button>
          <span class="ct-copy-status" id="ct-copy-status"></span>
        </div>
      </div>
    `;
    document.body.appendChild(resultModal);

    const modalBox = resultModal.querySelector(".ct-modal-box");

    resultModal
      .querySelector(".ct-modal-backdrop")
      .addEventListener("click", () => resultModal.remove());
    resultModal
      .querySelector(".ct-modal-close")
      .addEventListener("click", () => resultModal.remove());

    resultModal
      .querySelector("#ct-fullscreen-btn")
      .addEventListener("click", () => {
        modalBox.classList.toggle("ct-fullscreen");
        const btn = resultModal.querySelector("#ct-fullscreen-btn");
        btn.textContent = modalBox.classList.contains("ct-fullscreen")
          ? "⊡"
          : "⛶";
      });

    let activeTab = "csv";

    resultModal
      .querySelector("#ct-modal-prefix-input")
      .addEventListener("change", (e) => {
        prefix = e.target.value.trim();
        renderTab(activeTab);
      });

    function detectKeyRenames(oldKeys, newKeys) {
      const removed = oldKeys.filter((k) => !newKeys.includes(k));
      const added = newKeys.filter((k) => !oldKeys.includes(k));

      const renames = [];
      const count = Math.min(removed.length, added.length);
      for (let i = 0; i < count; i++) {
        renames.push({ from: removed[i], to: added[i] });
      }
      return renames;
    }

    function applyRenamesAcrossAll(renames) {
      if (!renames.length) return;
      const renameMap = Object.fromEntries(renames.map((r) => [r.from, r.to]));

      const newSource = {};
      for (const k of Object.keys(source)) {
        newSource[renameMap[k] ?? k] = source[k];
      }
      for (const k of Object.keys(source)) delete source[k];
      Object.assign(source, newSource);

      for (const lang of Object.keys(languages)) {
        const newLang = {};
        for (const k of Object.keys(languages[lang])) {
          newLang[renameMap[k] ?? k] = languages[lang][k];
        }
        languages[lang] = newLang;
      }
    }

    function renderTab(tabId) {
      activeTab = tabId;
      const body = resultModal.querySelector("#ct-modal-body");
      for (const t of resultModal.querySelectorAll(".ct-tab")) {
        t.classList.toggle("active", t.dataset.tab === tabId);
      }

      if (tabId === "csv") {
        const langCodes = langNames
          .map(
            (l) =>
              LANGS.find((x) => x.label === l)?.code ||
              l.toLowerCase().slice(0, 2)
          )
          .join(", ");
        body.innerHTML = `
          <label class="ct-csv-header-opt">
            <input type="radio" id="ct-csv-include-header" name="ct-csv-header" value="with" checked>
            <span>Include header row &nbsp;<code>key, ${langCodes}</code></span>
          </label>
          <label class="ct-csv-header-opt">
            <input type="radio" id="ct-csv-no-header" name="ct-csv-header" value="without">
            <span>Without header row</span>
          </label>
          <textarea class="ct-result-area" id="ct-csv-area">${escHtml(
            buildCSV(source, languages, true, prefix)
          )}</textarea>
        `;
        for (const radio of body.querySelectorAll(
          "input[name='ct-csv-header']"
        )) {
          radio.addEventListener("change", () => {
            const withHeader = body.querySelector(
              "#ct-csv-include-header"
            ).checked;
            body.querySelector("#ct-csv-area").value = buildCSV(
              source,
              languages,
              withHeader,
              prefix
            );
          });
        }
      } else if (tabId === "json") {
        const applyPrefixToObj = (obj) => {
          if (!prefix) return obj;
          const parts = prefix.split(".").filter(Boolean);
          const wrap = (inner) =>
            parts.reduceRight((acc, part) => ({ [part]: acc }), inner);
          const prefixedSource = wrap(obj.source || {});
          const prefixedLanguages = {};
          for (const [lang, data] of Object.entries(obj.languages || {})) {
            prefixedLanguages[lang] = wrap(data);
          }
          return { source: prefixedSource, languages: prefixedLanguages };
        };
        body.innerHTML = `<textarea class="ct-result-area">${escHtml(
          JSON.stringify(applyPrefixToObj(result), null, 2)
        )}</textarea>`;
      } else {
        const langName = tabId.replace("lang_", "");
        const langData = languages[langName] || {};
        body.innerHTML = `<textarea class="ct-result-area">${escHtml(
          JSON.stringify(langData, null, 2)
        )}</textarea>`;
      }

      resultModal
        .querySelector(".ct-result-area")
        ?.addEventListener("change", (e) => {
          try {
            if (tabId !== "csv" && tabId !== "json") {
              const langName = tabId.replace("lang_", "");
              const newLangData = JSON.parse(e.target.value);
              const oldKeys = Object.keys(source);
              const newKeys = Object.keys(newLangData);
              const renames = detectKeyRenames(oldKeys, newKeys);
              if (renames.length) applyRenamesAcrossAll(renames);
              languages[langName] = newLangData;
              result = { source, languages };
            }
          } catch (_) {
            // ignore parse errors while user is still editing
          }
        });
    }

    resultModal
      .querySelector("#ct-modal-tabs")
      .addEventListener("click", (e) => {
        if (e.target.dataset.tab) renderTab(e.target.dataset.tab);
      });

    resultModal.querySelector("#ct-copy-main").addEventListener("click", () => {
      const area = resultModal.querySelector(".ct-result-area");
      if (!area) return;
      let textToCopy = area.value;
      // For per-language tabs with a prefix, wrap the flat data with the prefix before copying
      if (activeTab !== "csv" && activeTab !== "json" && prefix) {
        try {
          const flat = JSON.parse(area.value);
          textToCopy = buildNestedJSON(flat, prefix);
        } catch (_) {
          // if invalid JSON, fall back to raw textarea value
        }
      }
      navigator.clipboard.writeText(textToCopy).then(() => {
        const s = resultModal.querySelector("#ct-copy-status");
        s.textContent = "Copied!";
        setTimeout(() => {
          s.textContent = "";
        }, 1800);
      });
    });

    renderTab("csv");
  }

  function buildNestedJSON(data, prefix = "") {
    if (!prefix) return JSON.stringify(data, null, 2);
    const parts = prefix.split(".").filter(Boolean);
    let nested = data;
    for (let i = parts.length - 1; i >= 0; i--) {
      nested = { [parts[i]]: nested };
    }
    return JSON.stringify(nested, null, 2);
  }

  function buildCSV(source, languages, includeHeader = true, prefix = "") {
    const langNames = Object.keys(languages);
    const getCode = (label) =>
      LANGS.find((l) => l.label === label)?.code ||
      label.toLowerCase().slice(0, 2);
    const keys = Object.keys(source);
    const csvVal = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const applyPrefix = (key) => (prefix ? `${prefix}.${key}` : key);
    const rows = keys.map((key) => {
      return [
        csvVal(applyPrefix(key)),
        ...langNames.map((l) => csvVal(languages[l]?.[key] ?? "")),
      ].join(",");
    });
    if (includeHeader) {
      const header = [
        csvVal("key"),
        ...langNames.map((l) => csvVal(getCode(l))),
      ].join(",");
      return [header, ...rows].join("\n");
    }
    return rows.join("\n");
  }

  function showError(msg) {
    const el = document.createElement("div");
    el.id = "ct-error-toast";
    el.textContent = `⚠ ${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TOGGLE_PANEL") {
      if (panel) destroyPanel();
      else buildPanel();
    }
  });

  buildPanel();

  function makeDraggable(el, handle) {
    let ox = 0;
    let oy = 0;
    let mx = 0;
    let my = 0;
    handle.style.cursor = "grab";
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      mx = e.clientX;
      my = e.clientY;
      const rect = el.getBoundingClientRect();
      ox = rect.left;
      oy = rect.top;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.left = `${ox}px`;
      el.style.top = `${oy}px`;
      handle.style.cursor = "grabbing";
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", stopDrag);
    });
    function onDrag(e) {
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      el.style.left = `${Math.max(0, ox + dx)}px`;
      el.style.top = `${Math.max(0, oy + dy)}px`;
    }
    function stopDrag() {
      handle.style.cursor = "grab";
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDrag);
    }
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }
  function truncate(s, n) {
    return s.length > n ? `${s.slice(0, n)}…` : s;
  }
})();
