# Canvas Draw Component - Quick Start

## 🚀 Installation (30 seconds)

```bash
# In your React app directory
npm install file:../canvas-draw-component
```

## 📝 Basic Usage (Copy & Paste)

```jsx
import CanvasDraw from 'canvas-draw';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CanvasDraw />
    </div>
  );
}
```

## 🎨 Props Cheat Sheet

```jsx
<CanvasDraw
  uploadUrl="/api/images/"           // Server upload endpoint
  defaultFilename="my-drawing"       // Filename prefix
  onSave={customSaveHandler}         // Custom save function
  showScrollProxy={true}             // Show scroll bar (default: true)
  defaultColors={['#000', '#f00']}   // Quick color palette
  storageKey="canvasDraw"            // localStorage key
/>
```

## 🔧 Custom Save Handler

```jsx
const handleSave = async (blob, filename) => {
  const formData = new FormData();
  formData.append('image', blob, filename);
  await fetch('/api/upload', { method: 'POST', body: formData });
};

<CanvasDraw onSave={handleSave} />
```

## 📦 Project Structure

```
canvas-draw-component/
├── src/
│   ├── CanvasDraw.jsx          # Main component
│   ├── CanvasDraw.module.css   # Scoped styles
│   └── index.js                # Exports
├── dist/                        # Built files (after npm run build)
├── demo/                        # Demo app
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ Development

```bash
# Test the component
cd canvas-draw-component
npm run dev

# Build for production
npm run build

# Update in your apps
cd ../your-react-app
npm install
```

## ✨ Features

- ✏️ Drawing with adjustable brush (1-16px)
- 🗑️ Eraser with adjustable size (5-50px)
- 🎨 3 customizable quick colors
- ↶ Undo (up to 20 steps, Cmd/Ctrl+Z)
- 💾 Auto-save to localStorage
- 📥 Download as PNG
- ☁️ Upload to server
- 📋 Copy to clipboard
- 📱 Touch support

## 🔑 Keyboard Shortcuts

- `Cmd/Ctrl + Z` - Undo

## 📚 More Info

- Full documentation: `README.md`
- Usage examples: `USAGE_GUIDE.md`
- Demo app: `demo/App.jsx`

## 🐛 Common Issues

**Component not updating?**
```bash
cd canvas-draw-component && npm run build
cd ../your-app && npm install
```

**Multiple instances?**
```jsx
<CanvasDraw storageKey="canvas1" />
<CanvasDraw storageKey="canvas2" />
```

**Custom colors?**
```jsx
<CanvasDraw defaultColors={['#FF6B6B', '#4ECDC4', '#45B7D1']} />
```

---

That's it! You're ready to draw 🎨

