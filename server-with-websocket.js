// Load environment variables first
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createWebSocketServer } = require('./websocket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 9010;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server
  createWebSocketServer(server);
  console.log('[Next.js] WebSocket server integrated');

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`[Next.js] Server ready on http://${hostname}:${port}`);
    console.log(`[WebSocket] Ready on ws://${hostname}:${port}/ws/pos/{tenant}`);
    console.log(`[Production] wss://orderweb.net/ws/pos/{tenant}`);
  });
});
