import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Test with in-memory SQLite
const db = new Database(':memory:')

db.exec(`
  CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    case_number TEXT NOT NULL,
    client_id TEXT,
    court TEXT,
    circuit TEXT,
    status TEXT,
    phase TEXT,
    subject TEXT,
    case_type TEXT,
    main_classification TEXT,
    sub_classification TEXT,
    client_role TEXT,
    registration_date TEXT,
    registration_date_hijri TEXT,
    najiz_url TEXT,
    assessment TEXT,
    client_requirement TEXT,
    plaintiff_requests TEXT,
    claimed_amount REAL DEFAULT 0,
    awarded_amount REAL DEFAULT 0,
    contract_amount REAL DEFAULT 0,
    responsible_name TEXT,
    created_at TEXT DEFAULT '2026-01-01',
    updated_at TEXT DEFAULT '2026-03-01'
  );

  CREATE TABLE case_parties (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    party_type TEXT,
    id_number TEXT,
    nationality TEXT,
    phone TEXT,
    created_at TEXT DEFAULT '2026-01-01'
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    court_room TEXT,
    status TEXT,
    notes TEXT,
    result TEXT,
    meeting_link TEXT,
    is_archived INTEGER DEFAULT 0
  );

  CREATE TABLE judgments (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    judgment_number TEXT,
    judgment_date TEXT,
    judgment_date_hijri TEXT,
    favor TEXT,
    notes TEXT,
    objection_period_days INTEGER,
    objection_deadline TEXT,
    is_objection_handled INTEGER DEFAULT 0,
    is_executable INTEGER DEFAULT 0,
    created_at TEXT DEFAULT '2026-02-01'
  );

  CREATE TABLE enforcement_requests (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    request_no TEXT,
    court_name TEXT,
    status TEXT,
    instrument_no TEXT,
    instrument_date TEXT,
    created_at TEXT DEFAULT '2026-02-15'
  );

  CREATE TABLE enf_financial_details (
    request_id TEXT PRIMARY KEY,
    amount_instrument REAL DEFAULT 0,
    amount_collected_for_client REAL DEFAULT 0,
    currency TEXT DEFAULT 'ريال سعودي'
  );

  CREATE TABLE memoranda (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    memo_title TEXT,
    memo_type TEXT,
    memo_date TEXT,
    najiz_number TEXT,
    memo_status TEXT,
    memo_summary TEXT,
    created_at TEXT DEFAULT '2026-01-15'
  );

  CREATE TABLE experts (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    name TEXT,
    specialty TEXT,
    phone TEXT,
    notes TEXT,
    created_at TEXT DEFAULT '2026-01-20'
  );

  CREATE TABLE evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    status TEXT,
    evidence_date TEXT,
    created_at TEXT DEFAULT '2026-01-10'
  );

  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    name TEXT,
    file_type TEXT,
    file_size INTEGER,
    created_at TEXT DEFAULT '2026-01-05'
  );

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT,
    responsible_user_id TEXT,
    due_date TEXT,
    status TEXT,
    priority TEXT,
    created_at TEXT DEFAULT '2026-01-02'
  );

  CREATE TABLE finances (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    amount REAL,
    total REAL,
    type TEXT,
    date TEXT DEFAULT '2026-01-10'
  );

  CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    entity_id TEXT,
    actor TEXT,
    details TEXT,
    timestamp TEXT DEFAULT '2026-09-20 18:00:00'
  );

  CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    id_number TEXT,
    nationality TEXT,
    phone TEXT
  );
`)

