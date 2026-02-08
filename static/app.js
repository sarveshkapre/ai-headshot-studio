const state = {
  file: null,
  preset: "portrait-4x5",
  style: "classic",
  styles: {},
  controller: null,
  debounce: null,
  processedUrl: null,
  toastTimer: null,
  saveTimer: null,
  saved: null,
  history: [],
  useCase: null,
  isApplyingUseCase: false,
};

const elements = {
  fileInput: document.getElementById("fileInput"),
  dropzone: document.getElementById("dropzone"),
  useCaseGrid: document.getElementById("useCaseGrid"),
  removeBg: document.getElementById("removeBg"),
  background: document.getElementById("background"),
  backgroundCustom: document.getElementById("backgroundCustom"),
  backgroundHex: document.getElementById("backgroundHex"),
  resetBackground: document.getElementById("resetBackground"),
  preset: document.getElementById("preset"),
  format: document.getElementById("format"),
  resetCropExport: document.getElementById("resetCropExport"),
  autoUpdate: document.getElementById("autoUpdate"),
  processBtn: document.getElementById("processBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  exportPresetBtn: document.getElementById("exportPresetBtn"),
  importPresetBtn: document.getElementById("importPresetBtn"),
  importPresetInput: document.getElementById("importPresetInput"),
  resetSliders: document.getElementById("resetSliders"),
  resetStudio: document.getElementById("resetStudio"),
  originalPreview: document.getElementById("originalPreview"),
  processedPreview: document.getElementById("processedPreview"),
  originalEmpty: document.getElementById("originalEmpty"),
  processedEmpty: document.getElementById("processedEmpty"),
  loading: document.getElementById("loading"),
  styleGrid: document.getElementById("styleGrid"),
  originalMeta: document.getElementById("originalMeta"),
  processedMeta: document.getElementById("processedMeta"),
  toggleZoom: document.getElementById("toggleZoom"),
  toggleGuide: document.getElementById("toggleGuide"),
  frameGuide: document.getElementById("frameGuide"),
  compareOriginal: document.getElementById("compareOriginal"),
  compareSlider: document.getElementById("compareSlider"),
  compareLine: document.querySelector(".compare__line"),
  historyList: document.getElementById("historyList"),
  shortcutsBtn: document.getElementById("shortcutsBtn"),
  modalOverlay: document.getElementById("modalOverlay"),
  closeModal: document.getElementById("closeModal"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  toastDismiss: document.getElementById("toastDismiss"),
  backgroundSwatch: document.getElementById("backgroundSwatch"),
  sliders: {
    brightness: document.getElementById("brightness"),
    contrast: document.getElementById("contrast"),
    color: document.getElementById("color"),
    sharpness: document.getElementById("sharpness"),
    soften: document.getElementById("soften"),
  },
  cropSliders: {
    topBias: document.getElementById("topBias"),
  },
  exportSliders: {
    jpegQuality: document.getElementById("jpegQuality"),
  },
  sliderValues: {
    brightness: document.getElementById("brightnessValue"),
    contrast: document.getElementById("contrastValue"),
    color: document.getElementById("colorValue"),
    sharpness: document.getElementById("sharpnessValue"),
    soften: document.getElementById("softenValue"),
  },
  cropSliderValues: {
    topBias: document.getElementById("topBiasValue"),
  },
  exportSliderValues: {
    jpegQuality: document.getElementById("jpegQualityValue"),
  },
  useCaseButtons: document.querySelectorAll("[data-use-case]"),
};

function setStatusLoading(isLoading) {
  elements.loading.classList.toggle("show", isLoading);
  elements.cancelBtn.hidden = !isLoading;
  elements.processBtn.disabled = isLoading;
  elements.downloadBtn.disabled = isLoading || !state.processedUrl;
}

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const STORAGE_KEY = "ai-headshot-studio:settings:v1";
const ZOOM_KEY = "ai-headshot-studio:preview-zoom:v1";
const GUIDE_KEY = "ai-headshot-studio:framing-guide:v1";

const USE_CASES = {
  linkedin: {
    label: "LinkedIn preset applied.",
    removeBg: true,
    background: "white",
    preset: "square",
    topBias: 0.18,
    format: "jpeg",
    jpegQuality: 92,
    style: "studio",
  },
  resume: {
    label: "Resume preset applied.",
    removeBg: true,
    background: "light",
    preset: "portrait-4x5",
    topBias: 0.2,
    format: "png",
    jpegQuality: 92,
    style: "classic",
  },
  passport: {
    label: "Passport preset applied.",
    removeBg: true,
    background: "white",
    preset: "passport-2x2",
    topBias: 0.16,
    format: "jpeg",
    jpegQuality: 92,
    style: "classic",
  },
};

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = safeParseJSON(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readZoomMode() {
  try {
    const value = localStorage.getItem(ZOOM_KEY);
    return value === "actual" ? "actual" : "fit";
  } catch {
    return "fit";
  }
}

function writeZoomMode(mode) {
  try {
    localStorage.setItem(ZOOM_KEY, mode);
  } catch {}
}

function setZoomMode(mode) {
  const isActual = mode === "actual";
  elements.toggleZoom.textContent = isActual ? "Fit to panel" : "Actual size";
  elements.originalPreview.classList.toggle("preview__image--actual", isActual);
  elements.processedPreview.classList.toggle("preview__image--actual", isActual);
  elements.compareOriginal.classList.toggle("preview__image--actual", isActual);
  const processedFrame = elements.processedPreview.closest(".preview__frame");
  processedFrame?.classList.toggle("preview__frame--actual", isActual);
  const originalFrame = elements.originalPreview.closest(".preview__frame");
  originalFrame?.classList.toggle("preview__frame--actual", isActual);
  writeZoomMode(mode);
}

function readGuideMode() {
  try {
    const value = localStorage.getItem(GUIDE_KEY);
    return value === "on" ? "on" : "off";
  } catch {
    return "off";
  }
}

function writeGuideMode(mode) {
  try {
    localStorage.setItem(GUIDE_KEY, mode);
  } catch {}
}

function setGuideMode(mode) {
  const isOn = mode === "on";
  elements.toggleGuide.textContent = isOn ? "Guide: On" : "Guide: Off";
  elements.frameGuide.classList.toggle("show", isOn);
  writeGuideMode(mode);
}

function writeSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function collectCurrentSettings() {
  return {
    removeBg: elements.removeBg.checked,
    background: elements.background.value,
    backgroundHex: elements.backgroundHex.value,
    preset: elements.preset.value,
    topBias: Number(elements.cropSliders.topBias.value),
    format: elements.format.value,
    jpegQuality: Number(elements.exportSliders.jpegQuality.value),
    autoUpdate: elements.autoUpdate.checked,
    style: state.style,
    useCase: state.useCase,
    sliders: getCurrentSliderValues(),
  };
}

function scheduleSaveSettings() {
  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
  }
  state.saveTimer = setTimeout(() => {
    state.saveTimer = null;
    writeSettings(collectCurrentSettings());
  }, 250);
}

function showToast(message) {
  if (!message) return;
  elements.toastMessage.textContent = message;
  elements.toast.hidden = false;
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }
  state.toastTimer = setTimeout(() => {
    hideToast();
  }, 6500);
}

function hideToast() {
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }
  elements.toast.hidden = true;
  elements.toastMessage.textContent = "";
}

