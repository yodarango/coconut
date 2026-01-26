# Canvas Draw Component - Usage Guide

## Quick Start for Your React Apps

### Step 1: Link the Component

Navigate to your React app directory and add the dependency:

```bash
cd /path/to/your/react-app
npm install --save file:../canvas-draw-component
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "canvas-draw": "file:../canvas-draw-component"
  }
}
```

Then run `npm install`.

### Step 2: Import and Use

```jsx
import CanvasDraw from 'canvas-draw';

function MyApp() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CanvasDraw />
    </div>
  );
}
```

**Important**: Make sure the parent container has defined dimensions (width/height).

## Common Use Cases

### 1. Simple Drawing App

```jsx
import CanvasDraw from 'canvas-draw';

function DrawingPage() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CanvasDraw defaultFilename="sketch" />
    </div>
  );
}
```

### 2. Custom Upload Endpoint

```jsx
import CanvasDraw from 'canvas-draw';

function AnkiDrawing() {
  return (
    <CanvasDraw 
      uploadUrl="/api/anki/images/"
      defaultFilename="anki-card"
    />
  );
}
```

### 3. Custom Save Handler

```jsx
import CanvasDraw from 'canvas-draw';

function CustomSaveApp() {
  const handleSave = async (blob, filename) => {
    // Upload to S3, Firebase, or custom backend
    const formData = new FormData();
    formData.append('image', blob, filename);
    
    const response = await fetch('/api/custom-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yourToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
  };

  return (
    <CanvasDraw 
      onSave={handleSave}
      defaultFilename="custom"
    />
  );
}
```

### 4. Custom Colors and Storage

```jsx
import CanvasDraw from 'canvas-draw';

function BrandedDrawing() {
  return (
    <CanvasDraw 
      defaultColors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
      storageKey="myAppDrawing"
      showScrollProxy={false}
    />
  );
}
```

### 5. Multiple Instances

```jsx
import CanvasDraw from 'canvas-draw';

function MultiCanvas() {
  return (
    <div>
      <div style={{ height: '50vh' }}>
        <CanvasDraw 
          storageKey="canvas1"
          defaultFilename="drawing-1"
        />
      </div>
      <div style={{ height: '50vh' }}>
        <CanvasDraw 
          storageKey="canvas2"
          defaultFilename="drawing-2"
        />
      </div>
    </div>
  );
}
```

## Updating the Component

When you make changes to the component:

```bash
cd canvas-draw-component
npm run build
```

Then in your React apps, reinstall:

```bash
cd /path/to/your/react-app
npm install
```

Or force reinstall:

```bash
npm uninstall canvas-draw
npm install file:../canvas-draw-component
```

## Sharing Across Multiple Apps

### Option A: Relative Path (Same Parent Directory)

```
/projects/
  ├── canvas-draw-component/
  ├── app1/
  │   └── package.json  → "canvas-draw": "file:../canvas-draw-component"
  ├── app2/
  │   └── package.json  → "canvas-draw": "file:../canvas-draw-component"
  └── app3/
      └── package.json  → "canvas-draw": "file:../canvas-draw-component"
```

### Option B: Absolute Path

```json
{
  "dependencies": {
    "canvas-draw": "file:/Users/you/shared/canvas-draw-component"
  }
}
```

### Option C: Git Submodule

```bash
cd your-react-app
git submodule add <repo-url> shared/canvas-draw
```

Then in `package.json`:
```json
{
  "dependencies": {
    "canvas-draw": "file:./shared/canvas-draw"
  }
}
```

## Troubleshooting

### Component not updating after changes
```bash
# In canvas-draw-component
npm run build

# In your React app
rm -rf node_modules/canvas-draw
npm install
```

### Styles not loading
Make sure to import the component (styles are bundled with CSS modules).

### localStorage conflicts
Use different `storageKey` props for different instances or apps.

### Build errors
Ensure you have React 18+ as a peer dependency in your app.