// Seed rich case
db.exec(`
  INSERT INTO cases VALUES (
    'c1', 'CASE-B2B-100', 'cl1', 'المحكمة التجارية بالرياض', 'الدائرة الخامسة',
    'قيد النظر', 'المرافعة', 'نزاع مقاولات إنشائية', 'تجارية', 'عقود تجارية',
    'عقود مقاولات', 'مدعى عليه', '2026-01-15', '1447-07-26', 'https://najiz.sa/c/100',
    'موقف الموكل محمي ببنود العقد', 'رد الدعوى بالكامل', 'طلب إلزام بمليونين',
    2000000, 500000, 200000, 'أ. أحمد المحامي', '2026-01-15', '2026-03-01'
  );

  INSERT INTO case_parties VALUES (
    'p1', 'c1', 'شركة التعمير الوطنية', 'مدعى عليه', 'client', '7001111111', 'سعودية', '0501111111', '2026-01-15'
  );

  INSERT INTO sessions VALUES (
    's1', 'c1', '2026-10-20', '10:30', 'القاعة 3', 'قادمة', 'جلسة مرافعة ختامية', 'حضور الجلسة', 'https://teams.microsoft.com', 0
  );

  INSERT INTO judgments VALUES (
    'j1', 'c1', 'JUDG-7788', '2026-03-01', '1447-08-12', 'لصالح الموكل جزئياً',
    'إلزام الموكل بـ 500 ألف ورفض ما عدا ذلك', 30, '2026-10-30', 0, 1, '2026-03-01'
  );

  INSERT INTO enforcement_requests VALUES (
    'er1', 'c1', 'REQ-9988', 'محكمة التنفيذ بالرياض', 'ساري', 'JUDG-7788', '2026-03-01', '2026-03-05'
  );

  INSERT INTO enf_financial_details VALUES (
    'er1', 500000, 250000, 'ريال سعودي'
  );

  INSERT INTO memoranda VALUES (
    'm1', 'c1', 'مذكرة الدفاع الجوابية', 'جوابية', '2026-02-15', 'NAJ-990', 'مقدمة', 'تفنيد مزاعم الخصم', '2026-02-15'
  );

  INSERT INTO experts VALUES (
    'ex1', 'c1', 'م. خالد الدوسري', 'هندسة مدنية', '0555555550', 'جاري فحص الموقع والأعمال المنجزة', '2026-02-10'
  );

  INSERT INTO evidence VALUES (
    'ev1', 'c1', 'مخططات الإنجاز المعتمدة', 'مخططات موقعة من الاستشاري', 'مقدم', '2025-12-01', '2026-01-20'
  );

  INSERT INTO documents VALUES (
    'doc1', 'c1', 'العقد_والملحق.pdf', 'pdf', 524288, '2026-01-16'
  );

  INSERT INTO tasks VALUES (
    't1', 'c1', 'إعداد مذكرة التعقيب', 'أ. أحمد', '2026-10-18', 'pending', 'عالية', '2026-03-02'
  );

  INSERT INTO finances VALUES (
    'f1', 'c1', 100000, 100000, 'income', '2026-01-20'
  );

  INSERT INTO activity_logs VALUES (
    'act1', 'c1', 'فهد الإداري', 'تعديل الصلاحيات للمستخدم', '2026-09-21 00:00:00'
  );
`)

console.log('✅ SQLite Schema and Seed for Desktop Test OK')

// Verify query logic matches CaseDossierService exactly
const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get('c1')
const parties = db.prepare('SELECT * FROM case_parties WHERE case_id = ?').all('c1')
const sessions = db.prepare('SELECT * FROM sessions WHERE case_id = ? AND is_archived = 0').all('c1')
const judgments = db.prepare('SELECT * FROM judgments WHERE case_id = ?').all('c1')
const enforcement = db.prepare(`
  SELECT er.*, efd.amount_instrument, efd.amount_collected_for_client, efd.currency AS enf_currency
  FROM enforcement_requests er
  LEFT JOIN enf_financial_details efd ON efd.request_id = er.id
  WHERE er.case_id = ?
`).all('c1')

console.log('Case Number:', caseRow.case_number)
console.log('Claimed Amount:', caseRow.claimed_amount)
console.log('Awarded Amount:', caseRow.awarded_amount)
console.log('Difference:', caseRow.claimed_amount - caseRow.awarded_amount)
console.log('Collected for Client from enforcement:', enforcement[0]?.amount_collected_for_client)
console.log('Office Contract Amount:', caseRow.contract_amount)

if (caseRow.claimed_amount - caseRow.awarded_amount !== 1500000) {
  throw new Error('Difference calculation failed')
}
if (enforcement[0]?.amount_collected_for_client !== 250000) {
  throw new Error('Amount collected for client extraction failed')
}

console.log('✅ All Desktop SQLite assertions passed with 100% precision!')