function updateSliderValues() {
  Object.keys(elements.sliders).forEach((key) => {
    elements.sliderValues[key].textContent = Number(elements.sliders[key].value).toFixed(2);
  });
  Object.keys(elements.cropSliders).forEach((key) => {
    elements.cropSliderValues[key].textContent = Number(elements.cropSliders[key].value).toFixed(2);
  });
  Object.keys(elements.exportSliders).forEach((key) => {
    elements.exportSliderValues[key].textContent = String(
      Math.round(Number(elements.exportSliders[key].value)),
    );
  });
}

function setUseCaseSelection(key) {
  state.useCase = key || null;
  elements.useCaseButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.useCase === state.useCase);
  });
}

function maybeClearUseCase() {
  if (state.isApplyingUseCase) return;
  setUseCaseSelection(null);
}

function updateBackgroundCustomVisibility() {
  const isCustom = elements.background.value === "custom";
  elements.backgroundCustom.hidden = !isCustom;
  if (isCustom && !elements.backgroundHex.value) {
    elements.backgroundHex.value = "#ffffff";
  }
}

function setStyleSelection(styleKey) {
  state.style = styleKey;
  [...elements.styleGrid.children].forEach((child) => {
    child.classList.toggle("active", child.dataset.key === styleKey);
  });
}

