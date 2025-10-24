// Test customer login and dashboard access
const testCustomerFlow = async () => {
  console.log('🧪 Testing customer authentication flow...');
  
  try {
    // Step 1: Test login
    console.log('1️⃣ Testing customer login...');
    const loginResponse = await fetch('http://localhost:3000/api/customer/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'gqurishi@live.com',
        password: 'galib54321',
        tenantId: 'kitchen'
      })
    });
    
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      console.log('✅ Login successful:', loginResult.success);
      console.log('🍪 Response headers:', loginResponse.headers.get('set-cookie'));
      
      // Step 2: Test authentication check
      console.log('2️⃣ Testing authentication check...');
      const authResponse = await fetch('http://localhost:3000/api/customer/check-auth', {
        method: 'GET',
        headers: {
          'Cookie': loginResponse.headers.get('set-cookie') || ''
        }
      });
      
      if (authResponse.ok) {
        const authResult = await authResponse.json();
        console.log('✅ Auth check result:', authResult);
      } else {
        console.log('❌ Auth check failed:', authResponse.status);
      }
      
    } else {
      const loginError = await loginResponse.json();
      console.log('❌ Login failed:', loginError);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Don't run automatically in Node.js environment
console.log('Customer authentication flow test ready.');
console.log('Note: This test is designed to run in a browser environment where cookies work properly.');
console.log('The main issue was fixed by:');
console.log('1. Changing tenant info API from tenantId to slug parameter');
console.log('2. Adding debug logs to dashboard authentication');
console.log('3. Consolidating authentication state between components');