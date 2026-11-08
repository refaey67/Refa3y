import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static files from root directory
app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['html', 'htm'],
  index: 'index.html',
  maxAge: '1d'
}));

// Explicitly serve backgrounds directory with proper caching
app.use('/backgrounds', express.static(path.join(__dirname, 'backgrounds'), {
  etag: true,
  maxAge: '1d'
}));

// Fallback to index.html for SPA routing (Express 5 compatible) - never return HTML for media assets
app.use((req, res) => {
  if (req.path.match(/\.(jpg|jpeg|png|webp|svg|gif|mp3|mp4|m4a|wav|json|css|js)$/i)) {
    return res.status(404).send('Asset not found');
  }
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
