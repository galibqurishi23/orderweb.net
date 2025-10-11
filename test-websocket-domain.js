const WebSocket = require('ws');

const tenant = 'kitchen';
const apiKey = 'pos_c914a280aadeeafb2d7dfb2835b7b23bd0dac3df4ccce4d611546e39d43fa2db';

console.log(`\n🔌 Testing WebSocket connection to: wss://orderweb.net/ws/pos/${tenant}`);
console.log(`🔑 Using API Key: ${apiKey.substring(0, 20)}...`);

const ws = new WebSocket(`wss://orderweb.net/ws/pos/${tenant}`, {
  headers: {
    'X-API-Key': apiKey
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket connection OPEN');
});

ws.on('message', (data) => {
  console.log('📨 Received message:', data.toString());
  const message = JSON.parse(data.toString());
  
  if (message.type === 'connected') {
    console.log('✅ Successfully connected to tenant:', message.tenant);
    console.log('   Timestamp:', message.timestamp);
    
    // Send a ping to test two-way communication
    console.log('\n📤 Sending ping...');
    ws.send(JSON.stringify({ type: 'ping' }));
  }
  
  if (message.type === 'pong') {
    console.log('✅ Received pong response');
    console.log('   Timestamp:', message.timestamp);
    
    // Close after successful test
    setTimeout(() => {
      console.log('\n✅ Test PASSED - Closing connection');
      ws.close();
      process.exit(0);
    }, 1000);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);
