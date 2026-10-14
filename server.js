const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const APP_RATINGS_FILE = path.join(DATA_DIR, 'app-ratings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS & No-Cache headers so the browser always gets the freshest updates
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL pathname
  let reqUrl = req.url.split('?')[0];

  // ========================================================
  // PERSISTENT REST API (Saves Directly to Disk)
  // ========================================================
  if (reqUrl.startsWith('/api/')) {
    if (reqUrl === '/api/products') {
      if (req.method === 'GET') {
        if (fs.existsSync(PRODUCTS_FILE)) {
          const content = fs.readFileSync(PRODUCTS_FILE, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(content);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('[]');
        }
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 50 * 1024 * 1024) { // 50MB max
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
          }
        });

        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed)) {
              fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
              console.log(`[Storage] Saved ${parsed.length} products to ${PRODUCTS_FILE}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: parsed.length, message: 'Products persisted to disk' }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Expected JSON array of products' }));
            }
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload', message: e.message }));
          }
        });
        return;
      }
    }

    if (reqUrl === '/api/orders') {
      if (req.method === 'GET') {
        if (fs.existsSync(ORDERS_FILE)) {
          const content = fs.readFileSync(ORDERS_FILE, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(content);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('[]');
        }
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 50 * 1024 * 1024) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
          }
        });

        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed)) {
              fs.writeFileSync(ORDERS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
              console.log(`[Storage] Saved ${parsed.length} orders to ${ORDERS_FILE}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: parsed.length, message: 'Orders persisted to disk' }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Expected JSON array of orders' }));
            }
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload', message: e.message }));
          }
        });
        return;
      }
    }

    if (reqUrl === '/api/app-ratings') {
      if (req.method === 'GET') {
        if (fs.existsSync(APP_RATINGS_FILE)) {
          const content = fs.readFileSync(APP_RATINGS_FILE, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(content);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('[]');
        }
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 50 * 1024 * 1024) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
          }
        });

        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            let ratingsArray = [];
            if (Array.isArray(parsed)) {
              ratingsArray = parsed;
            } else if (parsed && typeof parsed === 'object') {
              if (fs.existsSync(APP_RATINGS_FILE)) {
                try {
                  ratingsArray = JSON.parse(fs.readFileSync(APP_RATINGS_FILE, 'utf8')) || [];
                } catch (e) {
                  ratingsArray = [];
                }
              }
              ratingsArray.push(parsed);
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Expected JSON array or rating object' }));
              return;
            }

            fs.writeFileSync(APP_RATINGS_FILE, JSON.stringify(ratingsArray, null, 2), 'utf8');
            console.log(`[Storage] Saved ${ratingsArray.length} app ratings to ${APP_RATINGS_FILE}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: ratingsArray.length, message: 'App ratings persisted to disk' }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload', message: e.message }));
          }
        });
        return;
      }
    }

    if (reqUrl === '/api/debug-dump' && req.method === 'POST') {
      let b = '';
      req.on('data', c => b += c);
      req.on('end', () => {
        fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'debug_dump.json'), b, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    if (reqUrl === '/api/status') {
      let prodCount = 0;
      let orderCount = 0;
      let appRatingsCount = 0;
      try {
        if (fs.existsSync(PRODUCTS_FILE)) prodCount = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8')).length;
        if (fs.existsSync(ORDERS_FILE)) orderCount = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')).length;
        if (fs.existsSync(APP_RATINGS_FILE)) appRatingsCount = JSON.parse(fs.readFileSync(APP_RATINGS_FILE, 'utf8')).length;
      } catch (err) {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        storage: 'disk_persisted',
        productsFile: PRODUCTS_FILE,
        ordersFile: ORDERS_FILE,
        appRatingsFile: APP_RATINGS_FILE,
        productsCount: prodCount,
        ordersCount: orderCount,
        appRatingsCount: appRatingsCount
      }));
      return;
    }
  }

  // ========================================================
  // STATIC ASSETS SERVING
  // ========================================================
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  } else if (reqUrl === '/admin' || reqUrl === '/admin/') {
    reqUrl = '/admin.html';
  }

  // Safe file path resolution
  const decodedPath = decodeURIComponent(reqUrl);
  let filePath = path.join(ROOT_DIR, decodedPath);

  // Security: prevent directory traversal outside ROOT_DIR
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // If directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If .html extension was omitted
      if (!path.extname(filePath)) {
        const withHtml = filePath + '.html';
        if (fs.existsSync(withHtml) && fs.statSync(withHtml).isFile()) {
          filePath = withHtml;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 Not Found</h1><p>Requested file does not exist.</p><p><a href="/index.html">Return to Her Hampers</a></p>');
          return;
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>Requested file does not exist.</p><p><a href="/index.html">Return to Her Hampers</a></p>');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    });
  });
});

function getNetworkAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4 and non-internal only
      const familyV4 = typeof net.family === 'string' ? net.family === 'IPv4' : net.family === 4;
      if (familyV4 && !net.internal) {
        addresses.push({ name, ip: net.address });
      }
    }
  }
  return addresses;
}

server.listen(PORT, () => {
  const networkAddresses = getNetworkAddresses();
  console.log('='.repeat(60));
  console.log('  🎁 HER HAMPERS - SERVER RUNNING');
  console.log('='.repeat(60));
  console.log(`  Local:            http://localhost:${PORT}/`);
  console.log(`  Local Admin:      http://localhost:${PORT}/admin.html`);
  if (networkAddresses.length > 0) {
    console.log('  --- Wi-Fi / Local Network Links ---');
    networkAddresses.forEach(net => {
      console.log(`  Wi-Fi (${net.name}): http://${net.ip}:${PORT}/`);
      console.log(`  Admin (${net.name}): http://${net.ip}:${PORT}/admin.html`);
    });
  }
  console.log(`  Storage:          ${PRODUCTS_FILE}`);
  console.log('='.repeat(60));
  console.log('  Devices on the same Wi-Fi can open the Wi-Fi link above!');
  console.log('='.repeat(60));
});

