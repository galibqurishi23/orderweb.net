const WebSocket = require('ws');
const http = require('http');
const mysql = require('mysql2/promise');
const url = require('url');

// Load environment variables
require('dotenv').config();

// WebSocket connections map: tenant -> Set of WebSocket connections
const connections = new Map();

// Database connection pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const mainPool = mysql.createPool({
  ...dbConfig,
  database: 'dinedesk_db'
});

// Validate API key for tenant
async function validateApiKey(tenant, apiKey) {
  if (!apiKey) {
    console.log(`[Auth] No API key provided for tenant: ${tenant}`);
    return false;
  }
  
  try {
    const [rows] = await mainPool.execute(
      'SELECT id, name FROM tenants WHERE slug = ? AND pos_api_key = ?',
      [tenant, apiKey]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(`[Auth] ✓ Valid API key for tenant: ${tenant} (${rows[0].name})`);
      return true;
    }
    
    console.log(`[Auth] ✗ Invalid API key for tenant: ${tenant}`);
    return false;
  } catch (error) {
    console.error(`[Auth] Error validating API key for ${tenant}:`, error.message);
    return false;
  }
}

// Get tenant database name
function getTenantDatabase(tenant) {
  return `dinedesk_${tenant}`;
}

// Broadcast event to all connected clients for a tenant
function broadcastToTenant(tenant, event) {
  const tenantConnections = connections.get(tenant);
  
  if (!tenantConnections || tenantConnections.size === 0) {
    console.log(`[Broadcast] No connections for tenant: ${tenant}`);
    return;
  }
  
  const message = JSON.stringify(event);
  let successCount = 0;
  let failCount = 0;
  
  tenantConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        successCount++;
      } catch (error) {
        console.error(`[Broadcast] Error sending to client:`, error.message);
        failCount++;
      }
    } else {
      failCount++;
    }
  });
  
  console.log(`[Broadcast] Event '${event.type}' sent to ${successCount} clients for tenant: ${tenant} (${failCount} failed)`);
}

// Log sync event to database
async function logSyncEvent(tenant, eventType, data, status = 'success') {
  try {
    const tenantDb = getTenantDatabase(tenant);
    const connection = await mysql.createConnection({
      ...dbConfig,
      database: tenantDb
    });
    
    await connection.execute(`
      INSERT INTO pos_sync_logs (
        event_type,
        event_data,
        status,
        created_at
      ) VALUES (?, ?, ?, NOW())
    `, [
      eventType,
      JSON.stringify(data),
      status
    ]);
    
    await connection.end();
    console.log(`[Log] Sync event logged: ${eventType} for tenant: ${tenant}`);
  } catch (error) {
    console.error(`[Log] Error logging sync event for ${tenant}:`, error.message);
  }
}

// Handle WebSocket connection
function handleConnection(ws, tenant, apiKey) {
  console.log(`[Connection] New WebSocket connection for tenant: ${tenant}`);
  
  // Add to connections map
  if (!connections.has(tenant)) {
    connections.set(tenant, new Set());
  }
  connections.get(tenant).add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    tenant: tenant,
    message: 'Connected to POS WebSocket',
    timestamp: new Date().toISOString()
  }));
  
  // Handle incoming messages from POS
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[Message] Received from ${tenant}:`, message.type);
      
      // Handle ping/pong for connection keepalive
      if (message.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      // Log the received message
      await logSyncEvent(tenant, `pos_${message.type}`, message, 'received');
      
    } catch (error) {
      console.error(`[Message] Error parsing message from ${tenant}:`, error.message);
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log(`[Connection] WebSocket closed for tenant: ${tenant}`);
    const tenantConnections = connections.get(tenant);
    if (tenantConnections) {
      tenantConnections.delete(ws);
      if (tenantConnections.size === 0) {
        connections.delete(tenant);
        console.log(`[Connection] No more connections for tenant: ${tenant}`);
      }
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`[Connection] WebSocket error for ${tenant}:`, error.message);
  });
}

// Create WebSocket server
function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    noServer: true
    // No path restriction - we handle path validation in the upgrade event
  });
  
  // Handle upgrade requests
  server.on('upgrade', async (request, socket, head) => {
    try {
      const pathname = url.parse(request.url).pathname;
      
      // Check if this is a POS WebSocket request
      if (!pathname || !pathname.startsWith('/ws/pos/')) {
        console.log(`[Upgrade] Invalid path: ${pathname}`);
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Extract tenant from path: /ws/pos/{tenant}
      const pathParts = pathname.split('/');
      const tenant = pathParts[3];
      
      if (!tenant) {
        console.log('[Upgrade] No tenant specified in path');
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Get API key from headers
      const apiKey = request.headers['x-api-key'];
      
      if (!apiKey) {
        console.log(`[Upgrade] No API key provided for tenant: ${tenant}`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Validate API key
      const isValid = await validateApiKey(tenant, apiKey);
      
      if (!isValid) {
        console.log(`[Upgrade] Invalid API key for tenant: ${tenant}`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      console.log(`[Upgrade] ✓ Upgrading connection for tenant: ${tenant}`);
      
      // Upgrade the connection
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log(`[Upgrade] ✓ Upgrade successful, initializing connection`);
        handleConnection(ws, tenant, apiKey);
      });
      
    } catch (error) {
      console.error('[Upgrade] Error handling upgrade:', error.message);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });
  
  console.log('[WebSocket] Server initialized');
  return wss;
}

// Export functions for use by Next.js API routes
module.exports = {
  createWebSocketServer,
  broadcastToTenant,
  logSyncEvent,
  connections
};

// Only start standalone server if run directly
if (require.main === module) {
  const PORT = process.env.WS_PORT || 9011;
  
  // Create HTTP server with broadcast endpoint
  const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'WebSocket Server',
        connections: Array.from(connections.keys()).map(tenant => ({
          tenant,
          count: connections.get(tenant)?.size || 0
        })),
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
          
          // Broadcast to all connected clients for this tenant
          broadcastToTenant(tenant, event);
          
          console.log(`[Broadcast] Event "${event.type}" sent to tenant: ${tenant}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: `Event broadcasted to ${tenant}`,
            connections: connections.get(tenant)?.size || 0
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
    
    // Default response for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  createWebSocketServer(server);
  
  server.listen(PORT, () => {
    console.log(`[Server] WebSocket server running on port ${PORT}`);
    console.log(`[Server] Connect using: ws://localhost:${PORT}/ws/pos/{tenant}`);
    console.log(`[Server] Production: wss://orderweb.net/ws/pos/{tenant}`);
    console.log(`[Server] Broadcast endpoint: http://localhost:${PORT}/broadcast`);
  });
}
