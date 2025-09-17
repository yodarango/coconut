/* Self-contained canvas drawing app with server save via PUT/POST */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("drawCanvas");
  const ctx = canvas.getContext("2d");
  const colorPicker = $("colorPicker");
  const brushSize = $("brushSize");
  const brushSizeValue = $("brushSizeValue");
  const undoBtn = $("undoBtn");
  const clearBtn = $("clearBtn");
  const downloadBtn = $("downloadBtn");
  const saveServerBtn = $("saveServerBtn");
  const uploadUrlInput = $("uploadUrl");
  const filenamePrefix = $("filenamePrefix");
  const status = $("status");
  const eraserBtn = $("eraserBtn");
  const scrollProxy = document.getElementById("scrollProxy");
  const scrollThumb = document.getElementById("scrollThumb");
  const quickColorPicker = $("quickColorPicker");
  const colorCircles = document.querySelectorAll(".color-circle");
  let isErasing = false;
  let currentColorCircleIndex = null;
  // Right-side scroll proxy (30px) helpers
  function isOnScrollProxy(e) {
    const t = e && e.target;
    return !!(t && (t.id === "scrollProxy" || t.id === "scrollThumb"));
  }
  function updateScrollThumb() {
    if (!scrollThumb) return;
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const winH = window.innerHeight;
    const maxScroll = Math.max(1, docH - winH);
    const minThumb = 40; // px
    const thumbH = Math.max(minThumb, Math.round((winH / docH) * winH));
    scrollThumb.style.height = thumbH + "px";
    const top = Math.round((window.scrollY / maxScroll) * (winH - thumbH));
    scrollThumb.style.transform = `translateY(${top}px)`;
  }
  let draggingThumb = false,
    startY = 0,
    startScroll = 0;
  function onThumbDown(e) {
    draggingThumb = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY) || 0;
    startScroll = window.scrollY;
    document.body.style.userSelect = "none";
    e.preventDefault && e.preventDefault();
  }
  function onThumbMove(e) {
    if (!draggingThumb) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) || 0;
    const delta = y - startY;
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const winH = window.innerHeight;
    const maxScroll = Math.max(1, docH - winH);
    const minThumb = 40;
    const thumbH = Math.max(minThumb, Math.round((winH / docH) * winH));
    const trackH = Math.max(1, winH - thumbH);
    const ratio = maxScroll / trackH;
    const next = Math.max(0, Math.min(maxScroll, startScroll + delta * ratio));
    window.scrollTo({ top: next, behavior: "auto" });
    updateScrollThumb();
  }
  function onThumbUp() {
    if (!draggingThumb) return;
    draggingThumb = false;
    document.body.style.userSelect = "";
  }
  if (scrollThumb) {
    scrollThumb.addEventListener("mousedown", onThumbDown);
    window.addEventListener("mousemove", onThumbMove);
    window.addEventListener("mouseup", onThumbUp);
    scrollThumb.addEventListener("touchstart", onThumbDown, { passive: false });
    window.addEventListener("touchmove", onThumbMove, { passive: false });
    window.addEventListener("touchend", onThumbUp);
    window.addEventListener("scroll", updateScrollThumb);
  }

  // Canvas sizing
  function fitCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // if newly created, fill white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Eraser button
  eraserBtn.addEventListener("click", () => {
    isErasing = !isErasing;
    eraserBtn.classList.toggle("active", isErasing);

    // Get settings from localStorage
    const settings = localStorage.getItem("settings");
    let pencilSize = 8;
    let eraserSize = 20;

    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        pencilSize = parsed.pencilSize || 8;
        eraserSize = parsed.eraserSize || 20;
      } catch (e) {
        console.warn("Failed to load brush sizes from settings");
      }
    }

    if (isErasing) {
      // Switch to eraser: range 5-50, step 5
      brushSize.min = "5";
      brushSize.max = "50";
      brushSize.step = "5";
      brushSize.value = eraserSize;
      brushSizeValue.textContent = eraserSize + "px";
    } else {
      // Switch to pencil: range 1-16, step 1
      brushSize.min = "1";
      brushSize.max = "16";
      brushSize.step = "1";
      brushSize.value = pencilSize;
      brushSizeValue.textContent = pencilSize + "px";
    }
  });

  function loadSettings() {
    // Re-query the elements to make sure we have them
    const circles = document.querySelectorAll(".color-circle");

    const settings = localStorage.getItem("settings");

    // First set default colors
    circles.forEach((circle, index) => {
      const defaultColor = circle.getAttribute("data-default-color");
      if (defaultColor) {
        circle.style.backgroundColor = defaultColor;
      }
    });

    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed.quickColors && Array.isArray(parsed.quickColors)) {
          parsed.quickColors.forEach((color, index) => {
            if (circles[index] && color) {
              circles[index].style.backgroundColor = color;
            }
          });
        }

        // Load brush sizes
        if (parsed.pencilSize) {
          if (!isErasing) {
            brushSize.value = parsed.pencilSize;
            brushSizeValue.textContent = parsed.pencilSize + "px";
          }
        }
        if (parsed.eraserSize && isErasing) {
          brushSize.value = parsed.eraserSize;
          brushSizeValue.textContent = parsed.eraserSize + "px";
        }
      } catch (e) {
        console.warn("Failed to load settings from localStorage:", e);
      }
    }
  }

  function convertRgbToHex(color) {
    if (color.startsWith("#")) return color;
    if (color.startsWith("rgb")) {
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const hex = rgb
          .slice(0, 3)
          .map((x) => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("");
        return "#" + hex;
      }
    }
    return color;
  }

  function saveSettings() {
    const quickColors = Array.from(colorCircles).map((circle) => {
      const computedColor = window.getComputedStyle(circle).backgroundColor;
      const hexColor = convertRgbToHex(computedColor);
      return hexColor;
    });

    // Get current settings or defaults
    const existingSettings = localStorage.getItem("settings");
    let settings = { quickColors };

    if (existingSettings) {
      try {
        settings = { ...JSON.parse(existingSettings), quickColors };
      } catch (e) {
        console.warn("Failed to parse existing settings");
      }
    }

    // Update brush sizes
    const currentSize = Number(brushSize.value);
    if (isErasing) {
      settings.eraserSize = currentSize;
      settings.pencilSize = settings.pencilSize || 8; // Keep existing or default
    } else {
      settings.pencilSize = currentSize;
      settings.eraserSize = settings.eraserSize || 20; // Keep existing or default
    }

    try {
      localStorage.setItem("settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  // Add click handlers for color circles - single click only
  colorCircles.forEach((circle, index) => {
    const convertToHex = convertRgbToHex;

    function handleClick() {
      // Single click: set as current drawing color
      const currentColor = window.getComputedStyle(circle).backgroundColor;
      const hexColor = convertToHex(currentColor);
      colorPicker.value = hexColor;
    }

    circle.addEventListener("click", handleClick);
    circle.addEventListener("touchend", (e) => {
      e.preventDefault();
      handleClick();
    });
  });

  // Edit color button - cycles through colors to edit
  const editColorBtn = document.getElementById("editColorBtn");
  let editingColorIndex = 0;

  editColorBtn.addEventListener("click", () => {
    const circle = colorCircles[editingColorIndex];
    const currentColor = window.getComputedStyle(circle).backgroundColor;
    const hexColor = convertRgbToHex(currentColor);

    currentColorCircleIndex = editingColorIndex;
    quickColorPicker.value = hexColor;
    quickColorPicker.click();

    // Move to next color for next edit
    editingColorIndex = (editingColorIndex + 1) % colorCircles.length;
  });

  // Handle color picker change
  quickColorPicker.addEventListener("change", () => {
    if (currentColorCircleIndex !== null) {
      const newColor = quickColorPicker.value;
      colorCircles[currentColorCircleIndex].style.backgroundColor = newColor;

      colorPicker.value = newColor;

      setTimeout(() => {
        saveSettings();
      }, 0);

      currentColorCircleIndex = null;
    }
  });

  window.addEventListener("resize", () => {
    // preserve content on resize by snapshotting first
    const img = canvas.toDataURL("image/png");
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0, rect.width, rect.height);
    };
    image.src = img;
    updateScrollThumb();
  });

  // Drawing state
  let drawing = false;
  let lastX = 0,
    lastY = 0;
  let history = [];

  function pushHistory() {
    try {
      history.push(canvas.toDataURL("image/png"));
      if (history.length > 20) history.shift();
    } catch (e) {}
  }

  function startDraw(x, y) {
    drawing = true;
    lastX = x;
    lastY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
    pushHistory();
  }
  function drawTo(x, y) {
    if (!drawing) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    if (isErasing) {
      ctx.strokeStyle = "#ffffff"; // White color for eraser
    } else {
      ctx.strokeStyle = colorPicker.value;
    }

    ctx.lineWidth = Number(brushSize.value);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }
  function endDraw() {
    drawing = false;
  }

  // Pointer events (mouse + touch)
  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    if (evt.touches && evt.touches[0]) {
      return {
        x: evt.touches[0].clientX - rect.left,
        y: evt.touches[0].clientY - rect.top,
      };
    }

    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }
  canvas.addEventListener("mousedown", (e) => {
    if (isOnScrollProxy(e)) return;
    startDraw(...Object.values(getPos(e)));
  });
  canvas.addEventListener("mousemove", (e) => {
    if (isOnScrollProxy(e)) return;
    drawTo(...Object.values(getPos(e)));
  });
  window.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startDraw(...Object.values(getPos(e)));
  });
  canvas.addEventListener("touchmove", (e) => {
    if (isOnScrollProxy(e)) return;
    e.preventDefault();
    drawTo(...Object.values(getPos(e)));
  });
  window.addEventListener("touchend", endDraw);

  // Controls
  brushSize.addEventListener("input", () => {
    const size = Number(brushSize.value);
    brushSizeValue.textContent = size + "px";

    // Save settings when brush size changes
    saveSettings();
  });
  undoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.target.blur(); // Remove focus from button

    const prev = history.pop();
    if (!prev) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw into CSS pixel space size
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = prev;
  });
  clearBtn.addEventListener("click", () => {
    pushHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    const r = canvas.getBoundingClientRect();
    ctx.fillRect(0, 0, r.width, r.height);
  });

  // Download
  downloadBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    const name = makeFilename("png");
    a.download = name;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setStatus("Downloaded " + name);
  });

  // Save to server
  saveServerBtn.addEventListener("click", async () => {
    // Check if filename is empty
    const nameInput = (filenamePrefix.value || "").trim();
    if (!nameInput) {
      alert("Please enter a filename before saving");
      return;
    }

    const url = normalizedUploadUrl();
    const name = makeFilename("png");
    setStatus("Uploading…");
    disableSaving(true);

    try {
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      // Try HTTP PUT first (works with nginx WebDAV or DAV-enabled location)
      const putResp = await fetch(url + name, { method: "PUT", body: blob });
      if (putResp.ok) {
        setStatus("Saved via PUT to " + url + name);
        alert("Saved image to " + url + name);
        const imageUrl = `/images/anki/${name}`;
        // Open the saved image in a new tab
        window.open(imageUrl, "_blank");
        disableSaving(false);
        window.location.reload();
        return;
      }

      // Fallback to POST multipart (tiny Node or any backend accepting files)
      const form = new FormData();
      form.append("file", blob, name);
      const postResp = await fetch(url, { method: "POST", body: form });
      if (!postResp.ok)
        throw new Error("Upload failed with status " + postResp.status);
      setStatus("Saved via POST to " + url);
      alert("Saved image via upload: " + name);
      // Open the image in a new tab
      window.open(`https://cdn.danielrangel.net/images/anki/${name}`, "_blank");
      window.location.reload();
    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
      alert("Failed to save image: " + err.message);
    } finally {
      disableSaving(false);
    }
  });

  function makeFilename(ext) {
    let name = (filenamePrefix.value || "").trim();
    // Allow only safe chars and prevent path traversal/hidden files
    name = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    name = name.replace(/[\\/]/g, "_").replace(/^\.+/, "");
    // Convert to lowercase and replace spaces with underscores
    name = name.toLowerCase().replace(/\s+/g, "_");
    if (!name.toLowerCase().endsWith("." + ext)) name += "." + ext;
    return name;
  }

  function normalizedUploadUrl() {
    // Right-side scroll proxy (30px) logic
    function isOnScrollProxy(e) {
      const t = e && e.target;
      return !!(t && (t.id === "scrollProxy" || t.id === "scrollThumb"));
    }
    function updateScrollThumb() {
      if (!scrollThumb) return;
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const winH = window.innerHeight;
      const maxScroll = Math.max(1, docH - winH);
      const minThumb = 40; // px
      const thumbH = Math.max(minThumb, Math.round((winH / docH) * winH));
      scrollThumb.style.height = thumbH + "px";
      const top = Math.round((window.scrollY / maxScroll) * (winH - thumbH));
      scrollThumb.style.transform = `translateY(${top}px)`;
    }
    let draggingThumb = false,
      startY = 0,
      startScroll = 0;
    function onThumbDown(e) {
      draggingThumb = true;
      startY = (e.touches ? e.touches[0].clientY : e.clientY) || 0;
      startScroll = window.scrollY;
      document.body.style.userSelect = "none";
      e.preventDefault && e.preventDefault();
    }
    function onThumbMove(e) {
      if (!draggingThumb) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) || 0;
      const delta = y - startY;
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const winH = window.innerHeight;
      const maxScroll = Math.max(1, docH - winH);
      const minThumb = 40;
      const thumbH = Math.max(minThumb, Math.round((winH / docH) * winH));
      const trackH = Math.max(1, winH - thumbH);
      const ratio = maxScroll / trackH;
      const next = Math.max(
        0,
        Math.min(maxScroll, startScroll + delta * ratio)
      );
      window.scrollTo({ top: next, behavior: "auto" });
      updateScrollThumb();
    }
    function onThumbUp() {
      if (!draggingThumb) return;
      draggingThumb = false;
      document.body.style.userSelect = "";
    }
    if (scrollThumb) {
      scrollThumb.addEventListener("mousedown", onThumbDown);
      window.addEventListener("mousemove", onThumbMove);
      window.addEventListener("mouseup", onThumbUp);
      scrollThumb.addEventListener("touchstart", onThumbDown, {
        passive: false,
      });
      window.addEventListener("touchmove", onThumbMove, { passive: false });
      window.addEventListener("touchend", onThumbUp);
      window.addEventListener("scroll", updateScrollThumb);
    }

    let u = uploadUrlInput.value.trim() || "/drawings/";
    if (!u.endsWith("/")) u += "/";
    return u;
  }

  function setStatus(msg) {
    status.textContent = msg;
  }
  function disableSaving(dis) {
    saveServerBtn.disabled = dis;
    downloadBtn.disabled = dis;
  }

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const z = e.key.toLowerCase() === "z";
    if ((e.metaKey || e.ctrlKey) && z) {
      e.preventDefault();
      undoBtn.click();
    }
  });

  // Init
  function init() {
    fitCanvas();
    brushSizeValue.textContent = brushSize.value + "px";

    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
      loadSettings();

      // Save initial settings if none exist
      const existingSettings = localStorage.getItem("settings");
      if (!existingSettings) {
        console.log("No existing settings, saving defaults");
        saveSettings();
      }
    }, 100);

    setStatus("Ready. Draw with mouse/touch.");
  }

  // Ensure DOM is ready before initializing
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
