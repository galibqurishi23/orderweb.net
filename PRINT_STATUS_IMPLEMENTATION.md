# 🎯 Print Status Tracking - Implementation Complete

**Date:** November 21, 2025  
**Status:** ✅ Ready for Deployment

---

## 📋 What Was Implemented

### Phase 1: Core Functionality (COMPLETED)

#### 1. Database Migration ✅
**File:** `/database/migrations/add_print_status_tracking.sql`

Added columns to `orders` table:
- `print_status` - Tracks order through print lifecycle
- `print_status_updated_at` - Timestamp of status changes
- `last_pos_device_id` - Which POS device printed the order
- `last_print_error` - Error message if print failed
- `websocket_sent` - Whether WebSocket broadcast succeeded
- `websocket_sent_at` - When WebSocket was sent

**Print Status Values:**
- `pending` - Order created, not yet sent to POS
- `sent_to_pos` - WebSocket broadcast successful
- `printed` - POS confirmed successful print
- `failed` - POS reported print failure

#### 2. Print Acknowledgment Endpoint ✅
**File:** `/src/app/api/pos/orders/ack/route.ts`

**Purpose:** POS devices call this after printing to confirm success/failure

**Endpoint:** `POST /api/pos/orders/ack`

**Request:**
```json
{
  "tenant": "kitchen",
  "order_id": 5105,
  "status": "printed",
  "printed_at": "2025-11-21T12:32:04Z",
  "device_id": "POS_KITCHEN_1",
  "reason": null
}
```

**For Failed Prints:**
```json
{
  "tenant": "kitchen",
  "order_id": 5105,
  "status": "failed",
  "device_id": "POS_KITCHEN_1",
  "reason": "Printer out of paper"
}
```

**Features:**
- Validates tenant and API key
- Updates order print_status
- Logs events to pos_sync_logs
- Returns confirmation to POS

#### 3. Order Creation Updated ✅
**File:** `/src/lib/tenant-order-service.ts`

**Changes:**
- Sets `print_status='pending'` when order is created
- Sets `websocket_sent=false` initially
- Tracks WebSocket broadcast success
- Updates to `print_status='sent_to_pos'` after successful WebSocket broadcast
- Updates `websocket_sent=true` and `websocket_sent_at` timestamp

#### 4. Pull Orders Enhanced ✅
**File:** `/src/app/api/pos/pull-orders/route.ts`

**Changes:**
- Filters orders by print_status (pending, sent_to_pos)
- Returns new print status fields in response
- Only returns orders that need POS attention
- Supports incremental sync with `since` parameter

---

## 🔄 How It Works Now

### Scenario 1: Normal Operation (WebSocket Works)

```
1. Customer places order
   └─> Backend saves order (print_status='pending', websocket_sent=false)

2. Backend broadcasts via WebSocket
   └─> POS receives instantly (0.1-2 seconds)
   └─> Backend updates (print_status='sent_to_pos', websocket_sent=true)

3. POS prints receipt successfully
   └─> POS calls POST /api/pos/orders/ack
   └─> Backend updates (print_status='printed')

✅ Total time: ~2 seconds
✅ Full accountability chain
```

### Scenario 2: WebSocket Failed (Polling Catches It)

```
1. Customer places order
   └─> Backend saves (print_status='pending')

2. WebSocket broadcast fails
   └─> print_status stays 'pending'
   └─> websocket_sent remains false

3. POS polling (every 15s) checks pull-orders
   └─> Finds order (print_status='pending')
   └─> POS saves order locally

4. POS prints receipt
   └─> POS calls POST /api/pos/orders/ack
   └─> Backend updates (print_status='printed')

✅ Order delivered within 15 seconds max
✅ Never lost
```

### Scenario 3: Print Failure

```
1. Order arrives at POS (via WebSocket or polling)

2. POS attempts to print → Printer fails (out of paper)
   └─> POS calls POST /api/pos/orders/ack with status='failed'
   └─> Backend updates (print_status='failed', last_print_error='out of paper')

3. Backend logs alert
   └─> Console: 🚨 ALERT: Print failed for order...
   └─> (TODO: Email/SMS alert to owner)

4. Staff fixes printer, manually prints
   └─> POS calls ACK again with status='printed'

✅ Issue tracked and resolved
✅ Audit trail maintained
```

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# Connect to your MariaDB database
mysql -u root -p

# Select your database
USE dinedesk_db;

# Run migration
source /home/opc/orderweb-app/database/migrations/add_print_status_tracking.sql;

# Verify columns were added
DESCRIBE orders;

# Check for print_status, websocket_sent, etc.
```

**Important:** Run this migration on ALL tenant databases!

### Step 2: Deploy Code Changes

```bash
cd /home/opc/orderweb-app

# Pull latest changes (if using git)
git pull

# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Restart the application
pm2 restart orderweb-app

# Check logs
pm2 logs orderweb-app
```

### Step 3: Verify Deployment

Test the new ACK endpoint:

```bash
# Get your POS API key from database
mysql -u root -p -e "SELECT slug, pos_api_key FROM tenants LIMIT 1;"

# Test ACK endpoint (replace YOUR_API_KEY and values)
curl -X POST "https://orderweb.net/api/pos/orders/ack" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "kitchen",
    "order_id": 12345,
    "status": "printed",
    "printed_at": "2025-11-21T12:00:00Z",
    "device_id": "TEST_POS"
  }'

# Expected response:
# {"success":true,"message":"Order ... marked as printed", ...}
```

### Step 4: Monitor Logs

```bash
# Watch for new orders being created
pm2 logs orderweb-app --lines 100

