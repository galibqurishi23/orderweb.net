# POS Integration Guide - WebSocket + REST API

## Overview

This POS integration system allows local Point-of-Sale (POS) systems to communicate with the cloud-based OrderWeb platform using a hybrid WebSocket + REST API architecture.

### Architecture

- **WebSocket**: Real-time push notifications for new orders, gift cards, and loyalty updates (0.1s latency)
- **REST API**: Backup polling and transaction operations (2-4s latency)
- **Port**: 9010 (same as Next.js application)
- **Protocol**: WSS (WebSocket Secure) in production, WS for local testing

---

## WebSocket Connection

### Connection URL Pattern
```
Production: wss://orderweb.net/ws/pos/{tenant}
Local Dev:  ws://localhost:9010/ws/pos/{tenant}
```

### Authentication
- Header: `X-API-Key: your-api-key-here`
- The API key is validated against the `dinedesk_main.tenants` table
- Connection is rejected if API key is invalid

### Events Received (Server → POS)

#### 1. Connected Event
```json
{
  "type": "connected",
  "tenant": "kitchen",
  "message": "Connected to POS WebSocket",
  "timestamp": "2025-10-10T21:57:55.123Z"
}
```

#### 2. New Order Event (Online Orders Only)
```json
{
  "type": "new_order",
  "tenant": "kitchen",
  "timestamp": "2025-10-10T22:00:00.123Z",
  "data": {
    "orderId": 12345,
    "orderNumber": "ORD-12345",
    "customerName": "John Doe",
    "customerPhone": "+1234567890",
    "orderType": "delivery",
    "orderSource": "online",
    "status": "pending",
    "totalAmount": 45.99,
    "items": [...],
    "specialInstructions": "No onions",
    "scheduledFor": null,
    "createdAt": "2025-10-10T22:00:00Z"
  }
}
```

#### 3. Order Updated Event
```json
{
  "type": "order_updated",
  "tenant": "kitchen",
  "timestamp": "2025-10-10T22:05:00.123Z",
  "data": {
    "orderId": 12345,
    "orderNumber": "ORD-12345",
    "status": "preparing",
    "previousStatus": "pending",
    "updatedAt": "2025-10-10T22:05:00Z"
  }
}
```

#### 4. Gift Card Purchased Event
```json
{
  "type": "gift_card_purchased",
  "tenant": "kitchen",
  "timestamp": "2025-10-10T22:10:00.123Z",
  "data": {
    "cardNumber": "GC-1234567890",
    "initialBalance": 100.00,
    "currentBalance": 100.00,
    "purchasedBy": "Jane Smith",
    "recipientName": "John Doe",
    "recipientEmail": "john@example.com",
    "expiryDate": "2026-10-10",
    "purchasedAt": "2025-10-10T22:10:00Z"
  }
}
```

#### 5. Loyalty Points Updated Event
```json
{
  "type": "loyalty_updated",
  "tenant": "kitchen",
  "timestamp": "2025-10-10T22:15:00.123Z",
  "data": {
    "customerId": 456,
    "customerPhone": "+1234567890",
    "pointsChange": 50,
    "newBalance": 250,
    "transactionType": "add",
    "reason": "Purchase order #ORD-12345",
    "updatedAt": "2025-10-10T22:15:00Z"
  }
}
```

### Events Sent (POS → Server)

#### Ping/Pong (Keep-Alive)
```json
// Send ping every 30 seconds
{
  "type": "ping",
  "timestamp": "2025-10-10T22:20:00.123Z"
}

// Receive pong response
{
  "type": "pong",
  "timestamp": "2025-10-10T22:20:00.123Z"
}
```

---

## REST API Endpoints

All endpoints require authentication headers:
- `X-API-Key`: Your POS API key
- `X-Tenant-ID`: Your tenant slug (must match URL)

Base URL: `https://orderweb.net/api/{tenant}`

### 1. Health Check
```
GET /api/{tenant}/health
```

**Response:**
```json
{
  "status": "ok",
  "tenant": "kitchen",
  "timestamp": "2025-10-10T22:00:00.123Z",
  "version": "1.0.0"
}
```

---

### 2. Get Pending Orders
```
GET /api/{tenant}/orders/pending
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 12345,
      "orderNumber": "ORD-12345",
      "customerName": "John Doe",
      "customerPhone": "+1234567890",
      "orderType": "delivery",
      "orderSource": "online",
      "status": "pending",
      "totalAmount": 45.99,
      "items": [...],
      "createdAt": "2025-10-10T22:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 3. Check Gift Card Balance
```
GET /api/{tenant}/gift-cards/{cardNumber}/balance
```

**Response:**
```json
{
  "success": true,
  "cardNumber": "GC-1234567890",
  "balance": 85.50,
  "status": "active",
  "expiryDate": "2026-10-10"
}
```

---

### 4. Deduct from Gift Card
```
POST /api/{tenant}/gift-cards/{cardNumber}/deduct
Content-Type: application/json

