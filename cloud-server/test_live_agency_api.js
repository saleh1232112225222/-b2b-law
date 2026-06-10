const axios = require('axios');
const { Client } = require('pg');

const pgClient = new Client({
  connectionString: 'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true',
  ssl: {
    rejectUnauthorized: false
  }
});

const API_BASE = 'https://b2b-law-g2qr.onrender.com/api';

async function run() {
  try {
    await pgClient.connect();
    console.log('Connected to PG.');

    // 1. Register a test company
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const username = `testuser_${randomSuffix}`;
    const email = `test_${randomSuffix}@example.com`;
    const phone = `05${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    console.log(`Registering user: ${username}...`);
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      companyName: 'Test Agency Office',
      username,
      email,
      phone,
      password: 'Password123'
    });

    console.log('Registration requested. Fetching OTP from DB...');
    // Fetch the OTP from the database
    const otpRes = await pgClient.query('SELECT verification_code FROM companies WHERE email = $1', [email]);
    const otp = otpRes.rows[0].verification_code;
    console.log(`OTP found: ${otp}`);

    // Verify account
    console.log('Verifying account...');
    await axios.post(`${API_BASE}/auth/verify`, {
      username,
      code: otp
    });
    console.log('Account verified successfully!');

    // 2. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username,
      password: 'Password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in successfully. Token obtained.');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 3. Create a client
    console.log('Creating a client...');
    const clientRes = await axios.post(`${API_BASE}/clients`, {
      name: 'سعد السعدي',
      type: 'فرد',
      phone: '0500000000',
      email: 'saad@test.com',
      nationality: 'سعودي',
      city: 'الرياض',
      birth_date: '' // empty string to test sanitization
    }, { headers });
    const clientId = clientRes.data.id;
    console.log(`Client created with ID: ${clientId}`);

    // 4. Create an agency (Power of Attorney)
    console.log('Creating an agency (Power of Attorney)...');
    try {
      const agencyRes = await axios.post(`${API_BASE}/agencies`, {
        client_id: clientId,
        agency_number: '464654',
        date: '2026-06-07',
        expiry_date: '2026-07-11',
        court: 'بيب',
        notes: 'بيب'
      }, { headers });
      console.log('Agency created successfully!', agencyRes.data);
    } catch (err) {
      console.error('Agency creation failed with status:', err.response?.status);
      console.error('Agency creation error data:', err.response?.data);
      throw err;
    }

    // Clean up test data
    console.log('Cleaning up PG database...');
    const companyRes = await pgClient.query('SELECT id FROM companies WHERE email = $1', [email]);
    const companyId = companyRes.rows[0].id;
    await pgClient.query('DELETE FROM companies WHERE id = $1', [companyId]);
    console.log('Clean up complete.');

  } catch (err) {
    console.error('E2E Test failed:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  } finally {
    await pgClient.end();
  }
}

run();
