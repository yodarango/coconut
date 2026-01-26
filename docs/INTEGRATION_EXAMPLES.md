# Integration Examples

## Example 1: Next.js App

```jsx
// app/draw/page.jsx
'use client';

import CanvasDraw from 'canvas-draw';

export default function DrawPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CanvasDraw 
        defaultFilename="nextjs-drawing"
        uploadUrl="/api/upload"
      />
    </div>
  );
}
```

## Example 2: Vite React App

```jsx
// src/App.jsx
import CanvasDraw from 'canvas-draw';

function App() {
  return (
    <div className="app-container">
      <CanvasDraw 
        defaultFilename="vite-sketch"
        defaultColors={['#000000', '#FF6B6B', '#4ECDC4']}
      />
    </div>
  );
}

export default App;
```

## Example 3: Create React App

```jsx
// src/components/DrawingBoard.jsx
import React from 'react';
import CanvasDraw from 'canvas-draw';

function DrawingBoard() {
  const handleSave = async (blob, filename) => {
    // Custom save logic
    console.log('Saving:', filename);
  };

  return (
    <div style={{ height: '100vh' }}>
      <CanvasDraw 
        onSave={handleSave}
        storageKey="cra-canvas"
      />
    </div>
  );
}

export default DrawingBoard;
```

## Example 4: With React Router

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CanvasDraw from 'canvas-draw';

function DrawPage() {
  return (
    <div style={{ height: 'calc(100vh - 60px)' }}>
      <CanvasDraw defaultFilename="route-drawing" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/draw" element={<DrawPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Example 5: Modal/Dialog Integration

```jsx
import { useState } from 'react';
import CanvasDraw from 'canvas-draw';

function DrawingModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Drawing</button>
      
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: '#000'
        }}>
          <button onClick={() => setIsOpen(false)}>Close</button>
          <CanvasDraw 
            storageKey="modal-canvas"
            showScrollProxy={false}
          />
        </div>
      )}
    </>
  );
}
```

## Example 6: With Authentication

```jsx
import CanvasDraw from 'canvas-draw';
import { useAuth } from './hooks/useAuth';

function AuthenticatedDraw() {
  const { user, token } = useAuth();

  const handleSave = async (blob, filename) => {
    const formData = new FormData();
    formData.append('image', blob, filename);
    formData.append('userId', user.id);

    await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
  };

  return (
    <CanvasDraw 
      onSave={handleSave}
      defaultFilename={`${user.username}-drawing`}
    />
  );
}
```

## Example 7: Multiple Canvases (Tabs)

```jsx
import { useState } from 'react';
import CanvasDraw from 'canvas-draw';

function MultiCanvasTabs() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div>
        <button onClick={() => setActiveTab(0)}>Canvas 1</button>
        <button onClick={() => setActiveTab(1)}>Canvas 2</button>
        <button onClick={() => setActiveTab(2)}>Canvas 3</button>
      </div>
      
      <div style={{ height: 'calc(100vh - 50px)' }}>
        {activeTab === 0 && <CanvasDraw storageKey="canvas-1" />}
        {activeTab === 1 && <CanvasDraw storageKey="canvas-2" />}
        {activeTab === 2 && <CanvasDraw storageKey="canvas-3" />}
      </div>
    </div>
  );
}
```

## Example 8: With Custom Toolbar

```jsx
import CanvasDraw from 'canvas-draw';

function CustomToolbarDraw() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '1rem', background: '#333', color: '#fff' }}>
        <h1>My Drawing App</h1>
      </header>
      
      <div style={{ flex: 1 }}>
        <CanvasDraw 
          defaultColors={['#000', '#fff', '#f00']}
          storageKey="custom-toolbar-canvas"
        />
      </div>
    </div>
  );
}
```

## Package.json Examples

### Relative Path (Same Parent Directory)
```json
{
  "dependencies": {
    "canvas-draw": "file:../canvas-draw-component"
  }
}
```

### Absolute Path
```json
{
  "dependencies": {
    "canvas-draw": "file:/Users/you/shared/canvas-draw-component"
  }
}
```

### Monorepo (Yarn Workspaces)
```json
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "dependencies": {
    "canvas-draw": "workspace:*"
  }
}
```

