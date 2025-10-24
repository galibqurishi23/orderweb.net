# Loyalty Points Live Updates Implementation

## Overview
This document describes the implementation of real-time loyalty points synchronization across all admin interfaces. Points now update instantly when redeemed or added, with no reliance on cookies, localStorage, or cached API responses.

## Implementation Date
October 18, 2025

## Problem Solved
Previously, when admin staff redeemed loyalty points via POS, the admin customers page showed stale data. Points only updated after a full page refresh, causing confusion and potential double-redemptions.

## Solution Architecture

### 1. WebSocket Broadcasting (Primary)
**Event**: `loyalty_updated`
**Trigger**: After successful DB commit in redemption/add points operations
**Payload**:
```json
{
  "type": "loyalty_updated",
  "tenant": "tenant-id",
  "timestamp": "2025-10-18T15:00:00.000Z",
  "data": {
    "customerId": "uuid",
    "customerPhone": "+447306506797",
    "customerName": "John Doe",
    "pointsChange": -75,
    "newBalance": 200,
    "totalPointsEarned": 1225,
    "totalPointsRedeemed": 1025,
    "transactionType": "redeem",
    "reason": "Redeemed for order #12345",
    "orderId": "order-uuid"
  }
}
```

### 2. Cache Prevention
**Implementation**:
- Added `Cache-Control: no-store, no-cache, must-revalidate, private` headers to all loyalty API responses
- Added `Pragma: no-cache` and `Expires: 0` for legacy browser support
- Removed any localStorage/cookie storage of points balance

**Affected Endpoints**:
- `/api/loyalty/phone-lookup` (GET)
- `/api/admin/customers` (GET)
- `/api/customer/loyalty/redeem` (POST/PUT)

### 3. Polling Fallback
**Trigger**: When WebSocket disconnects or fails to connect
**Interval**: 15 seconds
**Implementation**: Automatic full customer list refresh when offline

### 4. Manual Refresh
**Location**: Admin customers page header
**Button**: "Refresh" with icon indicator
**Shows**: Live status (● Live / ○ Offline)

## Files Modified

### Backend (Server Broadcast)
1. **`/src/app/api/customer/loyalty/redeem/route.ts`**
   - Added `broadcastLoyaltyUpdate()` call after transaction commit
   - Broadcasts redemption events with full customer loyalty data

2. **`/src/app/api/loyalty/phone-lookup/route.ts`**
   - Added broadcasts for both `add` and `redeem` actions
   - Added `Cache-Control: no-store` headers to GET responses

3. **`/src/app/api/admin/customers/route.ts`**
   - Added `Cache-Control: no-store` headers to customer list responses

4. **`/src/lib/websocket-broadcaster.ts`**
   - Already had `broadcastLoyaltyUpdate()` function (reused)
   - Sends POST to WebSocket server `/broadcast` endpoint

### Frontend (Client Listener)
5. **`/src/app/[tenant]/admin/customers/page.tsx`**
   - Added socket.io-client import and WebSocket connection
   - Listens to `loyalty_updated` events
   - Updates customer list in real-time (in-place state update)
   - Updates selected customer in loyalty dialog
   - Added polling fallback (15s when WS offline)
   - Added manual refresh button with live indicator
   - Shows connection status: ● Live or ○ Offline

## Event Flow

### Redemption Flow (Example)
1. Admin opens POS loyalty page (`/[tenant]/admin/phone-loyalty-pos`)
2. Admin enters phone, looks up customer (points_balance: 275)
3. Admin redeems 75 points for an order
4. **Server Side**:
   - Validates redemption
   - Begins transaction
   - Updates `customer_loyalty_points` SET points_balance = 200
   - Inserts into `phone_loyalty_transactions`
   - Commits transaction
   - Calls `broadcastLoyaltyUpdate(tenantId, { customerId, newBalance: 200, ... })`
   - WebSocket server sends event to all tenant clients
5. **Client Side** (Admin Customers Page):
   - Receives `loyalty_updated` event via WebSocket
   - Checks if event matches current tenant
   - Updates customer in local state array (points_balance: 200)
   - If customer dialog open, updates selectedCustomer state
   - UI reflects new balance immediately (no refresh needed)
6. Admin on customers page sees updated points (200) in real-time

### Add Points Flow
Same as above, but `pointsChange` is positive and `transactionType: 'add'`

## Reliability Features

### Idempotency
- Events include `timestamp` and can include `transactionId`
- Clients can compare timestamps to ignore stale events (not yet implemented, but structure supports it)

