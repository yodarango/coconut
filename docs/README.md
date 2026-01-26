# Canvas Draw Component

A self-contained, feature-rich canvas drawing component for React applications. Draw, erase, save, and export with ease!

## Features

- ✏️ **Drawing Tools**: Pencil with adjustable sizes (1-16px)
- 🗑️ **Eraser**: Adjustable eraser (5-50px)
- 🎨 **Color Picker**: 3 customizable quick-access colors + full color picker
- ↶ **Undo**: Up to 20 steps with Cmd/Ctrl+Z support
- 💾 **Auto-save**: Preserves drawings and settings in localStorage
- 📥 **Download**: Save as PNG locally
- ☁️ **Server Upload**: POST to server with optional custom handler
- 📋 **Clipboard**: Auto-copy to clipboard on save (when supported)
- 📱 **Touch Support**: Works on mobile and tablets
- 🎯 **Custom Scroll Proxy**: Optional 30px drag-scrollable area

## Installation

### Option 1: File Path (Recommended for local sharing)

In your React app's `package.json`:

```json
{
  "dependencies": {
    "canvas-draw": "file:../canvas-draw-component"
  }
}
```

Then run:
```bash
npm install
```

### Option 2: Copy to Shared Directory

Copy the entire `canvas-draw-component` folder to a shared location and reference it in multiple projects.

### Option 3: Git Submodule

```bash
git submodule add <repo-url> shared/canvas-draw-component
```

## Usage

### Basic Example

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

### Advanced Example with Props

```jsx
import CanvasDraw from 'canvas-draw';

function App() {
  const handleCustomSave = async (blob, filename) => {
    // Custom save logic
    const formData = new FormData();
    formData.append('image', blob, filename);
    
    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CanvasDraw
        uploadUrl="/api/images/"
        defaultFilename="sketch"
        onSave={handleCustomSave}
        showScrollProxy={true}
        defaultColors={['#000000', '#ff0000', '#00ff00']}
        storageKey="myAppCanvas"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `uploadUrl` | `string` | `'/images/anki/'` | Server endpoint for POST uploads |
| `defaultFilename` | `string` | `''` | Default filename prefix |
| `onSave` | `function` | `null` | Custom save handler `(blob, filename) => Promise` |
| `showScrollProxy` | `boolean` | `true` | Show 30px scroll proxy on right side |
| `defaultColors` | `array` | `['#000000', '#0000ff', '#ff0000']` | Quick-access color palette |
| `storageKey` | `string` | `'canvasDraw'` | localStorage key prefix |

## Development

### Run Demo

```bash
cd canvas-draw-component
npm install
npm run dev
```

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with:
- `canvas-draw.es.js` - ES module
- `canvas-draw.umd.js` - UMD module
- `style.css` - Component styles

## Keyboard Shortcuts

- **Cmd/Ctrl + Z**: Undo last action

## Browser Support

- Modern browsers with Canvas API support
- Touch events for mobile devices
- Clipboard API for copy-to-clipboard (optional)

## License

MIT

## Notes

- Drawings are auto-saved to localStorage
- History limited to 20 undo steps
- Canvas adapts to container size
- High DPI display support (retina screens)