function setSliders(values) {
  elements.sliders.brightness.value = String(values.brightness);
  elements.sliders.contrast.value = String(values.contrast);
  elements.sliders.color.value = String(values.color);
  elements.sliders.sharpness.value = String(values.sharpness);
  elements.sliders.soften.value = String(values.soften);
  updateSliderValues();
}

function neutralSliders() {
  return {
    brightness: 1.0,
    contrast: 1.0,
    color: 1.0,
    sharpness: 1.0,
    soften: 0.0,
  };
}

function applySavedSettings() {
  if (!state.saved) return;
  if (typeof state.saved.removeBg === "boolean") {
    elements.removeBg.checked = state.saved.removeBg;
  }
  if (typeof state.saved.background === "string") {
    elements.background.value = state.saved.background;
  }
  if (typeof state.saved.backgroundHex === "string") {
    elements.backgroundHex.value = state.saved.backgroundHex;
  }
  if (typeof state.saved.topBias === "number" && Number.isFinite(state.saved.topBias)) {
    elements.cropSliders.topBias.value = String(state.saved.topBias);
  }
  if (typeof state.saved.jpegQuality === "number" && Number.isFinite(state.saved.jpegQuality)) {
    elements.exportSliders.jpegQuality.value = String(state.saved.jpegQuality);
  }
  if (typeof state.saved.format === "string") {
    elements.format.value = state.saved.format;
  }
  if (typeof state.saved.autoUpdate === "boolean") {
    elements.autoUpdate.checked = state.saved.autoUpdate;
  }
  if (typeof state.saved.preset === "string") {
    state.preset = state.saved.preset;
  }
  if (typeof state.saved.style === "string") {
    state.style = state.saved.style;
  }
  if (typeof state.saved.useCase === "string") {
    state.useCase = state.saved.useCase;
  }
}

function getCurrentSliderValues() {
  return {
    brightness: Number(elements.sliders.brightness.value),
    contrast: Number(elements.sliders.contrast.value),
    color: Number(elements.sliders.color.value),
    sharpness: Number(elements.sliders.sharpness.value),
    soften: Number(elements.sliders.soften.value),
  };
}

function floatsEqual(a, b, epsilon = 0.005) {
  return Math.abs(a - b) <= epsilon;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, numeric));
}

function normalizeSliderValues(rawValues) {
  const defaults = neutralSliders();
  if (!rawValues || typeof rawValues !== "object") {
    return defaults;
  }
  return {
    brightness: clampNumber(rawValues.brightness, 0.5, 1.5, defaults.brightness),
    contrast: clampNumber(rawValues.contrast, 0.5, 1.5, defaults.contrast),
    color: clampNumber(rawValues.color, 0.5, 1.5, defaults.color),
    sharpness: clampNumber(rawValues.sharpness, 0.5, 1.8, defaults.sharpness),
    soften: clampNumber(rawValues.soften, 0, 1, defaults.soften),
  };
}

function sliderValuesMatchStyle(values, style) {
  if (!style) return false;
  return (
    floatsEqual(values.brightness, style.brightness) &&
    floatsEqual(values.contrast, style.contrast) &&
    floatsEqual(values.color, style.color) &&
    floatsEqual(values.sharpness, style.sharpness) &&
    floatsEqual(values.soften, style.soften)
  );
}

function downloadTextFile(filename, text, mimeType = "application/json") {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportPreset() {
  const payload = {
    app: "ai-headshot-studio",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: collectCurrentSettings(),
  };
  const serialized = JSON.stringify(payload, null, 2);

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("clipboard-unavailable");
    }
    await navigator.clipboard.writeText(serialized);
    showToast("Preset copied to clipboard.");
  } catch {
    const filename = `headshot-preset-${Date.now()}.json`;
    downloadTextFile(filename, serialized);
    showToast("Clipboard unavailable. Preset downloaded as JSON.");
  }
}

