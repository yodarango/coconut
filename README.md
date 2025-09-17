#TODO

- la taglia del cancellatore debe essere differente da quella della matita
- quando un colore venga selezionato, chiude automaticamente il modelo di selezione e scegli se si trova seleezionate
- rimuove double tap da ipad

Canvas Draw & Save (Standalone)

This is a tiny, self-contained HTML/CSS/JS canvas app that lets you draw and save images either by downloading or uploading to a server.

How saving works

- Primary: HTTP PUT to {UPLOAD_URL}/{filename}.png (works great with Nginx + WebDAV or a `dav_methods PUT;`-enabled location)
- Fallback: POST multipart/form-data to {UPLOAD_URL} with field `file` (works with a minimal Node/Express saver or any endpoint that accepts file uploads)

Quick use

1. Serve ./tmp with Nginx (static). Open /tmp/index.html in a browser.
2. Set Upload URL in the toolbar:
   - For Nginx WebDAV: `/drawings/` (see below to configure)
   - For Node saver: `http://localhost:8787/upload` (see server below)
3. Draw, then click "Save to Server" or "Download".

Nginx (no backend) option

- Enable a writable location and allow PUT. Example snippet:

  location /drawings/ {
  root /var/www/your-site; # so files go under /var/www/your-site/drawings/
  client_body_temp_path /var/www/your-site/.tmp;
  dav_methods PUT; # requires ngx_http_dav_module
  create_full_put_path on;
  limit_except PUT { deny all; } # optional hardening
  }

- Ensure directories are writable by the Nginx user (e.g., www-data or nginx):

  sudo mkdir -p /var/www/your-site/.tmp /var/www/your-site/drawings
  sudo chown -R www-data:www-data /var/www/your-site

- Then set Upload URL in the app to `/drawings/` and use Save to Server.

Minimal Node saver (optional)

- Only if you prefer a small backend. Run separately from this project.
- Save the following as `server.js` next to this README (or anywhere). It listens on :8787 and accepts POST /upload with multipart form field `file`.

  const express = require('express');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  const app = express();
  const upload = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(\_\_dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, file.originalname)
  })});

  fs.mkdirSync(path.join(\_\_dirname, 'uploads'), { recursive: true });

  app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ ok: true, file: req.file.filename });
  });

  app.listen(8787, () => console.log('Node saver on http://localhost:8787'));

- Install deps and run:

  npm init -y && npm i express multer && node server.js

- Then set Upload URL in the app to `http://localhost:8787/upload`.

Notes

- The app is fully self-contained and portable; you can move ./tmp anywhere.
- CORS: If saving to a different domain, configure CORS to allow the browser to PUT/POST from your site.
- Security: PUT allows clients to write files; restrict who can reach that endpoint or protect it as needed.
