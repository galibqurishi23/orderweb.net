/**
 * Create a test order to verify WebSocket broadcasting
 */

const { createTenantOrder } = require('./src/lib/tenant-order-service');

const tenantId = '2b82acee-450a-4f35-a76f-c388d709545e'; // kitchen
const tenantSlug = 'kitchen';

const testOrderData = {
  tenantId: tenantId,
  customerName: 'WebSocket Test Customer',
  customerEmail: 'test@orderweb.net',
  customerPhone: '+447700900000',
  address: '123 Test Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  orderType: 'pickup',
  orderSource: 'online',
  paymentMethod: 'card',
  paymentIntentId: 'pi_test_' + Date.now(),
  items: [
    {
      id: 'test-item-1',
      name: 'Test Burger',
      price: 12.99,
      quantity: 1,
      selectedAddons: []
    },
    {
      id: 'test-item-2',
      name: 'Test Fries',
      price: 4.99,
      quantity: 2,
      selectedAddons: []
    }
  ],
  subtotal: 22.97,
  tax: 0,
  deliveryFee: 0,
  total: 22.97,
  specialInstructions: 'This is a WebSocket broadcast test order'
};

console.log('📝 Creating test order...');
console.log('   Tenant: kitchen');
console.log('   Customer: WebSocket Test Customer');
console.log('   Total: £22.97');
console.log('');

createTenantOrder(tenantId, testOrderData)
  .then(result => {
    console.log('✅ Order created successfully!');
    console.log('   Order ID:', result.id);
    console.log('   Order Number:', result.orderNumber);
    console.log('   Total:', result.total);
    console.log('');
    console.log('🎯 Check your WebSocket client - order should appear there!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error creating order:', error.message);
    console.error(error);
    process.exit(1);
  });