function applyImportedPresetSettings(settings) {
  if (!settings || typeof settings !== "object") {
    throw new Error("Preset settings are missing.");
  }

  if (typeof settings.removeBg === "boolean") {
    elements.removeBg.checked = settings.removeBg;
  }

  const backgrounds = new Set(["white", "light", "blue", "gray", "custom", "transparent"]);
  if (typeof settings.background === "string" && backgrounds.has(settings.background)) {
    elements.background.value = settings.background;
  }
  if (typeof settings.backgroundHex === "string") {
    elements.backgroundHex.value = settings.backgroundHex;
  }

  if (typeof settings.preset === "string") {
    const hasPreset = [...elements.preset.options].some((option) => option.value === settings.preset);
    if (hasPreset) {
      elements.preset.value = settings.preset;
    }
  }

  elements.cropSliders.topBias.value = String(
    clampNumber(settings.topBias, 0, 1, Number(elements.cropSliders.topBias.value)),
  );

  if (settings.format === "png" || settings.format === "jpeg") {
    elements.format.value = settings.format;
  }
  elements.exportSliders.jpegQuality.value = String(
    Math.round(
      clampNumber(settings.jpegQuality, 60, 100, Number(elements.exportSliders.jpegQuality.value)),
    ),
  );
  if (typeof settings.autoUpdate === "boolean") {
    elements.autoUpdate.checked = settings.autoUpdate;
  }

  const styleKey =
    typeof settings.style === "string" ? settings.style.toLowerCase().trim() : "manual";
  const baseSliders =
    styleKey && styleKey !== "manual" && state.styles[styleKey]
      ? { ...state.styles[styleKey] }
      : neutralSliders();
  const importedSliders =
    settings.sliders && typeof settings.sliders === "object"
      ? normalizeSliderValues(settings.sliders)
      : null;
  const finalSliders = importedSliders
    ? {
        ...baseSliders,
        ...importedSliders,
      }
    : baseSliders;
  setSliders(finalSliders);

  if (styleKey !== "manual" && sliderValuesMatchStyle(finalSliders, state.styles[styleKey])) {
    setStyleSelection(styleKey);
  } else {
    setStyleSelection("manual");
  }

  const useCaseKey =
    typeof settings.useCase === "string" && settings.useCase in USE_CASES ? settings.useCase : null;
  setUseCaseSelection(useCaseKey);

  enforceCompatibleOptions();
  updateBackgroundCustomVisibility();
  updateBackgroundSwatch();
  updateSliderValues();
  elements.exportSliders.jpegQuality.disabled = elements.format.value !== "jpeg";
  queueProcess(true);
  scheduleSaveSettings();
}

async function importPreset(file) {
  if (!file) return;
  if (file.size > 512 * 1024) {
    throw new Error("Preset file is too large.");
  }

  const text = await file.text();
  const parsed = safeParseJSON(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid preset JSON.");
  }

  const settings =
    parsed.settings && typeof parsed.settings === "object" ? parsed.settings : parsed;
  applyImportedPresetSettings(settings);
}

function syncStyleIfSlidersChanged() {
  if (state.style === "manual") return;
  const style = state.styles[state.style];
  if (!style) {
    setStyleSelection("manual");
    return;
  }
  const current = getCurrentSliderValues();
  const matches =
    floatsEqual(current.brightness, style.brightness) &&
    floatsEqual(current.contrast, style.contrast) &&
    floatsEqual(current.color, style.color) &&
    floatsEqual(current.sharpness, style.sharpness) &&
    floatsEqual(current.soften, style.soften);
  if (!matches) {
    setStyleSelection("manual");
  }
}

function applyStyle(styleKey) {
  if (styleKey === "manual") {
    setStyleSelection("manual");
    if (state.saved?.style === "manual" && state.saved?.sliders) {
      setSliders({
        ...neutralSliders(),
        ...state.saved.sliders,
      });
      state.saved = { ...state.saved, sliders: null };
    }
    queueProcess();
    scheduleSaveSettings();
    return;
  }
  const style = state.styles[styleKey];
  if (!style) {
    setStyleSelection("manual");
    queueProcess();
    return;
  }
  setSliders(style);
  setStyleSelection(styleKey);
  queueProcess();
  scheduleSaveSettings();
}

function applyUseCase(useCaseKey) {
  const preset = USE_CASES[useCaseKey];
  if (!preset) return;
  state.isApplyingUseCase = true;
  elements.removeBg.checked = preset.removeBg;
  elements.background.value = preset.background;
  elements.preset.value = preset.preset;
  elements.cropSliders.topBias.value = String(preset.topBias);
  elements.format.value = preset.format;
  elements.exportSliders.jpegQuality.value = String(preset.jpegQuality);
  elements.exportSliders.jpegQuality.disabled = preset.format !== "jpeg";
  elements.autoUpdate.checked = true;
  enforceCompatibleOptions();
  updateBackgroundCustomVisibility();
  updateBackgroundSwatch();
  updateSliderValues();
  applyStyle(preset.style);
  setUseCaseSelection(useCaseKey);
  state.isApplyingUseCase = false;
  queueProcess(true);
  scheduleSaveSettings();
  showToast(preset.label);
}

function createStyleCard(style) {
  const card = document.createElement("div");
  card.className = "style-card";
  card.dataset.key = style.key;
  card.textContent = style.name;
  card.addEventListener("click", () => {
    maybeClearUseCase();
    applyStyle(style.key);
  });
  return card;
}

async function loadPresets() {
  let data;
  try {
    const response = await fetch("/api/presets");
    data = await response.json();
  } catch (error) {
    showToast("Could not load presets. Check the server and refresh.");
    return;
  }

  elements.preset.innerHTML = "";
  data.presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.key;
    option.textContent = preset.name;
    if (preset.key === state.preset) {
      option.selected = true;
    }
    elements.preset.appendChild(option);
  });
  if (state.preset) {
    elements.preset.value = state.preset;
  }

  elements.styleGrid.innerHTML = "";
  state.styles = {};
  data.styles.forEach((style) => {
    state.styles[style.key] = style;
  });

  elements.styleGrid.appendChild(createStyleCard({ key: "manual", name: "Manual" }));
  data.styles.forEach((style) => elements.styleGrid.appendChild(createStyleCard(style)));

  if (state.style !== "manual" && !state.styles[state.style]) {
    state.style = "manual";
  }
  applyStyle(state.style);
  enforceCompatibleOptions();
  updateBackgroundCustomVisibility();
  updateSliderValues();
  setUseCaseSelection(state.useCase);
}

