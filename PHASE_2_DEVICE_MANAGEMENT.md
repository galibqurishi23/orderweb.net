# ✅ Phase 2: Device Management - Implementation Complete

**Date:** November 21, 2025  
**Status:** Code Updated - Ready for Deployment

---

## 📦 What Was Implemented

### Phase 2: Per-Device Authentication & Tracking

#### 1. POS Devices Table ✅
**File:** `/database/migrations/create_pos_devices_table.sql`

**New Table Structure:**
```sql
pos_devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(255) - Links to tenant
  device_id VARCHAR(50) UNIQUE - Unique device identifier
  device_name VARCHAR(100) - Human-readable name
  api_key VARCHAR(100) UNIQUE - Unique API key per device
  is_active BOOLEAN - Enable/disable device
  last_seen_at DATETIME - Last API call timestamp
  last_heartbeat_at DATETIME - Last heartbeat/ping
  created_at DATETIME - When device was added
  updated_at DATETIME - Last modification
)
```

**Benefits:**
- Each POS device gets its own API key
- Track which device printed which order
- Disable compromised devices without affecting others
- Monitor device health independently

#### 2. Device Management API ✅
**File:** `/src/app/api/admin/pos-devices/route.ts`

**Endpoints:**

**POST** - Generate new device API key
```bash
POST /api/admin/pos-devices
Authorization: Bearer ADMIN_TOKEN

{
  "tenant_slug": "kitchen",
  "device_name": "Main POS Terminal"
}

Response:
{
  "success": true,
  "device": {
    "device_id": "POS_MAIN_POS_TERMINAL_abc123",
    "device_name": "Main POS Terminal",
    "api_key": "pos_a1b2c3d4e5f6g7h8i9j0...", 
    "tenant_slug": "kitchen"
  }
}
```
⚠️ **API key shown only once!**

**GET** - List all devices for a tenant
```bash
GET /api/admin/pos-devices?tenant=kitchen
```

**PATCH** - Activate/deactivate device
```bash
PATCH /api/admin/pos-devices

{
  "device_id": "POS_MAIN_1",
  "is_active": false
}
```

**DELETE** - Soft delete device
```bash
DELETE /api/admin/pos-devices?device_id=POS_MAIN_1
```

#### 3. Enhanced Authentication ✅
**Files Updated:**
- `/src/app/api/pos/pull-orders/route.ts`
- `/src/app/api/pos/orders/ack/route.ts`

**Dual Authentication Support:**

1. **Device-level (NEW - Preferred)**
   - Uses device-specific API key from `pos_devices` table
   - Tracks which device made the call
   - Updates device heartbeat automatically
   - More secure and granular

2. **Tenant-level (LEGACY - Backward Compatible)**
   - Uses tenant's `pos_api_key` from `tenants` table
   - Works with old POS systems
   - No breaking changes

**How it works:**
```
API Request with Bearer token
    ↓
Try device authentication first
    ↓
    ├─ Found in pos_devices → Use device auth
    │  └─> Update device heartbeat
    │  └─> Return device_id in response
    │
    └─ Not found → Try tenant auth (legacy)
       └─> Works with old API key
       └─> Backward compatible
```

#### 4. Device Health Monitoring ✅
**File:** `/src/app/api/admin/pos-health/route.ts`

**Endpoint:** `GET /api/admin/pos-health?tenant=kitchen`

**Returns:**
- Device status (online/offline/disabled)
- Unprinted orders count
- Failed prints today
- Alerts and warnings

**Response Structure:**
```json
{
  "success": true,
  "stats": {
    "total_devices": 3,
    "online_devices": 2,
    "offline_devices": 1,
    "unprinted_orders": 2,
    "failed_prints_today": 0,
    "critical_alerts": 1
  },
  "devices": [
    {
      "device_id": "POS_MAIN_1",
      "device_name": "Main POS",
      "tenant_name": "Kitchen Restaurant",
      "status": "online",
      "last_seen": "2025-11-21T12:00:00Z",
      "offline_duration_minutes": null
    }
  ],
  "alerts": [
    {
      "type": "device_offline",
      "severity": "high",
      "message": "Kitchen POS has been offline for 25 minutes"
    }
  ]
}
```

