# Customer Loyalty System - Complete Diagnosis & Fix

## Current Status: ✅ SYSTEM READY

### Database Schema Verified

All loyalty tables exist with correct structure:

#### 1. `customer_loyalty_points` (Main Points Table)
- ✅ `customer_id` (varchar) - Links to customers table
- ✅ `tenant_id` (varchar) - Multi-tenant support
- ✅ `points_balance` (int) - Current points
- ✅ `total_points_earned` (int) - Lifetime earned
- ✅ `total_points_redeemed` (int) - Lifetime redeemed
- ✅ `tier_level` (varchar) - bronze/silver/gold/platinum
- ✅ `next_tier_points` (int) - Points needed for next tier

#### 2. `customer_loyalty` (Alternative Loyalty Table)
- ✅ `customer_id` (varchar) - UNIQUE constraint
- ✅ `points_balance` (int)
- ✅ `tier_level` (enum) - bronze/silver/gold/platinum
- ✅ `total_points_earned` (int)
- ✅ `total_points_redeemed` (int)

#### 3. `loyalty_transactions` (Transaction History)
- ✅ `customer_id` (varchar)
- ✅ `tenant_id` (varchar)
- ✅ `order_id` (varchar) - Optional order reference
- ✅ `transaction_type` (enum) - earned/redeemed/expired/bonus/adjustment
- ✅ `points_amount` (int)
- ✅ `description` (text)

#### 4. `loyalty_phone_lookup` (Phone-Based Loyalty)
- ✅ `customer_id` (varchar)
- ✅ `tenant_id` (varchar)
- ✅ `phone` (varchar)
- ✅ `normalized_phone` (varchar) - For matching
- ✅ `loyalty_card_number` (varchar) - Optional card number

### Current Customer Data

**Galib Qurishi**
- ID: `70d35c1b-ef8d-404f-8ce8-2a447f60193a`
- Email: `gqurishi@live.com`
- Phone: `+44 7306 506797`
- **Points Balance: 1100** ✅
- **Tier: Silver** ✅
- Loyalty Phone Lookup: ✅ Exists

## Customer Deletion Endpoint - FRESH BUILD

### File: `/home/opc/orderweb-app/src/app/api/admin/customers/[id]/route.ts`

**Status**: ✅ Completely rebuilt with comprehensive error handling

**Features**:
1. ✅ Database transaction management
2. ✅ Tenant validation
3. ✅ Try-catch for each table (continues even if table doesn't exist)
4. ✅ Comprehensive logging with [DELETE] prefix
5. ✅ Deletes from ALL loyalty tables:
   - customer_loyalty_points
   - customer_loyalty
   - loyalty_transactions
   - phone_loyalty_transactions
   - loyalty_phone_lookup

**Deletion Order**:
1. customer_addresses
2. customer_communications
3. customer_preferences
4. customer_reviews
5. customer_sessions
6. customer_password_resets
7. customer_login_attempts (by email)
8. customer_campaign_interactions
9. customer_special_events
10. **loyalty_transactions**
11. **phone_loyalty_transactions**
12. **loyalty_phone_lookup**
13. **customer_loyalty**
14. **customer_loyalty_points**
15. orders (UPDATE to NULL, not DELETE)
16. customers (final deletion)

## Application Status

✅ **Build**: Complete
✅ **PM2 Restart**: Complete
✅ **All Services Running**:
- Process 0: orderwebsystem-production
- Process 4: orderweb-restaurant  
- Process 5: orderweb-websocket

## Testing Instructions

### Test Customer Deletion:

1. **Open Admin Panel**: https://orderweb.net/kitchen/admin/customers

2. **Click Delete Button** next to "Galib Qurishi"

3. **Check Browser Console** for detailed logs:
   ```
   🗑️ [DELETE] Starting deletion for customer...
   ✅ [DELETE] Transaction started
   📋 [DELETE] Found customer: Galib Qurishi
   ✅ [DELETE] Deleted customer_addresses
   ✅ [DELETE] Deleted loyalty_transactions
   ✅ [DELETE] Deleted loyalty_phone_lookup
   ✅ [DELETE] Deleted customer_loyalty_points
   ✅ [DELETE] Deleted customer record
   ✅ [DELETE] Transaction committed successfully
   ```

4. **Expected Result**:
   - Success message displayed
   - Customer removed from list
   - All 1100 loyalty points deleted
   - All related data removed

### Verify in Database:

```bash
# Check customer deleted
sudo mysql -e "USE dinedesk_db; SELECT COUNT(*) FROM customers WHERE id = '70d35c1b-ef8d-404f-8ce8-2a447f60193a';"
# Should return: 0

# Check loyalty points deleted
sudo mysql -e "USE dinedesk_db; SELECT COUNT(*) FROM customer_loyalty_points WHERE customer_id = '70d35c1b-ef8d-404f-8ce8-2a447f60193a';"
# Should return: 0

# Check phone lookup deleted
sudo mysql -e "USE dinedesk_db; SELECT COUNT(*) FROM loyalty_phone_lookup WHERE customer_id = '70d35c1b-ef8d-404f-8ce8-2a447f60193a';"
# Should return: 0
```

## Loyalty System APIs

Let me check what loyalty APIs exist:

