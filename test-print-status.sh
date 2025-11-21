#!/bin/bash

# 🧪 Print Status Tracking - Test Script
# Tests the new print acknowledgment system

echo "🧪 Starting Print Status Tests..."
echo "=================================="
echo ""

# Configuration - UPDATE THESE VALUES
API_KEY="YOUR_POS_API_KEY_HERE"
TENANT="kitchen"
BASE_URL="https://orderweb.net"
# For local testing, use: BASE_URL="http://localhost:9010"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Pull Orders (check if endpoint returns print_status)
echo "📥 Test 1: Pull Orders API"
echo "-------------------------"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/pos/pull-orders?tenant=${TENANT}&limit=5" \
  -H "Authorization: Bearer ${API_KEY}")

if echo "$RESPONSE" | grep -q "print_status"; then
  echo -e "${GREEN}✅ PASS${NC} - Pull orders returns print_status field"
  echo "Sample order:"
  echo "$RESPONSE" | jq '.orders[0] | {orderNumber, print_status, websocket_sent}' 2>/dev/null || echo "Install jq for pretty output"
else
  echo -e "${RED}❌ FAIL${NC} - print_status field not found in response"
  echo "Response: $RESPONSE"
fi
echo ""

# Get a test order ID from the response
ORDER_ID=$(echo "$RESPONSE" | jq -r '.orders[0].id' 2>/dev/null)
ORDER_NUMBER=$(echo "$RESPONSE" | jq -r '.orders[0].orderNumber' 2>/dev/null)

if [ "$ORDER_ID" != "null" ] && [ ! -z "$ORDER_ID" ]; then
  echo "Using test order: $ORDER_NUMBER (ID: $ORDER_ID)"
  echo ""

  # Test 2: Send Print Success ACK
  echo "✅ Test 2: Print Success ACK"
  echo "-------------------------"
  ACK_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/pos/orders/ack" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"tenant\": \"${TENANT}\",
      \"order_id\": ${ORDER_ID},
      \"status\": \"printed\",
      \"printed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"device_id\": \"TEST_POS_BASH_SCRIPT\"
    }")

  if echo "$ACK_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ PASS${NC} - Print ACK accepted"
    echo "Response:"
    echo "$ACK_RESPONSE" | jq '.' 2>/dev/null || echo "$ACK_RESPONSE"
  else
    echo -e "${RED}❌ FAIL${NC} - Print ACK rejected"
    echo "Response: $ACK_RESPONSE"
  fi
  echo ""

  # Test 3: Check order status via GET
  echo "🔍 Test 3: Check Order Status"
  echo "-------------------------"
  STATUS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/pos/orders/ack?order_id=${ORDER_ID}")
  
  if echo "$STATUS_RESPONSE" | grep -q "print_status"; then
    echo -e "${GREEN}✅ PASS${NC} - Order status retrieved"
    echo "Status:"
    echo "$STATUS_RESPONSE" | jq '.order | {orderNumber, print_status, last_pos_device_id}' 2>/dev/null || echo "$STATUS_RESPONSE"
  else
    echo -e "${YELLOW}⚠️ SKIP${NC} - GET endpoint may not be implemented"
  fi
  echo ""

  # Test 4: Send Print Failure ACK
  echo "❌ Test 4: Print Failure ACK"
  echo "-------------------------"
  FAIL_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/pos/orders/ack" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"tenant\": \"${TENANT}\",
      \"order_id\": ${ORDER_ID},
      \"status\": \"failed\",
      \"device_id\": \"TEST_POS_BASH_SCRIPT\",
      \"reason\": \"Printer out of paper - TEST\"
    }")

  if echo "$FAIL_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ PASS${NC} - Print failure ACK accepted"
    echo "Response:"
    echo "$FAIL_RESPONSE" | jq '.' 2>/dev/null || echo "$FAIL_RESPONSE"
  else
    echo -e "${RED}❌ FAIL${NC} - Print failure ACK rejected"
    echo "Response: $FAIL_RESPONSE"
  fi
  echo ""

else
  echo -e "${YELLOW}⚠️ No orders found to test ACK endpoint${NC}"
  echo "Place a test order first, then run this script again"
  echo ""
fi

# Test 5: Test invalid API key
echo "🔒 Test 5: Invalid API Key (should fail)"
echo "-------------------------"
INVALID_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/pos/pull-orders?tenant=${TENANT}" \
  -H "Authorization: Bearer INVALID_KEY_123")

if echo "$INVALID_RESPONSE" | grep -q "Invalid.*API key\|Invalid.*tenant\|Unauthorized"; then
  echo -e "${GREEN}✅ PASS${NC} - Invalid API key properly rejected"
else
  echo -e "${RED}❌ FAIL${NC} - Invalid API key not rejected"
  echo "Response: $INVALID_RESPONSE"
fi
echo ""

# Test 6: Test missing tenant parameter
echo "📛 Test 6: Missing Tenant (should fail)"
echo "-------------------------"
MISSING_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/pos/pull-orders" \
  -H "Authorization: Bearer ${API_KEY}")

if echo "$MISSING_RESPONSE" | grep -q "Missing.*tenant\|required"; then
  echo -e "${GREEN}✅ PASS${NC} - Missing tenant properly rejected"
else
  echo -e "${RED}❌ FAIL${NC} - Missing tenant not rejected"
  echo "Response: $MISSING_RESPONSE"
fi
echo ""

echo "=================================="
echo "🎯 Test Suite Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Review test results above"
echo "2. Check server logs: pm2 logs orderweb-app"
echo "3. Verify database: SELECT * FROM orders WHERE id = ${ORDER_ID};"
echo ""
echo "💡 Tips:"
echo "- Update API_KEY and TENANT variables at the top of this script"
echo "- Install 'jq' for pretty JSON output: sudo apt install jq"
echo "- For local testing, change BASE_URL to http://localhost:9010"
echo ""
