import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./CanvasDraw.module.css";

const CanvasDraw = ({
  uploadUrl = "/images/anki/",
  defaultFilename = "",
  onSave = null,
  showScrollProxy = true,
  defaultColors = ["#000000", "#0000ff", "#ff0000"],
  storageKey = "canvasDraw",
}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const historyRef = useRef([]);
  const drawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const scrollProxyRef = useRef(null);
  const scrollThumbRef = useRef(null);
  const draggingThumbRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollRef = useRef(0);

  const [currentColor, setCurrentColor] = useState(defaultColors[0]);
  const [pencilSize, setPencilSize] = useState(8);
  const [eraserSize, setEraserSize] = useState(20);
  const [isErasing, setIsErasing] = useState(false);
  const [filename, setFilename] = useState(defaultFilename);
  const [status, setStatus] = useState("Ready.");
  const [isSaving, setIsSaving] = useState(false);
  const [quickColors, setQuickColors] = useState(defaultColors);
  const colorInputRefs = useRef([]);

  // Helper: convert rgb to hex
  const rgbToHex = (rgb) => {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
  };

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_settings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.quickColors) setQuickColors(parsed.quickColors);
        if (parsed.pencilSize) setPencilSize(parsed.pencilSize);
        if (parsed.eraserSize) setEraserSize(parsed.eraserSize);
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }
  }, [storageKey]);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      const settings = { quickColors, pencilSize, eraserSize };
      localStorage.setItem(`${storageKey}_settings`, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }, [quickColors, pencilSize, eraserSize, storageKey]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Canvas initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    const fitCanvas = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    fitCanvas();

    // Load saved drawing
    try {
      const savedHistory = localStorage.getItem(`${storageKey}_history`);
      if (savedHistory) historyRef.current = JSON.parse(savedHistory);

      const savedDrawing = localStorage.getItem(`${storageKey}_current`);
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
      console.warn("Failed to load canvas:", e);
    }

    // Handle resize
    const handleResize = () => {
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
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [storageKey]);

  // Save current canvas state
  const saveCurrentCanvas = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const currentState = canvas.toDataURL("image/png");
      localStorage.setItem(`${storageKey}_current`, currentState);
    } catch (e) {
      console.error("Failed to save canvas:", e);
    }
  }, [storageKey]);

  // Push to history
  const pushHistory = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      historyRef.current.push(canvas.toDataURL("image/png"));
      if (historyRef.current.length > 20) historyRef.current.shift();
      localStorage.setItem(
        `${storageKey}_history`,
        JSON.stringify(historyRef.current),
      );
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  }, [storageKey]);

  // Get mouse/touch position
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Drawing functions
  const startDraw = useCallback(
    (x, y) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      drawingRef.current = true;
      lastPosRef.current = { x, y };
      ctx.beginPath();
      ctx.moveTo(x, y);
      pushHistory();
    },
    [pushHistory],
  );

  const drawTo = useCallback(
    (x, y) => {
      if (!drawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = isErasing ? "#ffffff" : currentColor;
      ctx.lineWidth = isErasing ? eraserSize : pencilSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastPosRef.current = { x, y };
    },
    [currentColor, pencilSize, eraserSize, isErasing],
  );

  const endDraw = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    saveCurrentCanvas();
  }, [saveCurrentCanvas]);

  // Mouse events
  const handleMouseDown = (e) => {
    const pos = getPos(e);
    startDraw(pos.x, pos.y);
  };

  const handleMouseMove = (e) => {
    const pos = getPos(e);
    drawTo(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    endDraw();
  };

  // Touch events
  const handleTouchStart = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    startDraw(pos.x, pos.y);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    drawTo(pos.x, pos.y);
  };

  const handleTouchEnd = () => {
    endDraw();
  };

  // Undo
  const handleUndo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = prev;
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    pushHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    const rect = canvas.getBoundingClientRect();
    ctx.fillRect(0, 0, rect.width, rect.height);
    saveCurrentCanvas();
  };

  // Toggle eraser
  const handleToggleEraser = () => {
    setIsErasing(!isErasing);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll proxy functions
  const updateScrollThumb = useCallback(() => {
    const scrollThumb = scrollThumbRef.current;
    if (!scrollThumb) return;

    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
    const winH = window.innerHeight;
    const maxScroll = Math.max(1, docH - winH);
    const minThumb = 40;
    const thumbH = Math.max(minThumb, Math.round((winH / docH) * winH));
    scrollThumb.style.height = thumbH + "px";
    const top = Math.round((window.scrollY / maxScroll) * (winH - thumbH));
    scrollThumb.style.transform = `translateY(${top}px)`;
  }, []);

  const handleThumbDown = (e) => {
    draggingThumbRef.current = true;
    startYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    startScrollRef.current = window.scrollY;
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  const handleThumbMove = useCallback(
    (e) => {
      if (!draggingThumbRef.current) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = y - startYRef.current;
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      const winH = window.innerHeight;
      const maxScroll = Math.max(1, docH - winH);
      const minThumb = 40;
      const thumbH = Math.max(minThumb, Math.round((winH / docH) * winH));
      const trackH = Math.max(1, winH - thumbH);
      const ratio = maxScroll / trackH;
      const next = Math.max(
        0,
        Math.min(maxScroll, startScrollRef.current + delta * ratio),
      );
      window.scrollTo({ top: next, behavior: "auto" });
      updateScrollThumb();
    },
    [updateScrollThumb],
  );

  const handleThumbUp = () => {
    if (!draggingThumbRef.current) return;
    draggingThumbRef.current = false;
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (!showScrollProxy) return;
    window.addEventListener("scroll", updateScrollThumb);
    window.addEventListener("mousemove", handleThumbMove);
    window.addEventListener("mouseup", handleThumbUp);
    window.addEventListener("touchmove", handleThumbMove, { passive: false });
    window.addEventListener("touchend", handleThumbUp);
    updateScrollThumb();

    return () => {
      window.removeEventListener("scroll", updateScrollThumb);
      window.removeEventListener("mousemove", handleThumbMove);
      window.removeEventListener("mouseup", handleThumbUp);
      window.removeEventListener("touchmove", handleThumbMove);
      window.removeEventListener("touchend", handleThumbUp);
    };
  }, [showScrollProxy, updateScrollThumb, handleThumbMove]);

  // Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    const name = `${filename || "drawing"}_${Date.now()}.png`;
    a.download = name;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setStatus(`Downloaded ${name}`);
  };

  // Cookie helpers
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };

  const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; SameSite=None`;
  };

  // Save to server
  const handleSaveServer = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for auth token
    let authToken = getCookie("anki_auth");
    if (!authToken) {
      authToken = prompt(
        "Please enter the authentication token to save images:",
      );
      if (!authToken) {
        alert("Authentication token is required to save images");
        return;
      }
      setCookie("anki_auth", authToken);
    }

    // Check filename
    const nameInput = (filename || "").trim();
    if (!nameInput) {
      alert("Please enter a filename before saving");
      return;
    }

    const name = `${nameInput}_${Date.now()}.png`;
    setStatus("Uploading…");
    setIsSaving(true);

    let copied = false;

    try {
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

      // Try clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          copied = true;
          setStatus("Image copied to clipboard. Uploading…");
        }
      } catch (clipErr) {
        console.warn("Clipboard copy failed:", clipErr);
      }

      // If custom onSave provided, use it
      if (onSave) {
        await onSave(blob, name);
        const message = copied
          ? `Saved image: ${name}\n\nImage copied to clipboard!`
          : `Saved image: ${name}`;
        setStatus("Saved successfully");
        alert(message);
        window.location.reload();
        return;
      }

      // Otherwise, POST to server
      const form = new FormData();
      form.append("file", blob, name);
      const response = await fetch(uploadUrl, { method: "POST", body: form });
      if (!response.ok)
        throw new Error("Upload failed with status " + response.status);

      const message = copied
        ? `Saved image via upload: ${name}\n\nImage copied to clipboard!`
        : `Saved image via upload: ${name}`;
      setStatus(`Saved via POST to ${uploadUrl}`);
      alert(message);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
      alert("Failed to save image: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Color circle click - opens color picker for that slot
  const handleColorCircleClick = (index) => {
    // Trigger the hidden color input for this index
    if (colorInputRefs.current[index]) {
      colorInputRefs.current[index].click();
    }
  };

  // Color input change
  const handleColorInputChange = (index, newColor) => {
    const newColors = [...quickColors];
    newColors[index] = newColor;
    setQuickColors(newColors);
    // Also set as current color when changed
    setCurrentColor(newColor);
    setIsErasing(false);
  };

  return (
    <div className={styles.canvasDrawRoot}>
      <header className={styles.toolbar}>
        <div className={styles.group}>
          <div className={styles.colorCircles}>
            {quickColors.map((color, index) => (
              <div
                key={index}
                className={styles.colorCircle}
                style={{ backgroundColor: color }}
                onClick={() => handleColorCircleClick(index)}
                title='Click to change color'
              />
            ))}
          </div>
          {/* Hidden color inputs triggered by clicking color circles */}
          {quickColors.map((color, index) => (
            <input
              key={index}
              ref={(el) => (colorInputRefs.current[index] = el)}
              type='color'
              style={{ display: "none" }}
              value={color}
              onChange={(e) => handleColorInputChange(index, e.target.value)}
            />
          ))}
          <input
            type='color'
            className={styles.colorPicker}
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
          />
        </div>

        <div className={styles.group}>
          <input
            type='range'
            className={styles.rangeInput}
            min='1'
            max='16'
            step='1'
            value={pencilSize}
            onChange={(e) => setPencilSize(Number(e.target.value))}
            style={{ display: isErasing ? "none" : "block" }}
          />
          <input
            type='range'
            className={styles.rangeInput}
            min='5'
            max='50'
            step='5'
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            style={{ display: isErasing ? "block" : "none" }}
          />
          <span className={styles.mono}>
            {isErasing ? `${eraserSize}px` : `${pencilSize}px`}
          </span>
        </div>

        <div className={styles.group}>
          <button
            className={styles.button}
            onClick={handleUndo}
            title='Undo (⌘/Ctrl+Z)'
          >
            ↶
          </button>
          <button
            className={`${styles.button} ${isErasing ? styles.active : ""}`}
            onClick={handleToggleEraser}
            title='Toggle Eraser'
          >
            🗑️
          </button>
          <button
            className={styles.button}
            onClick={handleClear}
            title='Clear Canvas'
          >
            ✕
          </button>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>name</label>
          <input
            type='text'
            className={styles.textInput}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </div>

        <div className={styles.group}>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={handleSaveServer}
            disabled={isSaving}
          >
            Save
          </button>
          <button className={styles.button} onClick={handleDownload}>
            Download
          </button>
        </div>
      </header>

      <main className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </main>

      <footer className={styles.status}>{status}</footer>

      {showScrollProxy && (
        <div ref={scrollProxyRef} className={styles.scrollProxy}>
          <div
            ref={scrollThumbRef}
            className={styles.scrollThumb}
            onMouseDown={handleThumbDown}
            onTouchStart={handleThumbDown}
          />
        </div>
      )}
    </div>
  );
};

export default CanvasDraw;
