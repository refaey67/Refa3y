import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.set('etag', false);

// Unified CORS and security headers middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const bgDir = path.join(__dirname, 'backgrounds');
let cachedBgFiles = null;

// Build a clean map of all 40 original files in /backgrounds with in-memory caching
function getBackgroundFilesSorted() {
  if (cachedBgFiles && cachedBgFiles.length > 0) {
    return cachedBgFiles;
  }
  try {
    cachedBgFiles = fs.readdirSync(bgDir)
      .filter((f) => f.toLowerCase().endsWith('.jpg') && !f.startsWith('bg_'))
      .sort((a, b) => {
        const na = parseInt(a, 10) || 0;
        const nb = parseInt(b, 10) || 0;
        return na - nb || a.localeCompare(b);
      });
    return cachedBgFiles;
  } catch (e) {
    return [];
  }
}

// 1. Direct, failsafe image endpoint by number or filename: /api/bg/:id or /backgrounds/:name
app.get(['/api/bg/:id', '/backgrounds/:name', '/Refa3y/backgrounds/:name'], (req, res) => {
  const rawParam = req.params.id || req.params.name || '';
  let decoded = rawParam;
  try {
    decoded = decodeURIComponent(rawParam);
  } catch (e) {}

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  // Direct exact match in backgrounds folder
  const directPath = path.join(bgDir, path.basename(decoded));
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(directPath);
  }

  // Match by leading number (e.g. "01", "1", "bg_01.jpg", "01_...jpg")
  const numMatch = decoded.match(/(\d+)/);
  if (numMatch) {
    const targetNum = parseInt(numMatch[1], 10);
    const allFiles = getBackgroundFilesSorted();
    const matchedFile = allFiles.find((f) => parseInt(f, 10) === targetNum) || allFiles[targetNum - 1];
    if (matchedFile) {
      const fullPath = path.join(bgDir, matchedFile);
      if (fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(fullPath);
      }
    }
  }

  return res.status(404).send('Background not found');
});

// 2. API endpoint to list all backgrounds dynamically if needed
app.get('/api/backgrounds', (req, res) => {
  const files = getBackgroundFilesSorted();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ count: files.length, files });
});

// 3. Serve sw.js as self-unregistering cleanup worker with zero cache
app.get(['/sw.js', '/Refa3y/sw.js'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// 4. Serve static files from root directory
app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['html', 'htm'],
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 5. Root handler for index.html with strict anti-caching headers
app.get(['/', '/index.html', '/Refa3y', '/Refa3y/', '/Refa3y/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. Fallback: return 404 for missing media assets, index.html for navigation
app.use((req, res) => {
  if (req.path.match(/\.(jpg|jpeg|png|webp|svg|gif|mp3|mp4|m4a|wav|json|css|js|ico|apk)$/i)) {
    return res.status(404).send('Asset not found');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
