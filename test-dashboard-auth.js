#!/usr/bin/env node

const https = require('https');
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: {
            get: (name) => res.headers[name.toLowerCase()]
          },
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testCustomerDashboardAuth() {
  console.log('🔍 Testing Customer Dashboard Authentication Flow');
  console.log('===================================================');
  
  try {
    // Step 1: Test customer login
    console.log('\n1. Testing customer login...');
    const loginResponse = await fetch('https://orderweb.net/api/customer/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Client'
      },
      body: JSON.stringify({
        email: 'gqurishi@live.com',
        password: 'Test123',
        tenantId: 'kitchen'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response data:', JSON.stringify(loginData, null, 2));
    
    // Extract cookies from login response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('Set-Cookie header:', setCookieHeader);
    
    if (!loginData.success) {
      console.log('❌ Login failed, cannot proceed with auth check');
      return;
    }
    
    // Step 2: Extract token from cookie
    let customerToken = null;
    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/customer_token=([^;]+)/);
      if (tokenMatch) {
        customerToken = tokenMatch[1];
        console.log('✅ Extracted customer_token:', customerToken.substring(0, 20) + '...');
      }
    }
    
    if (!customerToken) {
      console.log('❌ No customer token found in response');
      return;
    }
    
    // Step 3: Test auth check with the token
    console.log('\n2. Testing auth check with token...');
    const authCheckResponse = await fetch('https://orderweb.net/api/customer/check-auth', {
      method: 'GET',
      headers: {
        'Cookie': `customer_token=${customerToken}`,
        'User-Agent': 'Node.js Test Client'
      }
    });
    
    console.log('Auth check response status:', authCheckResponse.status);
    const authCheckData = await authCheckResponse.json();
    console.log('Auth check response data:', JSON.stringify(authCheckData, null, 2));
    
    // Step 4: Test dashboard access simulation
    console.log('\n3. Testing dashboard tenant info fetch...');
    const tenantInfoResponse = await fetch('https://orderweb.net/api/tenant/info?slug=kitchen', {
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js Test Client'
      }
    });
    
    console.log('Tenant info response status:', tenantInfoResponse.status);
    const tenantInfoData = await tenantInfoResponse.json();
    console.log('Tenant info response data:', JSON.stringify(tenantInfoData, null, 2));
    
    // Step 5: Check if there are multiple login attempts with the same credentials
    console.log('\n4. Testing second login attempt (simulating redirect scenario)...');
    const secondLoginResponse = await fetch('https://orderweb.net/api/customer/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Client'
      },
      body: JSON.stringify({
        email: 'gqurishi@live.com',
        password: 'Test123',
        tenantId: 'kitchen'
      })
    });
    
    console.log('Second login response status:', secondLoginResponse.status);
    const secondLoginData = await secondLoginResponse.json();
    console.log('Second login response data:', JSON.stringify(secondLoginData, null, 2));
    
    console.log('\n✅ Authentication flow test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCustomerDashboardAuth();