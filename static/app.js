const state = {
  file: null,
  preset: "portrait-4x5",
  style: "classic",
  styles: {},
  controller: null,
  batchController: null,
  debounce: null,
  processedUrl: null,
  batchZipUrl: null,
  toastTimer: null,
  saveTimer: null,
  estimateTimer: null,
  estimateRequestId: 0,
  saved: null,
  history: [],
  useCase: null,
  isApplyingUseCase: false,
  presets: {},
  batchFiles: [],
  profiles: [],
};

const elements = {
  fileInput: document.getElementById("fileInput"),
  dropzone: document.getElementById("dropzone"),
  batchInput: document.getElementById("batchInput"),
  batchFolder: document.getElementById("batchFolder"),
  batchCount: document.getElementById("batchCount"),
  batchLimits: document.getElementById("batchLimits"),
  batchStatus: document.getElementById("batchStatus"),
  batchList: document.getElementById("batchList"),
  batchProcessBtn: document.getElementById("batchProcessBtn"),
  batchDownloadBtn: document.getElementById("batchDownloadBtn"),
  batchCancelBtn: document.getElementById("batchCancelBtn"),
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
  exportBundleBtn: document.getElementById("exportBundleBtn"),
  importBundleBtn: document.getElementById("importBundleBtn"),
  importBundleInput: document.getElementById("importBundleInput"),
  bundleOverwrite: document.getElementById("bundleOverwrite"),
  profileName: document.getElementById("profileName"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  profilesList: document.getElementById("profilesList"),
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
  estimateMeta: document.getElementById("estimateMeta"),
  healthBadge: document.getElementById("healthBadge"),
  healthSummary: document.getElementById("healthSummary"),
  diagApi: document.getElementById("diagApi"),
  diagRembg: document.getElementById("diagRembg"),
  diagFace: document.getElementById("diagFace"),
  diagUploadLimit: document.getElementById("diagUploadLimit"),
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
const DEFAULT_MAX_BATCH_IMAGES = 24;
const DEFAULT_MAX_BATCH_TOTAL_BYTES = 72 * 1024 * 1024;

state.limits = {
  maxUploadBytes: MAX_UPLOAD_BYTES,
  maxBatchImages: DEFAULT_MAX_BATCH_IMAGES,
  maxBatchTotalBytes: DEFAULT_MAX_BATCH_TOTAL_BYTES,
};

const STORAGE_KEY = "ai-headshot-studio:settings:v1";
const ZOOM_KEY = "ai-headshot-studio:preview-zoom:v1";
const GUIDE_KEY = "ai-headshot-studio:framing-guide:v1";
const PROFILES_KEY = "ai-headshot-studio:profiles:v1";

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

async function safeReadJSON(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractApiErrorMessage(payload) {
  if (!payload || typeof payload !== "object") return "";
  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message) return detail.message;
    if (typeof detail.detail === "string" && detail.detail) return detail.detail;
  }
  if (typeof payload.message === "string") return payload.message;
  return "";
}

async function responseErrorMessage(response, fallback) {
  const payload = await safeReadJSON(response);
  const message = extractApiErrorMessage(payload);
  return message || fallback;
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

function readProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = safeParseJSON(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object" && typeof item.name === "string");
  } catch {
    return [];
  }
}

function writeProfiles(profiles) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {}
}

function normalizeProfileName(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  const cleaned = raw.replace(/\s+/g, " ").slice(0, 48);
  return cleaned;
}

function suggestProfileName() {
  if (state.useCase && USE_CASES[state.useCase]) {
    return state.useCase[0].toUpperCase() + state.useCase.slice(1);
  }
  const preset = state.presets[elements.preset.value];
  const presetName = typeof preset?.name === "string" ? preset.name : "";
  const fmt = elements.format.value === "jpeg" ? "JPEG" : "PNG";
  if (presetName) return `${presetName} · ${fmt}`;
  return `Profile ${state.profiles.length + 1}`;
}

function uniqueProfileName(name) {
  const base = normalizeProfileName(name) || "Profile";
  const existing = new Set(state.profiles.map((profile) => profile.name));
  if (!existing.has(base)) return base;
  for (let i = 2; i <= 50; i += 1) {
    const candidate = `${base} (${i})`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base} (${Date.now()})`;
}

function renderProfiles() {
  elements.profilesList.innerHTML = "";
  if (!state.profiles.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No saved profiles yet.";
    elements.profilesList.appendChild(empty);
    return;
  }

  state.profiles.forEach((profile) => {
    const row = document.createElement("div");
    row.className = "profile-item";

    const meta = document.createElement("div");
    meta.className = "profile-meta";
    const title = document.createElement("div");
    title.className = "profile-title";
    title.textContent = profile.name;
    const sub = document.createElement("div");
    sub.className = "profile-sub";
    sub.textContent = "Applies saved studio settings.";
    meta.appendChild(title);
    meta.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "profile-actions";

    const applyBtn = document.createElement("button");
    applyBtn.className = "btn btn--ghost btn--small";
    applyBtn.type = "button";
    applyBtn.textContent = "Apply";
    applyBtn.addEventListener("click", () => {
      try {
        applyImportedPresetSettings(profile.settings);
        showToast(`Applied profile: ${profile.name}`);
      } catch (error) {
        showToast(error.message || "Could not apply profile.");
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn--ghost btn--small";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      state.profiles = state.profiles.filter((item) => item.id !== profile.id);
      writeProfiles(state.profiles);
      renderProfiles();
      showToast("Profile deleted.");
    });

    actions.appendChild(applyBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(meta);
    row.appendChild(actions);
    elements.profilesList.appendChild(row);
  });
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

function setEstimateMeta(text) {
  elements.estimateMeta.textContent = `Estimated output: ${text}`;
}

function setHealthBadge(stateKey, text) {
  elements.healthBadge.classList.remove("status-pill--pending", "status-pill--ok", "status-pill--error");
  elements.healthBadge.classList.add(`status-pill--${stateKey}`);
  elements.healthBadge.textContent = text;
}

function updateSliderValues() {
  Object.keys(elements.sliders).forEach((key) => {
    elements.sliderValues[key].textContent = Number(elements.sliders[key].value).toFixed(2);
  });
  Object.keys(elements.cropSliders).forEach((key) => {
    const raw = Number(elements.cropSliders[key].value);
    if (key === "topBias") {
      // UI calls this “Headroom”: higher means more headroom. Server uses `top_bias`
      // where lower means more headroom, so we display the inverted value.
      elements.cropSliderValues[key].textContent = (1 - raw).toFixed(2);
      return;
    }
    elements.cropSliderValues[key].textContent = raw.toFixed(2);
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

function getPresetForEstimate() {
  return state.presets[elements.preset.value] ?? null;
}

function computeCropRegion(width, height, ratio, topBias) {
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = width;
  let sourceHeight = height;

  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { sourceX, sourceY, sourceWidth, sourceHeight };
  }

  const currentRatio = width / height;
  if (Math.abs(currentRatio - ratio) < 0.001) {
    return { sourceX, sourceY, sourceWidth, sourceHeight };
  }

  if (currentRatio > ratio) {
    sourceWidth = Math.max(1, Math.floor(height * ratio));
    sourceX = Math.floor((width - sourceWidth) / 2);
  } else {
    sourceHeight = Math.max(1, Math.floor(width / ratio));
    const maxShift = height - sourceHeight;
    const shift = Math.floor(maxShift * clampNumber(topBias, 0, 1, 0.2));
    sourceY = Math.max(0, Math.min(maxShift, shift));
  }

  return { sourceX, sourceY, sourceWidth, sourceHeight };
}

function estimateOutputGeometry() {
  const preview = elements.originalPreview;
  if (!preview || !preview.naturalWidth || !preview.naturalHeight) {
    return null;
  }

  const preset = getPresetForEstimate();
  if (!preset) {
    return null;
  }

  const crop = computeCropRegion(
    preview.naturalWidth,
    preview.naturalHeight,
    Number(preset.ratio),
    Number(elements.cropSliders.topBias.value),
  );
  const explicitWidth = Number(preset.width);
  const explicitHeight = Number(preset.height);
  const outputWidth =
    Number.isFinite(explicitWidth) && explicitWidth > 0
      ? Math.round(explicitWidth)
      : Math.max(1, Math.round(crop.sourceWidth));
  const outputHeight =
    Number.isFinite(explicitHeight) && explicitHeight > 0
      ? Math.round(explicitHeight)
      : Math.max(1, Math.round(crop.sourceHeight));

  return { ...crop, outputWidth, outputHeight };
}

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("estimate-failed"));
      },
      format,
      quality,
    );
  });
}

async function runEstimate(requestId) {
  if (!state.file) {
    setEstimateMeta("--");
    return;
  }

  const geometry = estimateOutputGeometry();
  if (!geometry) {
    setEstimateMeta("Loading...");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = geometry.outputWidth;
  canvas.height = geometry.outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    setEstimateMeta("Unavailable");
    return;
  }
  ctx.drawImage(
    elements.originalPreview,
    geometry.sourceX,
    geometry.sourceY,
    geometry.sourceWidth,
    geometry.sourceHeight,
    0,
    0,
    geometry.outputWidth,
    geometry.outputHeight,
  );

  const format = elements.format.value === "jpeg" ? "image/jpeg" : "image/png";
  const quality = clampNumber(Number(elements.exportSliders.jpegQuality.value), 60, 100, 92) / 100;

  try {
    const blob = await canvasToBlob(canvas, format, quality);
    if (requestId !== state.estimateRequestId) return;
    const sizeLabel = formatBytes(blob.size);
    const sizeFragment = sizeLabel ? ` ~${sizeLabel}` : "";
    setEstimateMeta(`${geometry.outputWidth}×${geometry.outputHeight}${sizeFragment}`);
  } catch {
    if (requestId !== state.estimateRequestId) return;
    setEstimateMeta(`${geometry.outputWidth}×${geometry.outputHeight}`);
  }
}

function queueEstimate() {
  if (!state.file) {
    setEstimateMeta("--");
    return;
  }
  if (state.estimateTimer) {
    clearTimeout(state.estimateTimer);
  }
  state.estimateTimer = setTimeout(() => {
    state.estimateTimer = null;
    state.estimateRequestId += 1;
    const requestId = state.estimateRequestId;
    runEstimate(requestId);
  }, 200);
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

function sanitizeImportedSettings(settings) {
  if (!settings || typeof settings !== "object") {
    throw new Error("Bundle profile settings are missing.");
  }

  const sanitized = {};
  if (typeof settings.removeBg === "boolean") {
    sanitized.removeBg = settings.removeBg;
  }

  const backgrounds = new Set(["white", "light", "blue", "gray", "custom", "transparent"]);
  if (typeof settings.background === "string" && backgrounds.has(settings.background)) {
    sanitized.background = settings.background;
  }
  if (typeof settings.backgroundHex === "string") {
    sanitized.backgroundHex = settings.backgroundHex;
  }
  if (typeof settings.preset === "string") {
    sanitized.preset = settings.preset;
  }

  sanitized.topBias = clampNumber(settings.topBias, 0, 1, 0.2);

  if (settings.format === "png" || settings.format === "jpeg") {
    sanitized.format = settings.format;
  }
  sanitized.jpegQuality = Math.round(clampNumber(settings.jpegQuality, 60, 100, 92));

  if (typeof settings.autoUpdate === "boolean") {
    sanitized.autoUpdate = settings.autoUpdate;
  }
  if (typeof settings.style === "string") {
    sanitized.style = settings.style;
  }
  if (typeof settings.useCase === "string") {
    sanitized.useCase = settings.useCase;
  }
  if (settings.sliders && typeof settings.sliders === "object") {
    sanitized.sliders = normalizeSliderValues(settings.sliders);
  }

  return sanitized;
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

async function exportBundle() {
  if (!state.profiles.length) {
    showToast("No saved profiles to export yet.");
    return;
  }
  const payload = {
    app: "ai-headshot-studio",
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles: state.profiles.map((profile) => ({
      name: profile.name,
      settings: profile.settings,
    })),
  };
  const serialized = JSON.stringify(payload, null, 2);

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("clipboard-unavailable");
    }
    await navigator.clipboard.writeText(serialized);
    showToast("Bundle copied to clipboard.");
  } catch {
    const filename = `headshot-bundle-${Date.now()}.json`;
    downloadTextFile(filename, serialized);
    showToast("Clipboard unavailable. Bundle downloaded as JSON.");
  }
}

function importBundleData(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid bundle JSON.");
  }
  if (typeof parsed.app === "string" && parsed.app && parsed.app !== "ai-headshot-studio") {
    throw new Error("Bundle is not for AI Headshot Studio.");
  }
  if (
    Object.prototype.hasOwnProperty.call(parsed, "version") &&
    typeof parsed.version !== "number"
  ) {
    throw new Error("Bundle version is invalid.");
  }
  const profiles = parsed.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error("Bundle has no profiles.");
  }
  if (profiles.length > 50) {
    throw new Error("Bundle has too many profiles.");
  }

  const overwrite = Boolean(elements.bundleOverwrite?.checked);
  let added = 0;
  let overwritten = 0;
  let renamed = 0;

  profiles.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Bundle profile is invalid.");
    }
    const rawName = normalizeProfileName(entry.name);
    if (!rawName) {
      throw new Error("Bundle profile name is missing.");
    }
    const settings = sanitizeImportedSettings(entry.settings);

    const existingIndex = state.profiles.findIndex((profile) => profile.name === rawName);
    if (existingIndex >= 0 && overwrite) {
      const existing = state.profiles[existingIndex];
      const updated = { ...existing, settings };
      state.profiles.splice(existingIndex, 1);
      state.profiles.unshift(updated);
      overwritten += 1;
      return;
    }

    const name = existingIndex >= 0 ? uniqueProfileName(rawName) : rawName;
    if (name !== rawName) {
      renamed += 1;
    }
    state.profiles.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      settings,
      createdAt: new Date().toISOString(),
    });
    added += 1;
  });

  state.profiles = state.profiles.slice(0, 30);
  writeProfiles(state.profiles);
  renderProfiles();

  const parts = [];
  if (added) parts.push(`${added} added`);
  if (overwritten) parts.push(`${overwritten} overwritten`);
  if (renamed) parts.push(`${renamed} renamed`);
  const summary = parts.length ? parts.join(", ") : "No changes";
  return `Bundle imported: ${summary}.`;
}

async function importBundle(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) {
    throw new Error("Bundle file is too large.");
  }

  const text = await file.text();
  const parsed = safeParseJSON(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid bundle JSON.");
  }
  return importBundleData(parsed);
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

  if (Array.isArray(parsed.profiles)) {
    return importBundleData(parsed);
  }

  const settings =
    parsed.settings && typeof parsed.settings === "object" ? parsed.settings : parsed;
  applyImportedPresetSettings(settings);
  return "Imported.";
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
  state.presets = {};
  data.presets.forEach((preset) => {
    state.presets[preset.key] = preset;
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
  queueEstimate();
}

function setFile(file) {
  if (!file || typeof file.size !== "number") {
    showToast("Could not read that file.");
    return;
  }
  const uploadLimit = state.limits?.maxUploadBytes || MAX_UPLOAD_BYTES;
  if (file.size > uploadLimit) {
    const label = formatBytes(uploadLimit) || "12MB";
    showToast(`File too large. Max ${label}.`);
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
      queueEstimate();
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

function updateBatchLimitsHint() {
  if (!elements.batchLimits) return;
  const maxImages = state.limits?.maxBatchImages || DEFAULT_MAX_BATCH_IMAGES;
  const maxTotal = state.limits?.maxBatchTotalBytes || DEFAULT_MAX_BATCH_TOTAL_BYTES;
  const totalLabel = formatBytes(maxTotal) || `${Math.round(maxTotal / (1024 * 1024))}MB`;
  elements.batchLimits.textContent = `Max ${maxImages} images, ${totalLabel} total.`;
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
  queueEstimate();
  if (!state.file) return;
  if (!elements.autoUpdate.checked && !force) return;
  if (state.debounce) {
    clearTimeout(state.debounce);
  }
  state.debounce = setTimeout(() => {
    processImage();
  }, 300);
}

async function loadHealthDiagnostics() {
  setHealthBadge("pending", "Checking");
  elements.healthSummary.textContent = "Loading local API status...";
  elements.diagApi.textContent = "Unknown";
  elements.diagRembg.textContent = "Unknown";
  elements.diagFace.textContent = "Unknown";
  elements.diagUploadLimit.textContent = "--";

  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error("health-failed");
    }
    const data = await response.json();
    const apiOk = data?.status === "ok";
    const rembg = data?.features?.background_removal;
    const rembgAvailable = Boolean(rembg?.available);
    const face = data?.features?.face_framing;
    const faceAvailable = Boolean(face?.available);
    const version = typeof data?.version === "string" ? data.version : "unknown";
    const uploadMb = Number(data?.limits?.max_upload_mb);
    const uploadBytes = Number(data?.limits?.max_upload_bytes);
    const batchImages = Number(data?.limits?.max_batch_images);
    const batchTotalBytes = Number(data?.limits?.max_batch_total_bytes);

    if (Number.isFinite(uploadBytes) && uploadBytes > 0) {
      state.limits.maxUploadBytes = uploadBytes;
    }
    if (Number.isFinite(batchImages) && batchImages > 0) {
      state.limits.maxBatchImages = batchImages;
    }
    if (Number.isFinite(batchTotalBytes) && batchTotalBytes > 0) {
      state.limits.maxBatchTotalBytes = batchTotalBytes;
    }
    updateBatchLimitsHint();

    setHealthBadge(apiOk ? "ok" : "error", apiOk ? "Healthy" : "Degraded");
    elements.diagApi.textContent = apiOk ? "OK" : "Unavailable";
    elements.diagRembg.textContent = rembgAvailable ? "Ready" : "Unavailable";
    elements.diagFace.textContent = faceAvailable ? "Ready" : "Unavailable";
    elements.diagUploadLimit.textContent =
      Number.isFinite(uploadMb) && uploadMb > 0 ? `${uploadMb}MB` : "--";
    elements.healthSummary.textContent = `v${version} running locally.`;
  } catch {
    setHealthBadge("error", "Offline");
    elements.diagApi.textContent = "Unreachable";
    elements.diagRembg.textContent = "Unknown";
    elements.diagFace.textContent = "Unknown";
    elements.diagUploadLimit.textContent = "--";
    elements.healthSummary.textContent =
      "Could not reach /api/health. Start the server and refresh this page.";
    updateBatchLimitsHint();
  }
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

function setBatchLoading(isLoading) {
  elements.batchCancelBtn.hidden = !isLoading;
  elements.batchProcessBtn.disabled = isLoading || state.batchFiles.length === 0;
  elements.batchDownloadBtn.disabled = isLoading || !state.batchZipUrl;
  elements.batchInput.disabled = isLoading;
  elements.batchFolder.disabled = isLoading;
}

function revokeBatchZipUrl() {
  if (state.batchZipUrl) {
    revokeObjectUrl(state.batchZipUrl);
    state.batchZipUrl = null;
  }
}

function updateBatchSummary() {
  const count = state.batchFiles.length;
  const total = state.batchFiles.reduce((acc, file) => acc + (file?.size || 0), 0);
  const totalLabel = formatBytes(total);
  elements.batchCount.textContent = `${count} selected` + (totalLabel ? ` · ${totalLabel}` : "");
  elements.batchProcessBtn.disabled = count === 0;
  elements.batchDownloadBtn.disabled = !state.batchZipUrl;
}

function renderBatchList() {
  elements.batchList.innerHTML = "";
  if (!state.batchFiles.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Select images to process as a ZIP.";
    elements.batchList.appendChild(empty);
    return;
  }
  const maxRows = 8;
  state.batchFiles.slice(0, maxRows).forEach((file) => {
    const row = document.createElement("div");
    row.className = "batch-item";
    const meta = document.createElement("div");
    meta.className = "batch-meta";
    const title = document.createElement("div");
    title.className = "batch-title";
    title.textContent = file.name || "image";
    const sub = document.createElement("div");
    sub.className = "batch-sub";
    sub.textContent = file.size ? formatBytes(file.size) : "";
    meta.appendChild(title);
    meta.appendChild(sub);
    row.appendChild(meta);
    elements.batchList.appendChild(row);
  });
  if (state.batchFiles.length > maxRows) {
    const more = document.createElement("div");
    more.className = "history-empty";
    more.textContent = `+${state.batchFiles.length - maxRows} more`;
    elements.batchList.appendChild(more);
  }
}

function setBatchFiles(fileList) {
  revokeBatchZipUrl();
  const next = [];
  let rejected = 0;
  let rejectedTotal = 0;
  let rejectedType = 0;
  let rejectedSize = 0;
  const uploadLimit = state.limits?.maxUploadBytes || MAX_UPLOAD_BYTES;
  const batchLimit = state.limits?.maxBatchImages || DEFAULT_MAX_BATCH_IMAGES;
  const batchTotalLimit = state.limits?.maxBatchTotalBytes || DEFAULT_MAX_BATCH_TOTAL_BYTES;
  let total = 0;
  [...fileList].forEach((file) => {
    if (!file || typeof file.size !== "number") {
      rejected += 1;
      return;
    }
    if (file.size > uploadLimit) {
      rejected += 1;
      rejectedSize += 1;
      return;
    }
    if (!file.type || !file.type.startsWith("image/")) {
      rejected += 1;
      rejectedType += 1;
      return;
    }
    if (total + file.size > batchTotalLimit) {
      rejected += 1;
      rejectedTotal += 1;
      return;
    }
    total += file.size;
    next.push(file);
  });
  state.batchFiles = next.slice(0, batchLimit);
  if (rejected > 0) {
    const parts = [];
    if (rejectedSize) parts.push(`${rejectedSize} too large`);
    if (rejectedType) parts.push(`${rejectedType} not an image`);
    if (rejectedTotal) parts.push(`${rejectedTotal} exceeds batch total`);
    const suffix = parts.length ? ` (${parts.join(", ")})` : "";
    showToast(`Skipped ${rejected} file(s)${suffix}.`);
  }
  if (next.length > batchLimit) {
    showToast(`Batch limited to ${batchLimit} images.`);
  }
  updateBatchSummary();
  renderBatchList();
}

function formDataForBatch() {
  const data = new FormData();
  state.batchFiles.forEach((file) => {
    data.append("images", file);
  });
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
  const folder = elements.batchFolder.value?.trim();
  if (folder) {
    data.append("folder", folder);
  }
  return data;
}

function parseZipFilename(contentDisposition) {
  if (typeof contentDisposition !== "string") return "";
  const match = contentDisposition.match(/filename=\"([^\"]+)\"/i);
  return match ? match[1] : "";
}

function downloadBatchZip() {
  if (!state.batchZipUrl) return;
  const link = document.createElement("a");
  link.href = state.batchZipUrl;
  link.download = elements.batchDownloadBtn.dataset.filename || "headshots-batch.zip";
  link.click();
}

async function processBatch() {
  if (!state.batchFiles.length) {
    showToast("Select images for batch processing first.");
    elements.batchInput.focus();
    return;
  }

  if (state.batchController) {
    state.batchController.abort();
  }
  state.batchController = new AbortController();
  setBatchLoading(true);
  elements.batchStatus.textContent = `Processing ${state.batchFiles.length} image(s)...`;

  try {
    const response = await fetch("/api/batch", {
      method: "POST",
      body: formDataForBatch(),
      signal: state.batchController.signal,
    });

    if (!response.ok) {
      const message = await responseErrorMessage(response, "Batch processing failed.");
      throw new Error(message);
    }

    const blob = await response.blob();
    const filename = parseZipFilename(response.headers.get("content-disposition"));
    const succeeded = Number(response.headers.get("x-batch-succeeded"));
    const failed = Number(response.headers.get("x-batch-failed"));
    revokeBatchZipUrl();
    state.batchZipUrl = URL.createObjectURL(blob);
    elements.batchDownloadBtn.disabled = false;
    if (Number.isFinite(succeeded) && Number.isFinite(failed) && failed > 0) {
      elements.batchStatus.textContent = `Batch ready (${succeeded} ok, ${failed} failed). Download the ZIP.`;
      showToast("Batch processed with errors. Download ZIP for report.");
    } else {
      elements.batchStatus.textContent = "Batch ready. Download the ZIP.";
      showToast("Batch processed.");
    }
    if (filename) {
      elements.batchDownloadBtn.dataset.filename = filename;
    } else {
      delete elements.batchDownloadBtn.dataset.filename;
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      elements.batchStatus.textContent = "Batch canceled.";
      showToast("Batch canceled.");
    } else {
      elements.batchStatus.textContent = "Batch failed.";
      showToast(error.message || "Batch failed.");
    }
  } finally {
    state.batchController = null;
    setBatchLoading(false);
    updateBatchSummary();
  }
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
      const message = await responseErrorMessage(response, "Processing failed.");
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

  elements.batchInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (!files) return;
    setBatchFiles(files);
  });
  elements.batchProcessBtn.addEventListener("click", () => {
    processBatch();
  });
  elements.batchDownloadBtn.addEventListener("click", () => {
    downloadBatchZip();
  });
  elements.batchCancelBtn.addEventListener("click", () => {
    if (state.batchController) {
      state.batchController.abort();
      state.batchController = null;
      setBatchLoading(false);
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
      const message = await importPreset(file);
      showToast(message || "Imported.");
    } catch (error) {
      showToast(error.message || "Could not import preset.");
    }
  });

  elements.exportBundleBtn.addEventListener("click", () => {
    exportBundle();
  });
  elements.importBundleBtn.addEventListener("click", () => {
    elements.importBundleInput.click();
  });
  elements.importBundleInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const message = await importBundle(file);
      showToast(message || "Bundle imported.");
    } catch (error) {
      showToast(error.message || "Could not import bundle.");
    }
  });

  function saveProfile() {
    const name = uniqueProfileName(elements.profileName.value || suggestProfileName());
    const settings = collectCurrentSettings();
    state.profiles.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      settings,
      createdAt: new Date().toISOString(),
    });
    state.profiles = state.profiles.slice(0, 30);
    writeProfiles(state.profiles);
    renderProfiles();
    elements.profileName.value = "";
    showToast(`Saved profile: ${name}`);
  }

  elements.saveProfileBtn.addEventListener("click", () => {
    saveProfile();
  });
  elements.profileName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveProfile();
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
    state.file = null;
    elements.fileInput.value = "";
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
    elements.originalPreview.removeAttribute("src");
    elements.compareOriginal.removeAttribute("src");
    elements.originalMeta.textContent = "";
    elements.processedMeta.textContent = "";
    elements.originalEmpty.hidden = false;
    elements.processedEmpty.hidden = false;
    setEstimateMeta("--");
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
      } else if (state.batchController) {
        state.batchController.abort();
        state.batchController = null;
        setBatchLoading(false);
        showToast("Batch canceled.");
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
    revokeBatchZipUrl();
    clearHistory();
  });
}

updateSliderValues();
state.saved = readSettings();
state.profiles = readProfiles();
renderProfiles();
applySavedSettings();
updateBackgroundCustomVisibility();
updateBackgroundSwatch();
setEstimateMeta("--");
updateBatchLimitsHint();
updateBatchSummary();
renderBatchList();
setBatchLoading(false);
elements.exportSliders.jpegQuality.disabled = elements.format.value !== "jpeg";
setZoomMode(readZoomMode());
setGuideMode(readGuideMode());
loadHealthDiagnostics();
loadPresets();
bindEvents();
