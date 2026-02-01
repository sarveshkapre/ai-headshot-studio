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
};

const elements = {
  fileInput: document.getElementById("fileInput"),
  dropzone: document.getElementById("dropzone"),
  removeBg: document.getElementById("removeBg"),
  background: document.getElementById("background"),
  resetBackground: document.getElementById("resetBackground"),
  preset: document.getElementById("preset"),
  format: document.getElementById("format"),
  resetCropExport: document.getElementById("resetCropExport"),
  autoUpdate: document.getElementById("autoUpdate"),
  processBtn: document.getElementById("processBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  resetSliders: document.getElementById("resetSliders"),
  resetStudio: document.getElementById("resetStudio"),
  originalPreview: document.getElementById("originalPreview"),
  processedPreview: document.getElementById("processedPreview"),
  loading: document.getElementById("loading"),
  styleGrid: document.getElementById("styleGrid"),
  originalMeta: document.getElementById("originalMeta"),
  processedMeta: document.getElementById("processedMeta"),
  toggleZoom: document.getElementById("toggleZoom"),
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
  writeZoomMode(mode);
}

function writeSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function scheduleSaveSettings() {
  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
  }
  state.saveTimer = setTimeout(() => {
    state.saveTimer = null;
    const settings = {
      removeBg: elements.removeBg.checked,
      background: elements.background.value,
      preset: elements.preset.value,
      topBias: Number(elements.cropSliders.topBias.value),
      format: elements.format.value,
      jpegQuality: Number(elements.exportSliders.jpegQuality.value),
      autoUpdate: elements.autoUpdate.checked,
      style: state.style,
      sliders: getCurrentSliderValues(),
    };
    writeSettings(settings);
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

function createStyleCard(style) {
  const card = document.createElement("div");
  card.className = "style-card";
  card.dataset.key = style.key;
  card.textContent = style.name;
  card.addEventListener("click", () => applyStyle(style.key));
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
  updateSliderValues();
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
  if (state.processedUrl) {
    elements.compareSlider.value = "50";
    elements.compareLine.style.left = "50%";
    elements.compareOriginal.style.clipPath = "inset(0 50% 0 0)";
  }
  if (state.processedUrl) {
    URL.revokeObjectURL(state.processedUrl);
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
}

function updateBackgroundSwatch() {
  const value = elements.background.value;
  const colors = {
    white: "#ffffff",
    light: "#f5f6f8",
    blue: "#e5ecf5",
    gray: "#e6e6e6",
  };
  if (value === "transparent") {
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
      URL.revokeObjectURL(state.processedUrl);
      state.processedUrl = null;
    }
    const blob = await response.blob();
    state.processedUrl = URL.createObjectURL(blob);
    elements.processedPreview.src = state.processedUrl;
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
      url: state.processedUrl,
      filename: `headshot.${elements.format.value}`,
      name: `Export ${new Date().toLocaleTimeString()}`,
      detail: detailParts.join(" · "),
    };
    state.history.unshift(entry);
    if (state.history.length > 3) {
      const removed = state.history.pop();
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
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
      queueProcess();
      scheduleSaveSettings();
    });
  });

  Object.values(elements.cropSliders).forEach((slider) => {
    slider.addEventListener("input", () => {
      updateSliderValues();
      queueProcess();
      scheduleSaveSettings();
    });
  });

  Object.values(elements.exportSliders).forEach((slider) => {
    slider.addEventListener("input", () => {
      updateSliderValues();
      if (elements.format.value === "jpeg") {
        queueProcess();
      }
      scheduleSaveSettings();
    });
  });

  elements.removeBg.addEventListener("change", () => {
    enforceCompatibleOptions();
    updateBackgroundSwatch();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.background.addEventListener("change", () => {
    enforceCompatibleOptions();
    updateBackgroundSwatch();
    queueProcess();
    scheduleSaveSettings();
  });
  elements.preset.addEventListener("change", () => {
    queueProcess();
    scheduleSaveSettings();
  });
  elements.format.addEventListener("change", () => {
    enforceCompatibleOptions();
    queueProcess();
    elements.exportSliders.jpegQuality.disabled = elements.format.value !== "jpeg";
    scheduleSaveSettings();
  });
  elements.autoUpdate.addEventListener("change", () => {
    queueProcess();
    scheduleSaveSettings();
  });
  elements.processBtn.addEventListener("click", () => processImage());
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
    queueProcess();
    scheduleSaveSettings();
  });
  elements.resetStudio.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    state.saved = null;
    elements.removeBg.checked = false;
    elements.background.value = "white";
    elements.preset.value = "portrait-4x5";
    elements.cropSliders.topBias.value = "0.2";
    elements.format.value = "png";
    elements.exportSliders.jpegQuality.value = "92";
    elements.autoUpdate.checked = true;
    enforceCompatibleOptions();
    updateSliderValues();
    applyStyle("classic");
    updateBackgroundSwatch();
    setZoomMode("fit");
    showToast("Studio reset.");
  });
  elements.resetCropExport.addEventListener("click", () => {
    elements.preset.value = "portrait-4x5";
    elements.cropSliders.topBias.value = "0.2";
    elements.format.value = "png";
    elements.exportSliders.jpegQuality.value = "92";
    elements.exportSliders.jpegQuality.disabled = true;
    updateSliderValues();
    queueProcess();
    scheduleSaveSettings();
    showToast("Crop/export reset.");
  });
  elements.resetBackground.addEventListener("click", () => {
    elements.removeBg.checked = false;
    elements.background.value = "white";
    enforceCompatibleOptions();
    updateBackgroundSwatch();
    queueProcess();
    scheduleSaveSettings();
    showToast("Background reset.");
  });
  elements.toastDismiss.addEventListener("click", () => hideToast());
  elements.toggleZoom.addEventListener("click", () => {
    const current = readZoomMode();
    setZoomMode(current === "fit" ? "actual" : "fit");
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
}

updateSliderValues();
state.saved = readSettings();
applySavedSettings();
updateBackgroundSwatch();
elements.exportSliders.jpegQuality.disabled = elements.format.value !== "jpeg";
setZoomMode(readZoomMode());
loadPresets();
bindEvents();
