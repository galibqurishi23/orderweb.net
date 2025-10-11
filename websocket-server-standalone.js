const http = require('http');
const { createWebSocketServer } = require('./websocket-server');

const PORT = process.env.WS_PORT || 9011;

// Create a simple HTTP server for WebSocket upgrades only
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'WebSocket Server',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Broadcast endpoint for triggering WebSocket events
  if (req.url === '/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { tenant, event } = JSON.parse(body);
        
        if (!tenant || !event) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Missing tenant or event' 
          }));
          return;
        }
        
        // Get the WebSocket module functions
        const { broadcastToTenant } = require('./websocket-server');
        
        // Broadcast to all connected clients for this tenant
        broadcastToTenant(tenant, event);
        
        console.log(`[Broadcast] Event "${event.type}" sent to tenant: ${tenant}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `Event broadcasted to ${tenant}` 
        }));
      } catch (error) {
        console.error('[Broadcast] Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
    return;
  }
  
  // All other HTTP requests return 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server - use ws:// protocol');
});

// Attach WebSocket server
createWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`[WebSocket] Standalone server running on port ${PORT}`);
  console.log(`[WebSocket] Local: ws://localhost:${PORT}/ws/pos/{tenant}`);
  console.log(`[WebSocket] Production: wss://orderweb.net/ws/pos/{tenant}`);
  console.log(`[Health] Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WebSocket] SIGTERM received, closing server...');
  server.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WebSocket] SIGINT received, closing server...');
  server.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});
