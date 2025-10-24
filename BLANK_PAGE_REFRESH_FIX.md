# Blank Page on Refresh - Fixed

## Date: October 18, 2025

## Problem
After refreshing the customers page, the page would sometimes show blank until navigating back and returning.

## Root Cause
The page was trying to fetch customers **before tenant data was loaded**, causing:
1. Fetch request with `tenantId=undefined` 
2. API call failing silently
3. Page rendering with no data (appearing blank)
4. Auto-refresh interval trying to fetch with missing tenant data

## The Fix

### 1. Added Tenant Data Check in `fetchCustomers()`
**Before:**
```typescript
const fetchCustomers = async () => {
  try {
    const response = await fetch(`/api/admin/customers?tenantId=${tenantData?.id}...`);
    // ...
  }
}
```

**After:**
```typescript
const fetchCustomers = async () => {
  // Don't fetch if tenant data is not ready
  if (!tenantData?.id) {
    console.log('⏳ Waiting for tenant data...');
    return;
  }
  
  try {
    console.log('📥 Fetching customers for tenant:', tenantData.id);
    const response = await fetch(`/api/admin/customers?tenantId=${tenantData.id}...`);
    // ...
  }
}
```

### 2. Added Tenant Check in Auto-Refresh
**Before:**
```typescript
useEffect(() => {
  if (!tenantData?.id) return;
  
  const pollingInterval = setInterval(() => {
    fetchCustomers(); // Could run with undefined tenantData
  }, 5000);
  
  return () => clearInterval(pollingInterval);
}, [tenantData?.id]);
```

**After:**
```typescript
useEffect(() => {
  if (!tenantData?.id) {
    console.log('⏸️ Auto-refresh paused - waiting for tenant data');
    return;
  }
  
  const pollingInterval = setInterval(() => {
    if (tenantData?.id) { // Double-check before each fetch
      console.log('🔄 Auto-refreshing customer list');
      fetchCustomers();
    }
  }, 5000);
  
  return () => {
    console.log('🛑 Stopping auto-refresh');
    clearInterval(pollingInterval);
  };
}, [tenantData?.id]);
```

### 3. Improved Loading State
**Before:**
```typescript
if (loading) {
  return <LoadingSpinner />;
}
```

**After:**
```typescript
if (loading || !tenantData) { // Wait for both loading AND tenant data
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-600">Loading customers...</p>
      </div>
    </div>
  );
}
```

### 4. Added Console Logging
Added comprehensive logging to track the flow:
- `⏳ Waiting for tenant data...` - When tenant not ready
- `📥 Fetching customers for tenant: xxx` - When fetch starts
- `✅ Customers fetched: N` - When fetch succeeds
- `❌ Customer fetch failed: 500` - When fetch fails
- `⏸️ Auto-refresh paused` - When auto-refresh waiting
- `🔄 Auto-refreshing customer list` - Each auto-refresh
- `🛑 Stopping auto-refresh` - On component unmount

## How It Works Now

### Page Load Flow:
1. Component mounts → `loading: true`, `tenantData: null`
2. Loading spinner shows: "Loading customers..."
3. TenantContext loads tenant data
4. `tenantData` becomes available
5. `useEffect` triggers → `fetchCustomers()` called
6. Customers fetched successfully
7. `loading: false` → Page renders with data
8. Auto-refresh starts (every 5 seconds)

### Refresh Flow:
1. User hits refresh (F5 or Ctrl+R)
2. Component remounts → `loading: true`, `tenantData: null`
3. Loading spinner shows immediately (not blank!)
4. TenantContext re-initializes
5. `tenantData` loads from context/session
6. Fetch triggered when ready
7. Page renders normally

### What Prevents Blank Page:
- ✅ Loading spinner shows while waiting for tenant data
- ✅ No fetch attempts with undefined tenantId
- ✅ Auto-refresh paused until tenant ready
- ✅ Clear loading state: `loading || !tenantData`

## Testing

### Browser Console Output (Normal Flow):
```
⏸️ Auto-refresh paused - waiting for tenant data
⏳ Waiting for tenant data...
📥 Fetching customers for tenant: 2b82acee-450a-4f35-a76f-c388d709545e
✅ Customers fetched: 1
📊 Starting auto-refresh for live loyalty updates
🔄 Auto-refreshing customer list for live updates
📥 Fetching customers for tenant: 2b82acee-450a-4f35-a76f-c388d709545e
✅ Customers fetched: 1
```

### If Still Showing Blank:
Check browser console for:
- ❌ API errors (401, 500, etc.)
- ❌ Network failures
- ❌ JavaScript errors
- Verify tenant context is loading properly

## Files Modified

**`/src/app/[tenant]/admin/customers/page.tsx`**
- Added tenant data check in `fetchCustomers()`
- Added tenant check in auto-refresh interval
- Updated loading condition: `loading || !tenantData`
- Added comprehensive console logging
- Added loading text: "Loading customers..."

## Deployment

**Built:** October 18, 2025 16:10 UTC  
**Deployed:** Port 9010  
**Status:** ✅ ONLINE  

## Next Steps

1. **Hard refresh the page** (Ctrl + Shift + R)
2. Should show **loading spinner** (not blank)
3. Page loads with customer data
4. Check browser console for logs
5. Verify auto-refresh working every 5 seconds

## Summary

The blank page issue was caused by:
- ❌ Fetching data before tenant context loaded
- ❌ Auto-refresh running with undefined tenantId
- ❌ Not waiting for tenantData in loading condition

Now fixed with:
- ✅ Guard clauses checking `tenantData?.id`
- ✅ Loading state includes tenant data wait
- ✅ Auto-refresh paused until ready
- ✅ Better error handling and logging

**Status: RESOLVED ✅**

The page will now show a loading spinner during refresh and properly wait for all required data before attempting to fetch customers.