{
  "amount": 25.00,
  "orderId": 12345,
  "notes": "Payment for Order #ORD-12345"
}
```

**Response:**
```json
{
  "success": true,
  "previousBalance": 85.50,
  "amountDeducted": 25.00,
  "newBalance": 60.50,
  "transactionId": 789
}
```

---

### 5. Check Loyalty Points
```
GET /api/{tenant}/loyalty/{phone}/points
```

**Response:**
```json
{
  "success": true,
  "customerId": 456,
  "phone": "+1234567890",
  "name": "John Doe",
  "loyaltyPoints": 250,
  "totalSpent": 1250.00,
  "recentTransactions": [...]
}
```

---

### 6. Add Loyalty Points
```
POST /api/{tenant}/loyalty/{phone}/add
Content-Type: application/json

{
  "points": 50,
  "orderId": 12345,
  "reason": "Purchase order #ORD-12345"
}
```

**Response:**
```json
{
  "success": true,
  "customerId": 456,
  "previousPoints": 250,
  "pointsAdded": 50,
  "newPoints": 300
}
```

---

### 7. Redeem Loyalty Points
```
POST /api/{tenant}/loyalty/{phone}/redeem
Content-Type: application/json

{
  "points": 100,
  "orderId": 12345,
  "reason": "Discount on order #ORD-12345"
}
```

**Response:**
```json
{
  "success": true,
  "customerId": 456,
  "previousPoints": 300,
  "pointsRedeemed": 100,
  "newPoints": 200
}
```

---

### 8. Upload Daily Report
```
POST /api/{tenant}/reports/daily
Content-Type: application/json

{
  "reportDate": "2025-10-10",
  "totalSales": 1250.50,
  "totalOrders": 45,
  "cashSales": 300.00,
  "cardSales": 800.50,
  "giftCardSales": 150.00,
  "onlineSales": 450.00,
  "discounts": 50.00,
  "refunds": 25.00,
  "netSales": 1175.50,
  "topItems": [
    {"name": "Pizza", "quantity": 25, "revenue": 500.00},
    {"name": "Burger", "quantity": 20, "revenue": 350.00}
  ],
  "busyHours": {
    "12:00": 8,
    "13:00": 12,
    "18:00": 15
  },
  "staffShifts": [
    {"staff": "John", "hours": 8, "role": "Chef"},
    {"staff": "Jane", "hours": 8, "role": "Server"}
  ],
  "notes": "Busy Friday night"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Daily report uploaded successfully",
  "data": {
    "reportDate": "2025-10-10",
    "totalSales": 1250.50,
    "totalOrders": 45,
    "created": true
  }
}
```

---

## Database Tables

### pos_gift_card_transactions
Logs all gift card transactions from POS.

### pos_loyalty_transactions
Logs all loyalty point transactions from POS.

### pos_daily_reports
Stores daily sales reports uploaded from POS.

### pos_sync_logs
Logs all WebSocket events for debugging and monitoring.

---

## Testing

### Test WebSocket Connection
```bash
cd /home/opc/orderweb-app
node test-websocket-client.js
```

Edit the file to set your tenant slug and API key before running.

### Test REST API
```bash
# Health check
curl -H "X-API-Key: your-api-key" \
     -H "X-Tenant-ID: kitchen" \
     https://orderweb.net/api/kitchen/health

# Get pending orders
curl -H "X-API-Key: your-api-key" \
     -H "X-Tenant-ID: kitchen" \
     https://orderweb.net/api/kitchen/orders/pending

# Check gift card balance
curl -H "X-API-Key: your-api-key" \
     -H "X-Tenant-ID: kitchen" \
     https://orderweb.net/api/kitchen/gift-cards/GC-1234567890/balance
```

---

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (tenant ID mismatch)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### WebSocket Close Codes
- `1000` - Normal closure
- `1001` - Going away
- `1002` - Protocol error
- `1003` - Unsupported data
- `1008` - Policy violation (auth failed)

---

## Important Notes

1. **Online Orders Only**: WebSocket events are only sent for orders with `orderSource = 'online'`. Walk-in POS orders are not broadcasted.

2. **Keep-Alive**: Send ping messages every 30 seconds to maintain the WebSocket connection.

3. **Reconnection**: Implement automatic reconnection in your POS client with exponential backoff.

4. **Transaction Logging**: All operations are logged to `pos_*_transactions` tables for audit trails.

5. **API Key Security**: Store API keys securely in your POS system. Never expose them in client-side code.

6. **Rate Limiting**: Currently no rate limiting, but may be added in future versions.

---

## Support

For issues or questions, contact the OrderWeb development team.

**Version**: 1.0.0  
**Last Updated**: October 10, 2025