### Reconnection
- Socket.io auto-reconnects on disconnect
- On reconnect, clients rejoin tenant room
- Polling fallback runs during disconnect

### Error Handling
- Failed broadcasts are logged but don't block API response
- Clients gracefully handle WebSocket failures with polling

### Multi-Instance Safety
- WebSocket server runs as separate PM2 process
- API routes POST to WebSocket server HTTP endpoint
- WebSocket server broadcasts to all connected clients
- Tenant-scoped rooms prevent cross-tenant leakage

## Configuration

### WebSocket Server
- **URL**: `http://localhost:9011` (configurable via `WS_SERVER_URL` env var)
- **Broadcast Endpoint**: `POST /broadcast`
- **Client Path**: `/socket.io`

### Polling Interval
- **Default**: 15 seconds when WebSocket offline
- **Can be adjusted** in `useEffect` polling logic (line ~185 in customers page)

## Testing Checklist

### Manual Tests
- [x] Build completed successfully
- [x] Application restarted and online (port 9010)
- [ ] Redeem points in POS → Customer list updates immediately
- [ ] Add points in POS → Customer list updates immediately  
- [ ] Refresh customer page → Points persist correctly from DB
- [ ] Simulate WS disconnect → Polling fallback activates (15s)
- [ ] Manual refresh button works
- [ ] Live indicator shows ● Live when connected
- [ ] Live indicator shows ○ Offline when disconnected

### Edge Cases to Test
- [ ] Multiple admins open → Both see updates in real-time
- [ ] Customer detail dialog open → Dialog updates on redemption
- [ ] Rapid redemptions → No race conditions or stale data
- [ ] Large customer list (100+) → Updates are performant

## Performance Considerations

### Scalability
- **WebSocket broadcast**: Only sends ~200 bytes per event
- **Tenant-scoped**: Only clients in tenant room receive events
- **In-place updates**: React state updates single customer object (no full re-render)
- **Polling fallback**: Only when offline (rare), 15s interval is gentle

### Optimizations
- Events include only changed data (customer ID + new balances)
- Client performs shallow merge (preserves existing customer fields)
- No full API refetch unless manually triggered

## Security Notes

### Authorization
- WebSocket connections should verify tenant membership (future enhancement)
- API endpoints already verify admin auth tokens
- Tenant ID included in event; clients filter by their tenant

### Data Validation
- Server validates all redemption/add operations before broadcast
- DB transaction ensures consistency
- Broadcast only occurs AFTER successful commit

## Future Enhancements

### Recommended
1. **Add transaction ID** to events for deduplication
2. **Timestamp comparison** to ignore out-of-order events
3. **Auth tokens** for WebSocket connections
4. **Event replay** on reconnect (send last N events to new clients)
5. **Admin activity log** showing who redeemed points and when

### Optional
1. **Toast notifications** when remote updates occur ("Customer points updated by Admin A")
2. **Conflict resolution** if two admins edit same customer simultaneously
3. **WebSocket heartbeat** with automatic reconnect strategy
4. **Metrics/monitoring** for broadcast delivery rates

## Deployment Notes

### Build Command
```bash
npm run build
```

### Restart Command
```bash
pm2 restart ecosystem.config.json --update-env
```

### Verification
```bash
# Check application
curl -I http://localhost:9010

# Check PM2 status
pm2 status

# Monitor logs
pm2 logs orderweb-restaurant --lines 50
```

## Support & Troubleshooting

### Issue: Points not updating in real-time
**Check**:
1. Is WebSocket server running? `pm2 status | grep websocket`
2. Browser console: Are `loyalty_updated` events received?
3. Check tenant ID matches in event payload
4. Verify broadcast call exists after DB commit in API routes

### Issue: Polling not activating when offline
**Check**:
1. Browser console: Does it show "WebSocket offline - starting polling fallback"?
2. Check `wsConnected` state is false
3. Verify useEffect dependencies include `wsConnected`

### Issue: Cache still present
**Check**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Verify API response headers include `Cache-Control: no-store`
3. Check no service worker is caching responses

## Conclusion

The loyalty system now operates with **true real-time synchronization**. No cookies, no localStorage, no stale cached responses. When points are redeemed or added, all connected admin interfaces see the change immediately, backed by database persistence and a robust fallback mechanism.

**Status**: ✅ Implementation Complete  
**Deployed**: October 18, 2025  
**Next Step**: Manual smoke testing with live admin sessions

---
**Document Version**: 1.0  
**Last Updated**: October 18, 2025  
**Author**: Development Team
