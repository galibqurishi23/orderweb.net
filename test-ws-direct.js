const WebSocket = require('ws');

const tenant = 'kitchen';
const apiKey = 'pos_c914a280aadeeafb2d7dfb2835b7b23bd0dac3df4ccce4d611546e39d43fa2db';

console.log(`\n🔌 Testing DIRECT WebSocket connection to: ws://localhost:9011/ws/pos/${tenant}`);
console.log(`🔑 Using API Key: ${apiKey.substring(0, 20)}...`);

const ws = new WebSocket(`ws://localhost:9011/ws/pos/${tenant}`, {
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
    
    // Send ping
    console.log('\n📤 Sending ping...');
    ws.send(JSON.stringify({ type: 'ping' }));
  }
  
  if (message.type === 'pong') {
    console.log('✅ Received pong - Connection fully working!');
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 500);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed. Code: ${code}`);
});

setTimeout(() => {
  console.error('❌ Timeout');
  process.exit(1);
}, 10000);
