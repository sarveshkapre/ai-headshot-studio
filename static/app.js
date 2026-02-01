const state = {
  file: null,
  preset: "portrait-4x5",
  style: "classic",
  controller: null,
  debounce: null,
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
  originalPreview: document.getElementById("originalPreview"),
  processedPreview: document.getElementById("processedPreview"),
  loading: document.getElementById("loading"),
  styleGrid: document.getElementById("styleGrid"),
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

function updateSliderValues() {
  Object.keys(elements.sliders).forEach((key) => {
    elements.sliderValues[key].textContent = Number(elements.sliders[key].value).toFixed(2);
  });
}

async function loadPresets() {
  const response = await fetch("/api/presets");
  const data = await response.json();

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
  data.styles.forEach((style) => {
    const card = document.createElement("div");
    card.className = "style-card";
    card.dataset.key = style.key;
    card.textContent = style.name;
    if (style.key === state.style) {
      card.classList.add("active");
    }
    card.addEventListener("click", () => selectStyle(style.key));
    elements.styleGrid.appendChild(card);
  });
}

function selectStyle(styleKey) {
  state.style = styleKey;
  [...elements.styleGrid.children].forEach((child) => {
    child.classList.toggle("active", child.dataset.key === styleKey);
  });
  queueProcess();
}

function setFile(file) {
  state.file = file;
  elements.downloadBtn.disabled = true;
  const reader = new FileReader();
  reader.onload = () => {
    elements.originalPreview.src = reader.result;
  };
  reader.readAsDataURL(file);
  queueProcess(true);
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
  data.append("style", state.style);
  data.append("brightness", elements.sliders.brightness.value);
  data.append("contrast", elements.sliders.contrast.value);
  data.append("color", elements.sliders.color.value);
  data.append("sharpness", elements.sliders.sharpness.value);
  data.append("soften", elements.sliders.soften.value);
  data.append("format", elements.format.value);
  return data;
}

async function processImage() {
  if (!state.file) return;

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
      const detail = await response.json();
      throw new Error(detail.detail || "Processing failed.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    elements.processedPreview.src = url;
    elements.downloadBtn.disabled = false;
    elements.downloadBtn.onclick = () => {
      const link = document.createElement("a");
      link.href = url;
      link.download = `headshot.${elements.format.value}`;
      link.click();
    };
  } catch (error) {
    if (error.name !== "AbortError") {
      alert(error.message);
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
      queueProcess();
    });
  });

  elements.removeBg.addEventListener("change", () => queueProcess());
  elements.background.addEventListener("change", () => queueProcess());
  elements.preset.addEventListener("change", () => queueProcess());
  elements.format.addEventListener("change", () => queueProcess());
  elements.autoUpdate.addEventListener("change", () => queueProcess());
  elements.processBtn.addEventListener("click", () => processImage());

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      processImage();
    }
  });
}

updateSliderValues();
loadPresets();
bindEvents();
