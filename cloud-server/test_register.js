const axios = require('axios')

async function test() {
  const url = 'http://localhost:8080/api/auth/register'
  console.log('Testing Registration Constraints...')

  try {
    const res = await axios.post(url, {
      companyName: 'Test Office <script>alert(1)</script>',
      username: 'user123',
      email: 'invalid-email',
      phone: '051234567',
      password: 'weak'
    })
    console.log('Success:', res.data)
  } catch (err) {
    console.error('Error Status:', err.response?.status)
    console.error('Error Data:', err.response?.data)
  }
}

test()
