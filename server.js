import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Disable etag caching for HTML to force instant live updates
app.set('etag', false);

// Explicitly serve backgrounds directory with 1 hour caching
app.use('/backgrounds', express.static(path.join(__dirname, 'backgrounds'), {
  etag: true,
  maxAge: '1h',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Serve sw.js with strictly no cache
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve static files from root directory with no-cache for HTML
app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['html', 'htm'],
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Root handler for index.html with strict anti-caching headers
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for media files (404) vs SPA routing (index.html)
app.use((req, res) => {
  if (req.path.match(/\.(jpg|jpeg|png|webp|svg|gif|mp3|mp4|m4a|wav|json|css|js)$/i)) {
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