# Look for these log messages:
# ✅ Order created successfully and ready for POS pickup
# ✅ WebSocket broadcast sent for order: KIT-XXXX
# ✅ Order print_status updated to sent_to_pos: KIT-XXXX
# 📥 ACK received: Order XXXX, Status: printed
```

---

## 🧪 Testing Checklist

### Test 1: Order Creation with Print Status

1. Place a test order online
2. Check database:
   ```sql
   SELECT id, orderNumber, print_status, websocket_sent, websocket_sent_at 
   FROM orders 
   ORDER BY createdAt DESC 
   LIMIT 1;
   ```
3. Expected: `print_status='sent_to_pos'`, `websocket_sent=1`

### Test 2: Pull Orders API

```bash
curl -X GET "https://orderweb.net/api/pos/pull-orders?tenant=kitchen&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Expected response:
```json
{
  "success": true,
  "orders": [
    {
      "id": 12345,
      "orderNumber": "KIT-12345",
      "print_status": "sent_to_pos",
      "websocket_sent": true,
      "websocket_sent_at": "2025-11-21T12:00:00Z",
      ...
    }
  ]
}
```

### Test 3: Print Acknowledgment (Success)

```bash
curl -X POST "https://orderweb.net/api/pos/orders/ack" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "kitchen",
    "order_id": 12345,
    "status": "printed",
    "printed_at": "2025-11-21T12:05:00Z",
    "device_id": "POS_KITCHEN_1"
  }'
```

Check database:
```sql
SELECT print_status, print_status_updated_at, last_pos_device_id 
FROM orders 
WHERE id = 12345;
```

Expected: `print_status='printed'`, `last_pos_device_id='POS_KITCHEN_1'`

### Test 4: Print Acknowledgment (Failure)

```bash
curl -X POST "https://orderweb.net/api/pos/orders/ack" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "kitchen",
    "order_id": 12346,
    "status": "failed",
    "device_id": "POS_KITCHEN_1",
    "reason": "Printer out of paper"
  }'
```

Check database:
```sql
SELECT print_status, last_print_error 
FROM orders 
WHERE id = 12346;
```

Expected: `print_status='failed'`, `last_print_error='Printer out of paper'`

Check logs for alert:
```bash
pm2 logs orderweb-app | grep "🚨 ALERT"
```

---

## 📊 Database Queries for Monitoring

### Check Unprinted Orders

```sql
SELECT 
  orderNumber,
  print_status,
  websocket_sent,
  TIMESTAMPDIFF(MINUTE, createdAt, NOW()) as minutes_old
FROM orders 
WHERE print_status IN ('pending', 'sent_to_pos')
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY createdAt DESC;
```

### Check Failed Prints Today

```sql
SELECT 
  orderNumber,
  last_pos_device_id,
  last_print_error,
  print_status_updated_at
FROM orders 
WHERE print_status = 'failed'
  AND DATE(createdAt) = CURDATE()
ORDER BY print_status_updated_at DESC;
```

### Check WebSocket Success Rate

```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(CASE WHEN websocket_sent = 1 THEN 1 ELSE 0 END) as websocket_success,
  ROUND(SUM(CASE WHEN websocket_sent = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate_percent
FROM orders 
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

### Check Print Status Distribution

```sql
SELECT 
  print_status,
  COUNT(*) as count
FROM orders 
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY print_status;
```

---

## 🔍 Troubleshooting

### Issue: Orders stuck in 'pending' status

**Possible causes:**
1. WebSocket server down
2. Network issues
3. POS not polling

**Check:**
```bash
# Check WebSocket server
pm2 list | grep websocket

# Check logs
pm2 logs orderweb-websocket

# Verify POS is polling
tail -f /var/log/nginx/access.log | grep "pull-orders"
```

### Issue: ACK endpoint returns 401 Unauthorized

**Fix:**
1. Verify API key in database:
   ```sql
   SELECT slug, pos_api_key FROM tenants WHERE slug = 'kitchen';
   ```
2. Check Authorization header format: `Bearer YOUR_API_KEY`
3. Verify tenant slug matches

### Issue: Print status not updating

**Check:**
1. Verify migration ran successfully
2. Check columns exist: `DESCRIBE orders;`
3. Review application logs: `pm2 logs orderweb-app`

---

## 📈 Success Metrics

After deployment, you should see:

1. **Order Creation:**
   - ✅ All new orders have `print_status='pending'` initially
   - ✅ WebSocket success → `print_status='sent_to_pos'`

2. **POS Acknowledgments:**
   - ✅ Orders transition to `print_status='printed'` after ACK
   - ✅ Failed prints logged with error message

3. **Monitoring:**
   - ✅ Can track which orders are unprinted
   - ✅ Can identify problem POS devices
   - ✅ Can measure WebSocket success rate

---

## 🎯 Next Steps (Optional Enhancements)

### Phase 2: Device Management
- Create `pos_devices` table
- Generate unique API keys per device
- Track device health and heartbeat

### Phase 3: Monitoring Dashboard
- Admin UI to view unprinted orders
- Real-time device status indicators
- Print failure alerts via email/SMS

### Phase 4: Analytics
- Print success rate charts
- Device performance metrics
- Order fulfillment timing

---

## ✅ Summary

**What Changed:**
- ✅ 6 new columns added to orders table
- ✅ New ACK endpoint created
- ✅ Order creation sets print_status
- ✅ WebSocket success tracked
- ✅ Pull orders filters by print_status

**What Stayed the Same:**
- ✅ WebSocket broadcast (still instant!)
- ✅ Pull orders API (just enhanced)
- ✅ All existing functionality

**Benefits:**
- ✅ 100% accountability - know what was printed
- ✅ Failure detection - catch printer issues
- ✅ Audit trail - full history
- ✅ No orders lost - ever

---

**Implementation Complete! 🎉**

The system now provides full print tracking and acknowledgment while maintaining backward compatibility with existing POS integration.
