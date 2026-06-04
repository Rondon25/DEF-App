/**
 * DEF Platform — WhatsApp Gateway (whatsapp-web.js)
 * --------------------------------------------------
 * Run: node index.js
 * Then open http://localhost:8002/qr and scan with WhatsApp
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');

const PORT    = parseInt(process.env.PORT || '8003');
const API_KEY = process.env.WHATSAPP_API_KEY || 'def_mobile_wa_secret';

// ── Express server ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Public routes — no auth needed
const PUBLIC_PATHS = ['/qr', '/api/qrCode', '/api/isConnected', '/health'];

app.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) return next();
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── State ─────────────────────────────────────────────────────────────────────
let waClient   = null;
let qrDataUrl  = null;   // base64 PNG for the browser
let connected  = false;

// ── QR viewer page ────────────────────────────────────────────────────────────
app.get('/qr', (req, res) => {
  if (connected) {
    return res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2 style="color:#16A34A">✅ WhatsApp Connected</h2>
      <p>Your session is active. You can close this page.</p>
    </body></html>`);
  }
  if (!qrDataUrl) {
    return res.send(`<!DOCTYPE html><html>
      <head><meta http-equiv="refresh" content="3"></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>⏳ Generating QR code...</h2>
        <p>Page refreshes automatically every 3 seconds.</p>
      </body></html>`);
  }
  res.send(`<!DOCTYPE html><html>
    <head><meta http-equiv="refresh" content="25"></head>
    <body style="font-family:sans-serif;text-align:center;padding:40px;background:#f4f6fa">
      <h2 style="color:#1B3A6B">Scan with WhatsApp</h2>
      <p style="color:#64748b">WhatsApp → Settings → Linked Devices → Link a Device</p>
      <img src="${qrDataUrl}" style="width:280px;height:280px;border:4px solid #2563eb;border-radius:12px;margin:20px auto;display:block" />
      <p style="color:#94a3b8;font-size:13px">Page refreshes every 25 seconds</p>
    </body></html>`);
});

app.get('/api/qrCode', (req, res) => {
  if (connected) return res.json({ connected: true, message: 'Already connected' });
  if (!qrDataUrl)  return res.status(503).json({ error: 'QR not ready yet' });
  res.json({ qrCode: qrDataUrl });
});

app.get('/api/isConnected', (req, res) => {
  res.json({ connected, status: connected ? 'connected' : 'disconnected' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, connected });
});

// ── Send a text message ───────────────────────────────────────────────────────
app.post('/api/sendText', async (req, res) => {
  const { chatId, text } = req.body;
  if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
  if (!waClient || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
  try {
    await waClient.sendMessage(chatId, text);
    console.log(`[WA] ✓ Message sent to ${chatId}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[WA] Send error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[WA] REST server listening on http://localhost:${PORT}`);
  console.log(`[WA] Open http://localhost:${PORT}/qr to scan the QR code`);
});

// ── WhatsApp client ───────────────────────────────────────────────────────────
waClient = new Client({
  authStrategy: new LocalAuth({ clientId: 'DEF_PLATFORM', dataPath: './session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

waClient.on('qr', async (qr) => {
  console.log('[WA] QR code received — open http://localhost:' + PORT + '/qr to scan');
  // Convert to image data URL so browser can display it
  qrDataUrl = await qrcode.toDataURL(qr);
});

waClient.on('authenticated', () => {
  console.log('[WA] ✓ Authenticated');
});

waClient.on('ready', () => {
  connected  = true;
  qrDataUrl  = null;
  console.log('[WA] ✅ WhatsApp client is ready and connected!');
});

waClient.on('disconnected', (reason) => {
  connected = false;
  console.log('[WA] Disconnected:', reason);
});

waClient.on('message', async (msg) => {
  if (msg.body && msg.body.toLowerCase() === 'order status') {
    await msg.reply('📦 To check your order status, visit:\nhttp://localhost:5173/client/orders');
  }
});

waClient.initialize();
