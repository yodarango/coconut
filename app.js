/* Self-contained canvas drawing app with server save via PUT/POST */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("drawCanvas");
  const ctx = canvas.getContext("2d");
  const colorPicker = $("colorPicker");
  const pencilSize = $("pencilSize");
  const eraserSize = $("eraserSize");
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
  const colorCircles = document.querySelectorAll(".color-circle");
  const editColorsBtn = $("editColorsBtn");
  const colorInputsContainer = document.querySelector(
    ".color-inputs-container"
  );
  const colorInputs = document.querySelectorAll(".color-input");
  let isErasing = false;
  let isEditingColors = false;
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

    if (isErasing) {
      // Switch to eraser
      pencilSize.style.display = "none";
      eraserSize.style.display = "block";
      brushSizeValue.textContent = eraserSize.value + "px";
    } else {
      // Switch to pencil
      eraserSize.style.display = "none";
      pencilSize.style.display = "block";
      brushSizeValue.textContent = pencilSize.value + "px";
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
          pencilSize.value = parsed.pencilSize;
          if (!isErasing) {
            brushSizeValue.textContent = parsed.pencilSize + "px";
          }
        }
        if (parsed.eraserSize) {
          eraserSize.value = parsed.eraserSize;
          if (isErasing) {
            brushSizeValue.textContent = parsed.eraserSize + "px";
          }
        }
      } catch (e) {
        console.warn("Failed to load settings from localStorage:", e);
      }
    } else {
      // No settings found, apply default colors
      const defaultColors = ["#000000", "#0000ff", "#ff0000"];
      circles.forEach((circle, index) => {
        if (defaultColors[index]) {
          circle.style.backgroundColor = defaultColors[index];
        }
      });
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
    settings.pencilSize = Number(pencilSize.value);
    settings.eraserSize = Number(eraserSize.value);

    try {
      localStorage.setItem("settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  // Add click handlers for color circles - single click to select color
  colorCircles.forEach((circle) => {
    function handleClick() {
      // Single click: set as current drawing color
      const currentColor = window.getComputedStyle(circle).backgroundColor;
      const hexColor = convertRgbToHex(currentColor);
      colorPicker.value = hexColor;
    }

    circle.addEventListener("click", handleClick);
    circle.addEventListener("touchend", (e) => {
      e.preventDefault();
      handleClick();
    });
  });

  // Toggle edit colors mode
  editColorsBtn.addEventListener("click", () => {
    isEditingColors = !isEditingColors;

    if (isEditingColors) {
      // Hide circles, show color inputs and change icon to X
      document.querySelector(".color-circles").classList.add("hidden");
      colorInputsContainer.classList.remove("hidden");
      editColorsBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
      editColorsBtn.title = "Close color editor";

      // Sync color inputs with current circle colors
      colorCircles.forEach((circle, index) => {
        const currentColor = window.getComputedStyle(circle).backgroundColor;
        const hexColor = convertRgbToHex(currentColor);
        if (colorInputs[index]) {
          colorInputs[index].value = hexColor;
        }
      });
    } else {
      // Show circles, hide color inputs and change icon back to pencil
      document.querySelector(".color-circles").classList.remove("hidden");
      colorInputsContainer.classList.add("hidden");
      editColorsBtn.innerHTML = '<ion-icon name="create-outline"></ion-icon>';
      editColorsBtn.title = "Edit colors";
    }
  });

  // Handle color input changes
  colorInputs.forEach((input, index) => {
    input.addEventListener("change", () => {
      const newColor = input.value;
      if (colorCircles[index]) {
        colorCircles[index].style.backgroundColor = newColor;
        // Automatically select the edited color as current drawing color
        colorPicker.value = newColor;
        saveSettings();
      }
    });
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

      // Save history to localStorage
      localStorage.setItem("drawingHistory", JSON.stringify(history));
    } catch (e) {}
  }

  function saveCurrentCanvas() {
    try {
      const currentState = canvas.toDataURL("image/png");
      localStorage.setItem("currentDrawing", currentState);
    } catch (e) {}
  }

  function loadCanvasFromStorage() {
    try {
      // Load history
      const savedHistory = localStorage.getItem("drawingHistory");
      if (savedHistory) {
        history = JSON.parse(savedHistory);
      }

      // Load current drawing
      const savedDrawing = localStorage.getItem("currentDrawing");
      if (savedDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const rect = canvas.getBoundingClientRect();
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = savedDrawing;
      }
    } catch (e) {
      console.warn("Failed to load canvas from storage:", e);
    }
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
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Number(eraserSize.value);
    } else {
      ctx.strokeStyle = colorPicker.value;
      ctx.lineWidth = Number(pencilSize.value);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }
  function endDraw() {
    drawing = false;
    // Save current state after drawing
    saveCurrentCanvas();
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
  pencilSize.addEventListener("input", () => {
    const size = Number(pencilSize.value);
    brushSizeValue.textContent = size + "px";
    saveSettings();
  });

  eraserSize.addEventListener("input", () => {
    const size = Number(eraserSize.value);
    brushSizeValue.textContent = size + "px";
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
    saveCurrentCanvas();
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

  // Helper function to get cookie value
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  // Helper function to set cookie
  function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; SameSite=None`;
  }

  // Save to server
  saveServerBtn.addEventListener("click", async () => {
    // Check for authentication cookie
    let authToken = getCookie("anki_auth");

    if (!authToken) {
      authToken = prompt(
        "Please enter the authentication token to save images:"
      );
      if (!authToken) {
        alert("Authentication token is required to save images");
        return;
      }
      // Save the token as a cookie
      setCookie("anki_auth", authToken);
    }

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

    let copied = false;

    try {
      // Create blob once for both clipboard and upload
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

      // Try to copy to clipboard immediately (must be synchronous with user gesture for iOS)
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          const item = new ClipboardItem({
            "image/png": blob,
          });
          await navigator.clipboard.write([item]);
          copied = true;
          console.log("Image copied to clipboard");
          setStatus("Image copied to clipboard. Uploading…");
        }
      } catch (clipErr) {
        console.warn("Clipboard copy failed:", clipErr);
        // Continue with upload even if clipboard fails
      }

      // Try HTTP PUT first (works with nginx WebDAV or DAV-enabled location)
      const putResp = await fetch(url + name, { method: "PUT", body: blob });
      if (putResp.ok) {
        const message = copied
          ? "Saved image to " + url + name + "\n\nImage copied to clipboard!"
          : "Saved image to " + url + name;
        setStatus("Saved via PUT to " + url + name);
        alert(message);
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
      const message = copied
        ? "Saved image via upload: " + name + "\n\nImage copied to clipboard!"
        : "Saved image via upload: " + name;
      setStatus("Saved via POST to " + url);
      alert(message);
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
    // Allow safe chars including Unicode letters and prevent path traversal/hidden files
    name = name.replace(/[<>:"/\\|?*]/g, "_"); // Only replace filesystem-unsafe chars
    name = name.replace(/^\.+/, ""); // Remove leading dots
    name = name.replace(/\s+/g, "_"); // Replace spaces with underscores
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
    brushSizeValue.textContent = pencilSize.value + "px";
    loadSettings();
    loadCanvasFromStorage();

    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
      const existingSettings = localStorage.getItem("settings");
      if (!existingSettings) {
        console.log("No existing settings, saving defaults");
        saveSettings();
      }
    }, 500);

    setStatus("Ready. Draw with mouse/touch.");
  }

  // Ensure DOM is ready before initializing
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