**Device Status Logic:**
- **Online**: Last seen within 10 minutes
- **Offline**: Last seen > 10 minutes ago
- **Disabled**: `is_active = false`

#### 5. Automatic Heartbeat Tracking ✅

**When POS calls any endpoint:**
- `/api/pos/pull-orders` → Updates `last_seen_at` and `last_heartbeat_at`
- `/api/pos/orders/ack` → Updates `last_seen_at` and `last_heartbeat_at`

**This enables:**
- Detect offline devices (no heartbeat > 10 min)
- Track device activity patterns
- Alert when critical device goes offline

---

## 🔄 Migration from Tenant-Level to Device-Level

### Current System (Tenant-Level):
```
Restaurant "Kitchen"
  └─> Single API key: abc123xyz
      └─> All POS devices share this key
      └─> Can't tell which device did what
```

### New System (Device-Level):
```
Restaurant "Kitchen"
  ├─> POS Device 1: api_key_device_1 (Main Counter)
  ├─> POS Device 2: api_key_device_2 (Kitchen Display)
  └─> POS Device 3: api_key_device_3 (Bar Station)
      └─> Each device tracked independently
      └─> Can disable one without affecting others
```

### Backward Compatibility:
✅ Old POS systems using tenant API key still work  
✅ No need to update all devices at once  
✅ Gradual migration supported  

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# Connect to MariaDB
mysql -u root -p

# Select database
USE dinedesk_db;

# Run migration
source /home/opc/orderweb-app/database/migrations/create_pos_devices_table.sql;

# Verify table created
DESCRIBE pos_devices;
```

**Run on ALL tenant databases!**

### Step 2: Generate Device API Keys

For each POS device you want to add:

```bash
# Generate device API key
curl -X POST "https://orderweb.net/api/admin/pos-devices" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "kitchen",
    "device_name": "Main POS Terminal"
  }'

# Response will contain the API key - SAVE IT!
# You will NOT be able to retrieve it again
```

### Step 3: Update POS Devices

Give each POS device its own API key:

1. **Option A: All at once**
   - Update all POS devices with new API keys
   - Better security immediately

2. **Option B: Gradual migration**
   - Keep using tenant API key for existing devices
   - Only new devices get device-specific keys
   - Migrate when convenient

### Step 4: Monitor Device Health

```bash
# Check all devices
curl "https://orderweb.net/api/admin/pos-health"

# Check specific tenant
curl "https://orderweb.net/api/admin/pos-health?tenant=kitchen"
```

---

## 🧪 Testing Phase 2

### Test 1: Create Device

```bash
curl -X POST "https://orderweb.net/api/admin/pos-devices" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "kitchen",
    "device_name": "Test POS"
  }'

# Save the api_key from response!
```

### Test 2: Pull Orders with Device Key

```bash
curl -X GET "https://orderweb.net/api/pos/pull-orders?tenant=kitchen&limit=5" \
  -H "Authorization: Bearer pos_YOUR_DEVICE_API_KEY"

# Should return: device_id in response
```

### Test 3: Send ACK with Device Key

```bash
curl -X POST "https://orderweb.net/api/pos/orders/ack" \
  -H "Authorization: Bearer pos_YOUR_DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "kitchen",
    "order_id": 12345,
    "status": "printed",
    "printed_at": "2025-11-21T12:00:00Z"
  }'
```

### Test 4: Check Device Health

```bash
curl "https://orderweb.net/api/admin/pos-health?tenant=kitchen"

# Should show your test device as "online"
```

### Test 5: Verify Heartbeat

```bash
# Make several API calls, then check database
mysql -u root -p -e "
  SELECT device_id, device_name, last_seen_at, last_heartbeat_at 
  FROM pos_devices 
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'kitchen')
"

