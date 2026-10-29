import express from 'express';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_BIN =
  process.env.PYTHON_BIN ||
  process.env.PYTHON_PATH ||
  (process.platform === 'win32' ? 'python' : 'python3');

const PYTHON_SCRIPT = path.join(__dirname, 'backend', 'main.py');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'products');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function runPythonSqliteQuery(action = '', payload = {}) {
  const { stdout } = await execFileAsync(
    PYTHON_BIN,
    [PYTHON_SCRIPT, '--cli', action, JSON.stringify(payload)],
    {
      maxBuffer: 15 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONWARNINGS: 'ignore',
      },
    }
  );
  const trimmed = stdout.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(trimmed);
}

function extractToken(req: any = { headers: {} }) {
  const authHeader = req.headers && req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') return '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

function sendResult(res: any, data: any) {
  if (data && data.error) {
    return res.status(data.status || 400).json({ error: data.error, detail: data.error });
  }
  return res.json(data);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Secure CORS configuration
  app.use((req, res, next) => {
    const allowedOrigin = process.env.CORS_ORIGIN || req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Increase JSON payload limit to 10MB for validated local image uploads
  app.use(express.json({ limit: '10mb' }));

  // Serve uploaded product images permanently from /uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Initialize & seed SQLite DB on startup
  try {
    await runPythonSqliteQuery('categories');
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
  }

  // ==========================================================================
  // PUBLIC STOREFRONT ENDPOINTS
  // ==========================================================================

  app.get('/api/store', async (_req, res) => {
    try {
      const data = await runPythonSqliteQuery('store');
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const data = await runPythonSqliteQuery('categories');
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const category_id = req.query.category_id ? Number(req.query.category_id) : null;
      const category_name = req.query.category_name ? String(req.query.category_name) : null;
      const search = req.query.search ? String(req.query.search) : null;
      const featured = req.query.featured === 'true' || req.query.featured === '1';
      const sort = req.query.sort ? String(req.query.sort) : 'default';

      const data = await runPythonSqliteQuery('products', {
        category_id,
        category_name,
        search,
        featured,
        sort,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product_id = Number(req.params.id);
      const data = await runPythonSqliteQuery('product_detail', { product_id });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const data = await runPythonSqliteQuery('create_order', req.body || {});
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  // ==========================================================================
  // AUTHENTICATION ENDPOINTS (SHARED CUSTOMER & ADMIN LOGIN)
  // ==========================================================================

  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = await runPythonSqliteQuery('auth_login', req.body || {});
      if (data && data.error) {
        return res.status(401).json({ detail: data.error, error: data.error });
      }
      return res.json(data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = await runPythonSqliteQuery('auth_register', req.body || {});
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('auth_me', { _token });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('auth_logout', { _token });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('auth_change_password', {
        ...(req.body || {}),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  // ==========================================================================
  // PROTECTED ADMIN ENDPOINTS
  // ==========================================================================

  app.get('/api/admin/overview', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_overview', {
        _token,
        range: req.query.range ? String(req.query.range) : '30d',
        start_date: req.query.start_date ? String(req.query.start_date) : null,
        end_date: req.query.end_date ? String(req.query.end_date) : null,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  // Local Product Image Upload (JPG, JPEG, PNG, WebP)
  app.post('/api/admin/upload-image', async (req, res) => {
    try {
      const _token = extractToken(req);
      const authCheck = await runPythonSqliteQuery('auth_me', { _token });
      if (!authCheck || !authCheck.user || authCheck.user.role !== 'admin') {
        return res
          .status(403)
          .json({
            detail: 'Access denied. Administrator privileges required.',
            error: 'Access denied. Administrator privileges required.',
          });
      }

      const { filename, content_type, data_base64 } = req.body || {};
      if (!data_base64 || typeof data_base64 !== 'string') {
        return res
          .status(400)
          .json({ detail: 'No image file data provided.', error: 'No image file data provided.' });
      }

      const allowedTypes = new Map([
        ['image/jpeg', '.jpg'],
        ['image/jpg', '.jpg'],
        ['image/png', '.png'],
        ['image/webp', '.webp'],
      ]);

      const mime = String(content_type || '').toLowerCase();
      if (!allowedTypes.has(mime)) {
        return res.status(400).json({
          detail: 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WebP image.',
          error: 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WebP image.',
        });
      }

      const cleanBase64 = data_base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const MAX_BYTES = 5 * 1024 * 1024; // 5MB
      if (buffer.length === 0 || buffer.length > MAX_BYTES) {
        return res.status(400).json({
          detail: 'Image file size must be between 1 byte and 5 MB.',
          error: 'Image file size must be between 1 byte and 5 MB.',
        });
      }

      // Verify binary magic bytes for security
      const isJpeg =
        buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng =
        buffer.length >= 4 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      const isWebp =
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP';

      if (!isJpeg && !isPng && !isWebp) {
        return res.status(400).json({
          detail: 'Invalid image binary header. Only genuine JPG, PNG, and WebP files are allowed.',
          error: 'Invalid image binary header. Only genuine JPG, PNG, and WebP files are allowed.',
        });
      }

      const ext = isPng ? '.png' : isWebp ? '.webp' : '.jpg';
      const safeBase = String(filename || 'product')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 32);
      const uniqueName = `${safeBase}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/products/${uniqueName}`;

      return res.json({
        success: true,
        image_url: publicUrl,
        filename: uniqueName,
        size: buffer.length,
      });
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.post('/api/admin/products', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_create_product', {
        ...(req.body || {}),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.put('/api/admin/products/:id', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_update_product', {
        ...(req.body || {}),
        product_id: Number(req.params.id),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.delete('/api/admin/products/:id', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_delete_product', {
        product_id: Number(req.params.id),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.patch('/api/admin/products/:id/stock', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_update_stock', {
        product_id: Number(req.params.id),
        available_stock: Number((req.body || {}).available_stock),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.put('/api/admin/settings/threshold', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_update_threshold', {
        low_stock_threshold: Number((req.body || {}).low_stock_threshold),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.get('/api/admin/orders', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_list_orders', {
        status: req.query.status ? String(req.query.status) : null,
        search: req.query.search ? String(req.query.search) : null,
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.patch('/api/admin/orders/:id/status', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_update_order_status', {
        order_id: Number(req.params.id),
        status: String((req.body || {}).status || ''),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.delete('/api/admin/orders/:id', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_delete_order', {
        order_id: Number(req.params.id),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_list_users', {
        search: req.query.search ? String(req.query.search) : null,
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  const handleUpdateUser = async (req: any, res: any) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_update_user', {
        ...(req.body || {}),
        user_id: Number(req.params.id),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  };

  app.patch('/api/admin/users/:id', handleUpdateUser);
  app.put('/api/admin/users/:id', handleUpdateUser);

  app.put('/api/admin/profile', async (req, res) => {
    try {
      const _token = extractToken(req);
      const data = await runPythonSqliteQuery('admin_update_profile', {
        ...(req.body || {}),
        _token,
      });
      sendResult(res, data);
    } catch (err) {
      res.status(500).json({ detail: String(err), error: String(err) });
    }
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found', detail: 'API endpoint not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://127.0.0.1:${PORT}/\n`);
  });
}

startServer();
