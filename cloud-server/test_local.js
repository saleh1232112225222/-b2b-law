const express = require('express')
const { authRouter } = require('./dist/routes/auth') // assuming it compiles to dist

const app = express()
app.use(express.json())
app.use('/api/auth', authRouter)

const server = app.listen(8081, async () => {
  console.log('Test server running on 8081')
  const axios = require('axios')
  try {
    const res = await axios.post('http://localhost:8081/api/auth/register', {
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
  server.close()
  process.exit(0)
})