# last_seen_at should update with each call
```

### Test 6: Backward Compatibility

```bash
# Use old tenant API key (should still work)
curl -X GET "https://orderweb.net/api/pos/pull-orders?tenant=kitchen&limit=5" \
  -H "Authorization: Bearer OLD_TENANT_API_KEY"

# Should work! No device_id in response (legacy mode)
```

---

## 📊 Database Queries

### List All Devices with Status

```sql
SELECT 
  d.device_id,
  d.device_name,
  t.name as restaurant,
  d.is_active,
  d.last_seen_at,
  TIMESTAMPDIFF(MINUTE, d.last_seen_at, NOW()) as minutes_since_last_seen,
  CASE 
    WHEN d.is_active = FALSE THEN 'disabled'
    WHEN d.last_seen_at IS NULL THEN 'never_connected'
    WHEN TIMESTAMPDIFF(MINUTE, d.last_seen_at, NOW()) <= 10 THEN 'online'
    ELSE 'offline'
  END as status
FROM pos_devices d
JOIN tenants t ON d.tenant_id = t.id
ORDER BY t.name, d.device_name;
```

### Find Offline Devices

```sql
SELECT 
  d.device_id,
  d.device_name,
  t.name as restaurant,
  d.last_seen_at,
  TIMESTAMPDIFF(MINUTE, d.last_seen_at, NOW()) as offline_minutes
FROM pos_devices d
JOIN tenants t ON d.tenant_id = t.id
WHERE d.is_active = TRUE
  AND d.last_seen_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
ORDER BY offline_minutes DESC;
```

### Check Which Device Printed Orders

```sql
SELECT 
  o.orderNumber,
  o.print_status,
  o.last_pos_device_id,
  d.device_name,
  o.print_status_updated_at
FROM orders o
LEFT JOIN pos_devices d ON o.last_pos_device_id = d.device_id
WHERE DATE(o.createdAt) = CURDATE()
  AND o.print_status = 'printed'
ORDER BY o.print_status_updated_at DESC
LIMIT 20;
```

---

## 🔒 Security Improvements

### Before (Tenant-Level):
- ❌ Single API key shared by all devices
- ❌ If key compromised, must update all devices
- ❌ Can't identify which device has issue
- ❌ Can't disable one device selectively

### After (Device-Level):
- ✅ Unique API key per device
- ✅ Compromise affects only one device
- ✅ Full audit trail per device
- ✅ Disable devices independently
- ✅ Track device activity patterns
- ✅ Detect offline devices immediately

---

## 🎯 What This Enables

### For Restaurants:
- Know which POS device printed each order
- Detect when specific device goes offline
- Disable stolen/compromised device remotely
- Track performance per device
- Plan maintenance based on usage patterns

### For Support:
- "Kitchen POS #2 has been offline for 30 minutes"
- "Bar POS printed 45 orders today"
- "Device XYZ failed to print 3 orders - printer issue?"

### For Security:
- Revoke access per device, not per restaurant
- Audit trail shows which device made which change
- Detect unusual activity from specific device

---

## ✅ Phase 2 Complete

**New Features:**
- ✅ `pos_devices` table for device tracking
- ✅ Unique API keys per device
- ✅ Device management admin API
- ✅ Dual authentication (device + tenant)
- ✅ Automatic heartbeat tracking
- ✅ Device health monitoring API
- ✅ Backward compatibility maintained

**Files Created:**
1. `/database/migrations/create_pos_devices_table.sql`
2. `/src/app/api/admin/pos-devices/route.ts`
3. `/src/app/api/admin/pos-health/route.ts`

**Files Updated:**
1. `/src/app/api/pos/pull-orders/route.ts` - Dual auth
2. `/src/app/api/pos/orders/ack/route.ts` - Dual auth

**Ready for deployment when you restart the application!** 🚀
