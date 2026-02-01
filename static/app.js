const state = {
  file: null,
  preset: "portrait-4x5",
  style: "classic",
  styles: {},
  controller: null,
  debounce: null,
  processedUrl: null,
  toastTimer: null,
};

const elements = {
  fileInput: document.getElementById("fileInput"),
  dropzone: document.getElementById("dropzone"),
  removeBg: document.getElementById("removeBg"),
  background: document.getElementById("background"),
  preset: document.getElementById("preset"),
  format: document.getElementById("format"),
  autoUpdate: document.getElementById("autoUpdate"),
  processBtn: document.getElementById("processBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  resetSliders: document.getElementById("resetSliders"),
  originalPreview: document.getElementById("originalPreview"),
  processedPreview: document.getElementById("processedPreview"),
  loading: document.getElementById("loading"),
  styleGrid: document.getElementById("styleGrid"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  toastDismiss: document.getElementById("toastDismiss"),
  sliders: {
    brightness: document.getElementById("brightness"),
    contrast: document.getElementById("contrast"),
    color: document.getElementById("color"),
    sharpness: document.getElementById("sharpness"),
    soften: document.getElementById("soften"),
  },
  sliderValues: {
    brightness: document.getElementById("brightnessValue"),
    contrast: document.getElementById("contrastValue"),
    color: document.getElementById("colorValue"),
    sharpness: document.getElementById("sharpnessValue"),
    soften: document.getElementById("softenValue"),
  },
};

function setStatusLoading(isLoading) {
  elements.loading.classList.toggle("show", isLoading);
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
    queueProcess();
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
}

function setFile(file) {
  state.file = file;
  elements.downloadBtn.disabled = true;
  hideToast();
  if (state.processedUrl) {
    URL.revokeObjectURL(state.processedUrl);
    state.processedUrl = null;
  }
  elements.processedPreview.removeAttribute("src");
  const reader = new FileReader();
  reader.onload = () => {
    elements.originalPreview.src = reader.result;
  };
  reader.readAsDataURL(file);
  queueProcess(true);
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

    if (state.processedUrl) {
      URL.revokeObjectURL(state.processedUrl);
      state.processedUrl = null;
    }
    const blob = await response.blob();
    state.processedUrl = URL.createObjectURL(blob);
    elements.processedPreview.src = state.processedUrl;
    elements.downloadBtn.disabled = false;
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
    });
  });

  elements.removeBg.addEventListener("change", () => {
    enforceCompatibleOptions();
    queueProcess();
  });
  elements.background.addEventListener("change", () => {
    enforceCompatibleOptions();
    queueProcess();
  });
  elements.preset.addEventListener("change", () => queueProcess());
  elements.format.addEventListener("change", () => {
    enforceCompatibleOptions();
    queueProcess();
  });
  elements.autoUpdate.addEventListener("change", () => queueProcess());
  elements.processBtn.addEventListener("click", () => processImage());
  elements.resetSliders.addEventListener("click", () => {
    setSliders(neutralSliders());
    setStyleSelection("manual");
    queueProcess();
  });
  elements.toastDismiss.addEventListener("click", () => hideToast());

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      processImage();
    }
    if (event.key === "Escape") {
      hideToast();
    }
  });
}

updateSliderValues();
loadPresets();
bindEvents();
