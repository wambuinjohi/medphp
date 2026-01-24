import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;
const distPath = join(__dirname, 'dist');

// Serve static files from dist directory
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: false,
  setHeaders: (res, path) => {
    // Don't cache index.html
    if (path.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Handle SPA routing - serve index.html for all non-static requests
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  
  // Check if the requested path looks like a static asset
  if (req.path.match(/\.[a-z0-9]+$/i)) {
    // It's a file with an extension, if it doesn't exist, let it 404
    return res.status(404).send('Not Found');
  }
  
  // Serve index.html for all routes (SPA routing)
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log(`🔀 SPA routing enabled - all non-static requests serve index.html`);
});
