const express = require('express')
const { systemRouter } = require('./dist/routes/system')
const { getClient } = require('./dist/db/connection')

// Mock getCompanyId
jest = require('jest-mock')
const mockTenant = require('./dist/middleware/tenant')
mockTenant.getCompanyId = () => '00000000-0000-0000-0000-000000000000'

const app = express()
app.use(express.json({ limit: '50mb' }))

// Strip auth middleware
systemRouter.stack = systemRouter.stack.filter(
  (layer) => layer.name !== 'authMiddleware' && layer.name !== 'requireAdminRole'
)

app.use('/api', systemRouter)

const server = app.listen(8082, async () => {
  console.log('Test server running on 8082')
  const axios = require('axios')
  try {
    const res = await axios.post('http://localhost:8082/api/system/import-snapshot', {
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
    })
    console.log('Success:', res.data)
  } catch (err) {
    console.error('Error Status:', err.response?.status)
    console.error('Error Data:', err.response?.data || err.message)
  }
  server.close()
  process.exit(0)
})
