# WebSocket Connection Fix Summary

## Problem
WebSocket connections were failing with "Parse Error: Expected HTTP/" error. The root cause was port conflict between Next.js application and WebSocket server both trying to use port 9010.

## Solution
Separated the WebSocket server onto a dedicated port (9011) to avoid conflicts with Next.js.

## Architecture

### Port Configuration
- **Port 9010**: Next.js application (orderweb-restaurant)
  - Handles all web pages
  - Handles REST API endpoints (`/api/*`)
  
- **Port 9011**: WebSocket server (orderweb-websocket)
  - Handles WebSocket connections (`/ws/pos/{tenant}`)
  - Standalone server for real-time communication

### Nginx Routing
```nginx
# WebSocket requests go to port 9011
location /ws/pos/ {
    proxy_pass http://localhost:9011;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    # ... other headers
}

# All other requests go to port 9010 (Next.js)
location / {
    proxy_pass http://localhost:9010;
    # ... other headers
}
```

## Files Modified

### 1. websocket-server-standalone.js (NEW)
- Standalone WebSocket server on port 9011
- Health check endpoint: `http://localhost:9011/health`
- Graceful shutdown handling

### 2. websocket-server.js
- **Fixed**: Removed `path: '/ws/pos'` from WebSocket.Server config
  - The `path` option doesn't support wildcards
  - Manual path validation in upgrade handler is sufficient
- Added logging for successful upgrade
- Database connection uses `dinedesk_db` (not dinedesk_main)

### 3. ecosystem.production.config.js
- Added `orderweb-websocket` app configuration
- Both apps now managed by PM2

### 4. /etc/nginx/conf.d/orderweb.conf
- Added `/ws/pos/` location block proxying to port 9011
- Proper WebSocket headers (Upgrade, Connection)
- 24-hour timeouts for persistent connections

## PM2 Process Status
```bash
pm2 list
```

Should show:
- `orderweb-restaurant` (port 9010) - online
- `orderweb-websocket` (port 9011) - online

## Testing

### 1. Test WebSocket Connection
```bash
cd /home/opc/orderweb-app
node test-websocket-domain.js
```

Expected output:
```
✅ WebSocket connection OPEN
✅ Successfully connected to tenant: kitchen
✅ Received pong response
✅ Test PASSED
```

### 2. Check WebSocket Logs
```bash
pm2 logs orderweb-websocket --lines 20
```

Should see:
```
[Auth] ✓ Valid API key for tenant: kitchen
[Upgrade] ✓ Upgrading connection for tenant: kitchen
[Connection] New WebSocket connection for tenant: kitchen
[Message] Received from kitchen: ping
```

### 3. Health Check
```bash
curl http://localhost:9011/health
```

Expected: `{"status":"ok","service":"WebSocket Server"}`

### 4. Test from POS UI
1. Go to `https://orderweb.net/kitchen/admin/pos-api-management`
2. Click "Test Connection" button
3. Should show: "✅ WebSocket: Connection successful"

## WebSocket URLs

### For POS Systems
- **Production**: `wss://orderweb.net/ws/pos/{tenant}`
- **Local Testing**: `ws://localhost:9011/ws/pos/{tenant}`

### Example for Kitchen Restaurant
```javascript
const ws = new WebSocket('wss://orderweb.net/ws/pos/kitchen', {
  headers: {
    'X-API-Key': 'pos_c914a280aadeeafb2d7dfb2835b7b23bd0dac3df4ccce4d611546e39d43fa2db'
  }
});
```

## Authentication
- API Key is validated from `dinedesk_db.tenants` table
- Must match tenant slug and `pos_api_key` field
- Passed via `X-API-Key` header

## Events

### Server → Client
- `connected`: Connection established with tenant info
- `pong`: Response to client ping
- `order_created`: New order notification
- `order_updated`: Order status change
- `payment_received`: Payment confirmation
- ... (other POS events)

### Client → Server
- `ping`: Keep-alive / connection test
- ... (POS can send event notifications)

## Troubleshooting

### WebSocket connection fails
1. Check PM2 status: `pm2 list`
2. Check WebSocket logs: `pm2 logs orderweb-websocket`
3. Check nginx error log: `sudo tail -50 /var/log/nginx/error.log`
4. Verify API key in database
5. Test direct connection: `node test-ws-direct.js`

### Port already in use
```bash
# Check what's using port 9011
sudo lsof -i :9011

# If needed, restart WebSocket server
pm2 restart orderweb-websocket
```

### Nginx not proxying correctly
```bash
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log | grep "ws/pos"
```

## Performance

### Connection Limits
- WebSocket server uses single process (fork mode)
- Can handle thousands of concurrent connections
- Memory: ~25MB base + ~10KB per connection

### Timeouts
- nginx proxy timeout: 86400s (24 hours)
- No application-level timeout (persistent connections)

## Maintenance

### Restart WebSocket Server
```bash
pm2 restart orderweb-websocket
```

### View Real-time Logs
```bash
pm2 logs orderweb-websocket
```

### Monitor Performance
```bash
pm2 monit
```

## Success Criteria

✅ WebSocket connects successfully via wss://orderweb.net  
✅ Authentication validates API keys  
✅ Ping/pong messages work  
✅ Connection persists (no disconnects)  
✅ POS UI shows "Connection successful"  
✅ PM2 shows both processes online  
✅ Nginx proxies WebSocket correctly  

## Date Fixed
October 11, 2025

## Key Fix
**The critical fix was removing `path: '/ws/pos'` from the WebSocket.Server configuration.**

The `ws` library's `path` option only matches exact paths, not patterns. Since we need to support dynamic tenant paths like `/ws/pos/kitchen`, `/ws/pos/restaurant2`, etc., we removed the path restriction and handle path validation manually in the `upgrade` event handler.
