const axios = require('axios')

async function test() {
  const url = 'http://localhost:8080/api/system/import-snapshot'
  const data = {
    tables: {
      clients: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Client',
          id_number: '1234567890',
          type: 'فرد'
        }
      ]
    },
    mode: 'merge'
  }

  try {
    const res = await axios.post(url, data)
    console.log('Success:', res.data)
  } catch (err) {
    console.error('Error Status:', err.response?.status)
    console.error('Error Data:', err.response?.data || err.message)
  }
}

test()
