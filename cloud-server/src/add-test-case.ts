const BASE_URL = 'http://localhost:8080'
const credentials = { username: 'admin', password: 'admin123' }

async function main() {
  console.log('🚀 Running add-test-case script...')

  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })

  if (!loginRes.ok) {
    console.error('❌ Login failed:', await loginRes.text())
    process.exit(1)
  }

  const { token, user } = (await loginRes.json()) as any
  console.log(`\u2705 Logged in successfully as: ${user.fullName}`)
  console.log(`\ud83c\udfe2 Company ID: ${user.companyId}`)

  // 2. Fetch clients to get a client_id
  const clientsRes = await fetch(`${BASE_URL}/api/clients`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!clientsRes.ok) {
    console.error('❌ Failed to fetch clients:', await clientsRes.text())
    process.exit(1)
  }

  const clientsData = (await clientsRes.json()) as any
  let clientId = ''
  if (clientsData.data && clientsData.data.length > 0) {
    clientId = clientsData.data[0].id
    console.log(`\ud83d\udc65 Using existing client: ${clientsData.data[0].name} (${clientId})`)
  } else {
    // Create a new client if none exists
    console.log('\ud83d\udc65 No clients found. Creating a test client...')
    const newClientRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'عميل اختبار سحابي',
        phone: '0500000001',
        email: 'client@example.com'
      })
    })
    if (!newClientRes.ok) {
      console.error('❌ Failed to create client:', await newClientRes.text())
      process.exit(1)
    }
    const newClient = (await newClientRes.json()) as any
    clientId = newClient.id
    console.log(`\u2705 Created test client: ${newClient.name} (${clientId})`)
  }

  // 3. Create a new case
  const caseNumber = `CASE-${Math.floor(1000000000 + Math.random() * 9000000000)}`
  const casePayload = {
    case_number: caseNumber,
    client_id: clientId,
    subject: 'دعوى مطالبة مالية لخدمات استشارية وتقنية سحابية',
    court: 'المحكمة التجارية بالرياض',
    circuit: 'الدائرة الأولى',
    opponent_name: 'شركة الخدمات اللوجستية المتقدمة',
    opponent_id: '1010203040',
    case_type: 'تجاري',
    phase: 'الدرجة الأولى',
    status: 'قيد النظر',
    priority: 'عالية',
    notes: 'تمت إضافتها لاختبار الهجرة والاتصال السحابي بقاعدة PostgreSQL بنجاح.'
  }

  console.log(`\u2696\ufe0f Creating case: ${caseNumber}...`)
  const createCaseRes = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(casePayload)
  })

  if (!createCaseRes.ok) {
    console.error('❌ Failed to create case:', await createCaseRes.text())
    process.exit(1)
  }

  const createdCase = (await createCaseRes.json()) as any
  console.log('\n\ud83c\udf89 Case created successfully in PostgreSQL Cloud DB!')
  console.log('----------------------------------------------------')
  console.log(`\ud83c\udd94 ID: ${createdCase.id}`)
  console.log(`\ud83d\udd22 Case Number: ${createdCase.case_number}`)
  console.log(`\ud83d\udcdd Subject: ${createdCase.subject}`)
  console.log(`\ud83c\udfdb\ufe0f Court: ${createdCase.court}`)
  console.log(`\u2696\ufe0f Opponent: ${createdCase.opponent_name}`)
  console.log(`\ud83c\udff7\ufe0f Status: ${createdCase.status}`)
  console.log(`\ud83d\udcc5 Created At: ${createdCase.created_at}`)
  console.log('----------------------------------------------------')

  // 4. Verify case retrieval
  const verifyRes = await fetch(`${BASE_URL}/api/cases/${createdCase.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (verifyRes.ok) {
    console.log('\ud83d\udd0d Verification: Successfully retrieved case from DB by ID! \u2705')
  } else {
    console.error('❌ Verification failed: Could not retrieve case by ID!')
  }

  process.exit(0)
}

main().catch(console.error)
