#!/usr/bin/env node
/**
 * Test WebSocket POS Client
 * Simulates a POS system connecting to receive real-time order notifications
 */

const WebSocket = require('ws');

const TENANT = 'kitchen';
const API_KEY = 'pos_b53157e2f2e15685976c4e81acc13a06f9186cd3eda6ade6fb7a541821b161e9';
const WS_URL = `ws://localhost:9011/ws/pos/${TENANT}`;

console.log('🔌 Connecting to WebSocket server...');
console.log(`   URL: ${WS_URL}`);
console.log(`   Tenant: ${TENANT}`);
console.log(`   API Key: ${API_KEY.substring(0, 15)}...`);
console.log('');

const ws = new WebSocket(WS_URL, {
  headers: {
    'X-API-Key': API_KEY
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket connection established!');
  console.log('');
  console.log('📡 Listening for orders...');
  console.log('   (Place an order on orderweb.net to test)');
  console.log('');
  
  // Send ping every 30 seconds to keep connection alive
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
      console.log('💓 Ping sent');
    }
  }, 30000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 MESSAGE RECEIVED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(message, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Handle different message types
    if (message.type === 'connected') {
      console.log('✅ Successfully authenticated with tenant:', message.tenant);
      console.log('');
    } else if (message.type === 'new_order') {
      console.log('🎉 NEW ORDER RECEIVED!');
      console.log(`   Order Number: ${message.data?.orderNumber}`);
      console.log(`   Customer: ${message.data?.customerName}`);
      console.log(`   Total: £${message.data?.totalAmount}`);
      console.log(`   Type: ${message.data?.orderType}`);
      console.log('');
    } else if (message.type === 'pong') {
      console.log('💓 Pong received');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('');
  console.log('🔌 WebSocket connection closed');
  console.log(`   Code: ${code}`);
  console.log(`   Reason: ${reason || 'No reason provided'}`);
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Closing WebSocket connection...');
  ws.close();
});

console.log('Press Ctrl+C to exit');
console.log('');
