const { LicenseService } = require('./src/lib/license-service.ts');

async function testDB() {
  try {
    const result = await LicenseService.getPendingActivations();
    console.log('LicenseService returns:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDB();
