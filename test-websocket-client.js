#!/usr/bin/env node

/**
 * WebSocket Test Client for POS Integration
 * Tests connection, authentication, and message handling
 */

const WebSocket = require('ws');

// Configuration
const TENANT = 'kitchen'; // Change this to your tenant slug
const API_KEY = 'test-api-key-12345'; // Replace with actual API key from database
const WS_URL = `ws://localhost:9010/ws/pos/${TENANT}`;

console.log('🔌 POS WebSocket Test Client');
console.log('============================');
console.log(`Tenant: ${TENANT}`);
console.log(`URL: ${WS_URL}`);
console.log('');

// Create WebSocket connection with API key header
const ws = new WebSocket(WS_URL, {
  headers: {
    'X-API-Key': API_KEY
  }
});

// Connection opened
ws.on('open', () => {
  console.log('✅ WebSocket connection established');
  console.log('');
  
  // Send a ping message every 30 seconds to keep connection alive
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending ping...');
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }
  }, 30000);
});

// Receive messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message:');
    console.log(JSON.stringify(message, null, 2));
    console.log('');
    
    // Handle different message types
    switch (message.type) {
      case 'connected':
        console.log('🎉 Successfully connected to POS WebSocket server');
        break;
      
      case 'new_order':
        console.log(`🆕 New Order: #${message.data.orderNumber}`);
        console.log(`   Customer: ${message.data.customerName}`);
        console.log(`   Total: $${message.data.totalAmount}`);
        console.log(`   Items: ${message.data.items.length}`);
        break;
      
      case 'order_updated':
        console.log(`📝 Order Updated: #${message.data.orderNumber}`);
        console.log(`   Status: ${message.data.previousStatus} → ${message.data.status}`);
        break;
      
      case 'gift_card_purchased':
        console.log(`🎁 Gift Card Purchased: ${message.data.cardNumber}`);
        console.log(`   Balance: $${message.data.currentBalance}`);
        break;
      
      case 'loyalty_updated':
        console.log(`⭐ Loyalty Points Updated: ${message.data.customerPhone}`);
        console.log(`   Points Change: ${message.data.pointsChange > 0 ? '+' : ''}${message.data.pointsChange}`);
        console.log(`   New Balance: ${message.data.newBalance}`);
        break;
      
      case 'pong':
        console.log('✓ Pong received - connection alive');
        break;
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error.message);
  }
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log('');
  console.log('🔌 WebSocket connection closed');
  console.log(`Code: ${code}`);
  console.log(`Reason: ${reason || 'No reason provided'}`);
  process.exit(0);
});

// Connection error
ws.on('error', (error) => {
  console.error('');
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Closing connection...');
  ws.close();
});

console.log('⏳ Connecting to WebSocket server...');
console.log('Press Ctrl+C to exit');
console.log('');