function setFile(file) {
  if (!file || typeof file.size !== "number") {
    showToast("Could not read that file.");
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    showToast("File too large. Max 12MB.");
    return;
  }
  if (!file.type || !file.type.startsWith("image/")) {
    showToast("Unsupported file type. Please choose an image.");
    return;
  }

  state.file = file;
  elements.downloadBtn.disabled = true;
  hideToast();
  elements.processedMeta.textContent = "";
  elements.originalEmpty.hidden = true;
  elements.processedEmpty.hidden = false;
  if (state.processedUrl) {
    elements.compareSlider.value = "50";
    elements.compareLine.style.left = "50%";
    elements.compareOriginal.style.clipPath = "inset(0 50% 0 0)";
  }
  if (state.processedUrl) {
    revokeObjectUrl(state.processedUrl);
    state.processedUrl = null;
  }
  elements.processedPreview.removeAttribute("src");
  const reader = new FileReader();
  reader.onload = () => {
    elements.originalPreview.src = reader.result;
    elements.compareOriginal.src = reader.result;
    const img = new Image();
    img.onload = () => {
      elements.originalMeta.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  queueProcess(true);
}

function revokeObjectUrl(url) {
  if (typeof url === "string" && url) {
    URL.revokeObjectURL(url);
  }
}

function clearHistory() {
  state.history.forEach((entry) => {
    revokeObjectUrl(entry?.url);
  });
  state.history = [];
  renderHistory();
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (state.history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No exports yet.";
    elements.historyList.appendChild(empty);
    return;
  }
  state.history.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const meta = document.createElement("div");
    meta.className = "history-meta";
    const title = document.createElement("div");
    title.className = "history-title";
    title.textContent = item.name;
    const sub = document.createElement("div");
    sub.className = "history-sub";
    sub.textContent = item.detail;
    meta.appendChild(title);
    meta.appendChild(sub);

    const button = document.createElement("button");
    button.className = "btn btn--ghost btn--small";
    button.type = "button";
    button.textContent = "Download";
    button.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = item.url;
      link.download = item.filename;
      link.click();
    });

    row.appendChild(meta);
    row.appendChild(button);
    elements.historyList.appendChild(row);
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)}${units[idx]}`;
}

function enforceCompatibleOptions() {
  if (elements.background.value === "transparent") {
    if (!elements.removeBg.checked) {
      elements.removeBg.checked = true;
    }
    if (elements.format.value === "jpeg") {
      elements.format.value = "png";
    }
  }
  updateBackgroundCustomVisibility();
}

function updateBackgroundSwatch() {
  const value = elements.background.value;
  const colors = {
    white: "#ffffff",
    light: "#f5f6f8",
    blue: "#e5ecf5",
    gray: "#e6e6e6",
  };
  if (value === "custom") {
    elements.backgroundSwatch.classList.remove("swatch--transparent");
    elements.backgroundSwatch.style.background = elements.backgroundHex.value || "#ffffff";
  } else if (value === "transparent") {
    elements.backgroundSwatch.classList.add("swatch--transparent");
    elements.backgroundSwatch.style.background = "";
  } else {
    elements.backgroundSwatch.classList.remove("swatch--transparent");
    elements.backgroundSwatch.style.background = colors[value] || "#ffffff";
  }
}

function queueProcess(force = false) {
  if (!state.file) return;
  if (!elements.autoUpdate.checked && !force) return;
  if (state.debounce) {
    clearTimeout(state.debounce);
  }
  state.debounce = setTimeout(() => {
    processImage();
  }, 300);
}

function formDataFromState() {
  const data = new FormData();
  data.append("image", state.file);
  data.append("remove_bg", elements.removeBg.checked ? "true" : "false");
  data.append("background", elements.background.value);
  if (elements.background.value === "custom") {
    data.append("background_hex", elements.backgroundHex.value || "#ffffff");
  }
  data.append("preset", elements.preset.value);
  data.append("top_bias", elements.cropSliders.topBias.value);
  data.append("jpeg_quality", elements.exportSliders.jpegQuality.value);
  data.append("brightness", elements.sliders.brightness.value);
  data.append("contrast", elements.sliders.contrast.value);
  data.append("color", elements.sliders.color.value);
  data.append("sharpness", elements.sliders.sharpness.value);
  data.append("soften", elements.sliders.soften.value);
  data.append("format", elements.format.value);
  return data;
}

async function processImage() {
  if (!state.file) {
    showToast("Choose a photo first.");
    elements.dropzone.focus();
    return;
  }

  if (state.controller) {
    state.controller.abort();
  }
  state.controller = new AbortController();
  setStatusLoading(true);

  try {
    const response = await fetch("/api/process", {
      method: "POST",
      body: formDataFromState(),
      signal: state.controller.signal,
    });

    if (!response.ok) {
      let message = "Processing failed.";
      try {
        const detail = await response.json();
        message = detail.detail || message;
      } catch {}
      throw new Error(message);
    }

    const width = response.headers.get("x-output-width");
    const height = response.headers.get("x-output-height");
    const fmt = response.headers.get("x-output-format");
    const ms = response.headers.get("x-processing-ms");
    const bytes = response.headers.get("x-output-bytes");
    if (width && height) {
      const suffix = [];
      if (fmt) suffix.push(fmt.toUpperCase());
      if (ms) suffix.push(`${ms}ms`);
      if (bytes) {
        const sizeLabel = formatBytes(Number(bytes));
        if (sizeLabel) {
          suffix.push(sizeLabel);
        }
      }
      elements.processedMeta.textContent =
        `${width}×${height}` + (suffix.length ? ` · ${suffix.join(" · ")}` : "");
    } else {
      elements.processedMeta.textContent = "";
    }

    if (state.processedUrl) {
      revokeObjectUrl(state.processedUrl);
      state.processedUrl = null;
    }
    const blob = await response.blob();
    state.processedUrl = URL.createObjectURL(blob);
    elements.processedPreview.src = state.processedUrl;
    elements.processedEmpty.hidden = true;
    elements.compareSlider.value = "50";
    elements.compareLine.style.left = "50%";
    elements.downloadBtn.disabled = false;
    const size = bytes ? Number(bytes) : blob.size;
    const detailParts = [];
    if (width && height) {
      detailParts.push(`${width}×${height}`);
    }
    if (fmt) {
      detailParts.push(fmt.toUpperCase());
    }
    if (ms) {
      detailParts.push(`${ms}ms`);
    }
    const sizeLabel = formatBytes(size);
    if (sizeLabel) {
      detailParts.push(sizeLabel);
    }
    const entry = {
      url: URL.createObjectURL(blob),
      filename: `headshot.${elements.format.value}`,
      name: `Export ${new Date().toLocaleTimeString()}`,
      detail: detailParts.join(" · "),
    };
    state.history.unshift(entry);
    if (state.history.length > 3) {
      const removed = state.history.pop();
      revokeObjectUrl(removed?.url);
    }
    renderHistory();
    elements.downloadBtn.onclick = () => {
      const link = document.createElement("a");
      link.href = state.processedUrl;
      link.download = `headshot.${elements.format.value}`;
      link.click();
    };
  } catch (error) {
    if (error.name !== "AbortError") {
      showToast(error.message || "Processing failed.");
    }
  } finally {
    state.controller = null;
    setStatusLoading(false);
  }
}

function bindEvents() {
  elements.fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
    }
  });

  elements.useCaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.useCase;
      if (key) {
        applyUseCase(key);
      }
    });
  });

  elements.dropzone.addEventListener("click", () => {
    elements.fileInput.click();
  });

  elements.dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.fileInput.click();
    }
  });

  elements.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("active");
  });

  elements.dropzone.addEventListener("dragleave", () => {
    elements.dropzone.classList.remove("active");
  });

  elements.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("active");
    const file = event.dataTransfer.files[0];
    if (file) {
      setFile(file);
    }
  });

  Object.values(elements.sliders).forEach((slider) => {
    slider.addEventListener("input", () => {
      updateSliderValues();
      syncStyleIfSlidersChanged();
      maybeClearUseCase();
      queueProcess();
      scheduleSaveSettings();
    });
  });

  Object.values(elements.cropSliders).forEach((slider) => {
    slider.addEventListener("input", () => {
      updateSliderValues();
      maybeClearUseCase();
      queueProcess();
      scheduleSaveSettings();
    });
  });

  Object.values(elements.exportSliders).forEach((slider) => {
    slider.addEventListener("input", () => {
      updateSliderValues();
      maybeClearUseCase();
      if (elements.format.value === "jpeg") {
        queueProcess();
      }
      scheduleSaveSettings();
    });
  });

  elements.removeBg.addEventListener("change", () => {
    enforceCompatibleOptions();
    updateBackgroundSwatch();
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.background.addEventListener("change", () => {
    enforceCompatibleOptions();
    updateBackgroundSwatch();
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.backgroundHex.addEventListener("input", () => {
    updateBackgroundSwatch();
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.preset.addEventListener("change", () => {
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.format.addEventListener("change", () => {
    enforceCompatibleOptions();
    maybeClearUseCase();
    queueProcess();
    elements.exportSliders.jpegQuality.disabled = elements.format.value !== "jpeg";
    scheduleSaveSettings();
  });
  elements.autoUpdate.addEventListener("change", () => {
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.processBtn.addEventListener("click", () => processImage());
  elements.exportPresetBtn.addEventListener("click", () => {
    exportPreset();
  });
  elements.importPresetBtn.addEventListener("click", () => {
    elements.importPresetInput.click();
  });
  elements.importPresetInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await importPreset(file);
      showToast("Preset imported.");
    } catch (error) {
      showToast(error.message || "Could not import preset.");
    }
  });
  elements.cancelBtn.addEventListener("click", () => {
    if (state.controller) {
      state.controller.abort();
      state.controller = null;
      setStatusLoading(false);
      showToast("Canceled.");
    }
  });
  elements.resetSliders.addEventListener("click", () => {
    setSliders(neutralSliders());
    setStyleSelection("manual");
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.resetStudio.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    state.saved = null;
    clearHistory();
    if (state.processedUrl) {
      revokeObjectUrl(state.processedUrl);
      state.processedUrl = null;
      elements.processedPreview.removeAttribute("src");
    }
    elements.removeBg.checked = false;
    elements.background.value = "white";
    elements.backgroundHex.value = "#ffffff";
    elements.preset.value = "portrait-4x5";
    elements.cropSliders.topBias.value = "0.2";
    elements.format.value = "png";
    elements.exportSliders.jpegQuality.value = "92";
    elements.autoUpdate.checked = true;
    setUseCaseSelection(null);
    enforceCompatibleOptions();
    updateSliderValues();
    applyStyle("classic");
    updateBackgroundSwatch();
    setZoomMode("fit");
    setGuideMode("off");
    showToast("Studio reset.");
  });
  elements.resetCropExport.addEventListener("click", () => {
    elements.preset.value = "portrait-4x5";
    elements.cropSliders.topBias.value = "0.2";
    elements.format.value = "png";
    elements.exportSliders.jpegQuality.value = "92";
    elements.exportSliders.jpegQuality.disabled = true;
    maybeClearUseCase();
    updateSliderValues();
    queueProcess();
    scheduleSaveSettings();
    showToast("Crop/export reset.");
  });
  elements.resetBackground.addEventListener("click", () => {
    elements.removeBg.checked = false;
    elements.background.value = "white";
    elements.backgroundHex.value = "#ffffff";
    enforceCompatibleOptions();
    updateBackgroundSwatch();
    maybeClearUseCase();
    queueProcess();
    scheduleSaveSettings();
    showToast("Background reset.");
  });
  elements.toastDismiss.addEventListener("click", () => hideToast());
  elements.toggleZoom.addEventListener("click", () => {
    const current = readZoomMode();
    setZoomMode(current === "fit" ? "actual" : "fit");
  });
  elements.toggleGuide.addEventListener("click", () => {
    const current = readGuideMode();
    setGuideMode(current === "on" ? "off" : "on");
  });
  elements.shortcutsBtn.addEventListener("click", () => {
    elements.modalOverlay.hidden = false;
  });
  elements.closeModal.addEventListener("click", () => {
    elements.modalOverlay.hidden = true;
  });
  elements.modalOverlay.addEventListener("click", (event) => {
    if (event.target === elements.modalOverlay) {
      elements.modalOverlay.hidden = true;
    }
  });
  elements.compareSlider.addEventListener("input", () => {
    const value = Number(elements.compareSlider.value);
    elements.compareOriginal.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    elements.compareLine.style.left = `${value}%`;
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      processImage();
    }
    if (event.key === "Escape") {
      if (state.controller) {
        state.controller.abort();
        state.controller = null;
        setStatusLoading(false);
        showToast("Canceled.");
      } else {
        hideToast();
        elements.modalOverlay.hidden = true;
      }
    }
    const target = event.target;
    const isTextInput =
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (!isTextInput && event.key.toLowerCase() === "g") {
      const current = readGuideMode();
      setGuideMode(current === "on" ? "off" : "on");
    }
  });

  document.addEventListener("paste", (event) => {
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          setFile(file);
          showToast("Image pasted.");
          event.preventDefault();
          break;
        }
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    if (state.processedUrl) {
      revokeObjectUrl(state.processedUrl);
      state.processedUrl = null;
    }
    clearHistory();
  });
}

updateSliderValues();
state.saved = readSettings();
applySavedSettings();
updateBackgroundCustomVisibility();
updateBackgroundSwatch();
elements.exportSliders.jpegQuality.disabled = elements.format.value !== "jpeg";
setZoomMode(readZoomMode());
setGuideMode(readGuideMode());
loadPresets();
bindEvents();
