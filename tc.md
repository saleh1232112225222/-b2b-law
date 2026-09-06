6\. تحليل متقدم للمشاكل المعمارية الدقيقة

① مشكلة تزامن حالة الجلسات عبر العمليات (Cross-Process Session State)

الموقع: \[g:\\b2b\\src\\main\\auth\\AuthService.ts] (ملف غير مذكور في سجلك)



المشكلة المخفية: عند تشغيل نوافذ متعددة (مثل نافذة الإعدادات ونافذة الاستعادة)، قد تحمل كل عملية نسخة مختلفة من حالة الجلسة، مما يؤدي إلى:



فشل verifyCurrentSessionPassword رغم صحة كلمة المرور.



ظهور أخطاء BACKUP\_STEP\_UP\_FAILED بشكل عشوائي.



الحل المقترح:



typescript

// استخدام SharedWorker أو IPC Broadcast للجلسات

export class SessionCoordinator {

&#x20; private static instance: SessionCoordinator

&#x20; private sessionVersion = 0

&#x20; 

&#x20; // إصدار الجلسة مع كل تغيير وإعلام جميع النوافذ

&#x20; broadcastSessionUpdate(session: Session) {

&#x20;   this.sessionVersion++

&#x20;   BrowserWindow.getAllWindows().forEach(win => {

&#x20;     win.webContents.send('session:updated', {

&#x20;       session,

&#x20;       version: this.sessionVersion

&#x20;     })

&#x20;   })

&#x20; }

}

② التحديات في إدارة الاتصالات الطويلة (WebSocket/SSE Reconnection)

الموقع: \[g:\\w2w\\src\\renderer\\src\\api\\WebSocketManager.ts] (مفترض وجوده)



المشكلة: عند انقطاع الإنترنت لبضع ثوانٍ، قد يدخل WebSocket في حالة CLOSED ويحاول إعادة الاتصال، لكن أثناء ذلك:



تفشل المزامنة التلقائية وتُسجل أخطاء.



تتراكم الطلبات في قائمة انتظار (outbox).



الحل المتقدم:



typescript

// استراتيجية إعادة الاتصال مع تراكم الطلبات

class ResilientWebSocket {

&#x20; private pendingQueue: Array<{id: string, payload: any}> = \[]

&#x20; private isReconnecting = false

&#x20; 

&#x20; async sendWithRetry(payload: any, maxRetries = 3) {

&#x20;   if (this.ws.readyState !== WebSocket.OPEN) {

&#x20;     this.pendingQueue.push({id: uuid(), payload})

&#x20;     await this.ensureConnection()

&#x20;     return this.processQueue()

&#x20;   }

&#x20;   // الإرسال المباشر

&#x20; }

&#x20; 

&#x20; private async processQueue() {

&#x20;   // إرسال الطلبات المتراكمة بترتيب وصولها

&#x20;   for (const item of this.pendingQueue) {

&#x20;     await this.ws.send(JSON.stringify(item.payload))

&#x20;   }

&#x20;   this.pendingQueue = \[]

&#x20; }

}

③ مشكلة نقل البيانات الكبيرة أثناء المزامنة

الموقع: \[g:\\b2b\\src\\main\\services\\SyncTransport.ts]



المشكلة: عند وجود مرفقات كبيرة (PDFs, صور)، يحاول النظام إرسالها كـ Base64 داخل JSON مما يسبب:



تجاوز حد حجم الرسالة (Message Size Limit).



استهلاك ذاكرة عالٍ جداً قد يسبب تعطل التطبيق.



الحل المعماري:



typescript

// استخدام المرفقات كـ Stream أو Multipart Upload

interface SyncAttachment {

&#x20; id: string

&#x20; filename: string

&#x20; size: number

&#x20; // استخدام تدفق بدلاً من تحميل كامل الملف

&#x20; stream: ReadableStream

&#x20; // أو: استخدام URL للتحميل المباشر إلى S3/Cloud Storage

&#x20; uploadUrl: string

}



// تعديل المزامنة لإرسال البيانات الوصفية فقط، ثم تحميل المرفقات بشكل منفصل

7\. تحليل الأمان المتقدم (لم يُغطَ سابقاً)

④ مشكلة تخزين المفاتيح والتوكنات بشكل غير آمن

الموقع: \[g:\\b2b\\src\\main\\services\\SyncCredentialStore.ts]



المشكلة: تخزين refreshToken و apiKey في ملف sync-credentials.json بشكل نصّي (Plain Text) داخل مجلد بيانات التطبيق.



الهجوم المحتمل: أي برنامج ضار يمكنه قراءة الملف وسرقة التوكنات.



الحل المتكامل:



typescript

import { safeStorage } from 'electron'



// استخدام التشفير الموفر من نظام التشغيل

class SecureCredentialStore {

&#x20; private static encrypt(text: string): string {

&#x20;   return safeStorage.encryptString(text).toString('base64')

&#x20; }

&#x20; 

&#x20; private static decrypt(encrypted: string): string {

&#x20;   const buffer = Buffer.from(encrypted, 'base64')

&#x20;   return safeStorage.decryptString(buffer)

&#x20; }

&#x20; 

&#x20; // إضافة حماية إضافية: ربط التوكن بمعرف الجهاز

&#x20; static store(key: string, value: string) {

&#x20;   const deviceId = this.getDeviceId() // معرف فريد للجهاز

&#x20;   const combined = `${deviceId}:${value}`

&#x20;   const encrypted = this.encrypt(combined)

&#x20;   // تخزين في ملف مشفر

&#x20; }

}

⑤ نقص الحماية من هجمات XSS في النوافذ الفرعية

الموقع: جميع النوافذ المنبثقة (مثل نافذة الاستعادة، نافذة الإعدادات)



المشكلة: استخدام webPreferences.contextIsolation = false في بعض النوافذ (لتسهيل تمرير البيانات) يفتح الباب لهجمات XSS عبر eval() أو innerHTML.



الحل الآمن:



typescript

// في main.ts عند إنشاء النوافذ

const win = new BrowserWindow({

&#x20; webPreferences: {

&#x20;   contextIsolation: true, // تفعيل العزل

&#x20;   preload: path.join(\_\_dirname, 'preload.js'), // استخدم preload للتواصل الآمن

&#x20;   sandbox: true // تفعيل وضع الحماية

&#x20; }

})



// في preload.js (الوسيط الآمن بين الـ Renderer والـ Main)

contextBridge.exposeInMainWorld('api', {

&#x20; invoke: (channel: string, data: any) => {

&#x20;   const validChannels = \['restore:confirm', 'backup:create']

&#x20;   if (!validChannels.includes(channel)) {

&#x20;     throw new Error('Invalid channel')

&#x20;   }

&#x20;   return ipcRenderer.invoke(channel, data)

&#x20; }

})

8\. تحليل الأداء والتوسع (Performance \& Scalability)

⑥ مشكلة التحميل الزائد لقاعدة البيانات عند الإقلاع

الموقع: \[g:\\b2b\\src\\main\\db\\Database.ts]



المشكلة: يقوم النظام بتحميل جميع السجلات عند بدء التشغيل (مثل SELECT \* FROM legal\_engagements).



التأثير: مع وجود 10,000+ سجل، قد يستغرق التحميل 3-5 ثوانٍ مما يؤخر ظهور التطبيق.



الحل:



typescript

// استخدام التحميل الكسول (Lazy Loading) والترقيم (Pagination)

class EngagementRepository {

&#x20; async getActiveEngagements(page = 1, limit = 50) {

&#x20;   const offset = (page - 1) \* limit

&#x20;   return this.db.all(`

&#x20;     SELECT \* FROM legal\_engagements 

&#x20;     WHERE status = 'active'

&#x20;     ORDER BY updated\_at DESC

&#x20;     LIMIT ? OFFSET ?

&#x20;   `, \[limit, offset])

&#x20; }

&#x20; 

&#x20; // تحميل التفاصيل عند الطلب فقط

&#x20; async getEngagementDetails(id: string) {

&#x20;   return this.db.get(`

&#x20;     SELECT e.\*, 

&#x20;       (SELECT COUNT(\*) FROM legal\_service\_timeline WHERE engagement\_id = e.id) as timeline\_count,

&#x20;       (SELECT COUNT(\*) FROM legal\_service\_attachments WHERE engagement\_id = e.id) as attachments\_count

&#x20;     FROM legal\_engagements e

&#x20;     WHERE e.id = ?

&#x20;   `, \[id])

&#x20; }

}

9\. مصفوفة التوصيات النهائية (Comprehensive Recommendations)

المجال	التحدي	الأولوية	الحل المقترح	الجدول الزمني

الأمان	تخزين التوكنات بنص عادي	حرج	استخدام safeStorage + ربط بالجهاز	2 أيام

الأمان	تعطيل contextIsolation	حرج	تفعيل العزل واستخدام preload	3 أيام

الأمان	تجاوز step-up للمدراء	حرج	إلزام التحقق بدون استثناءات	1 يوم

الأداء	تحميل جميع السجلات عند الإقلاع	مرتفع	تطبيق Lazy Loading و Pagination	5 أيام

الهندسة	الفجوة بين PostgreSQL و SQLite	مرتفع	استخدام Schema Generator موحد	أسبوعين

الهندسة	المزامنة عبر الأب (Parent-scoped)	متوسط	إضافة company\_id أو JOIN	أسبوع

الموثوقية	كتم أخطاء الإقلاع	منخفض	إضافة إشعارات UI	يومين

تجربة المستخدم	الزر المكرر في الاستعادة	منخفض	Debounce و Loading State	1 يوم

10\. خطة التنفيذ التفصيلية (Phase-by-Phase Execution)

المرحلة الأولى (الأسبوع الأول): الأمان الأساسي

تطبيق safeStorage لتخزين التوكنات.



تفعيل contextIsolation و sandbox في جميع النوافذ.



إصلاح requireDesktopBackupStepUp لإلزام التحقق.



المرحلة الثانية (الأسبوع الثاني): الأداء والموثوقية

تحويل تحميل القضايا إلى Lazy Loading.



إضافة إشعارات حالة المزامنة في UI.



تطبيق Debounce على أزرار العمليات الحساسة.



المرحلة الثالثة (الأسبوعين الثالث والرابع): الهندسة المعمارية

إنشاء Schema Generator لتوحيد قواعد البيانات.



تعديل محرك المزامنة لدعم الجداول ذات النطاق الأبوي.



ترحيل المعرف الصفري إلى UUID v4.



11\. ملاحظات إضافية (لم تُذكر في المراجعة الأصلية)

نقص اختبارات الوحدة: لا يوجد تغطية اختبارية للوظائف الأمنية الحساسة (requirePermission, verifySession). مطلوب إضافة اختبارات Jest أو Mocha.



غياب نظام التسجيل المركزي (Centralized Logging): الأخطاء تُطبع في console فقط. يوصى بإضافة نظام تسجيل مثل winston مع حفظ في ملف logs/app.log وتدوير الملفات يومياً.



عدم استخدام Content Security Policy (CSP): في بيئة الإنتاج، يجب إضافة CSP للحد من تنفيذ النصوص الضارة:



html

<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">

نقص آليات المراقبة (Monitoring): يُنصح بإضافة Sentry أو Datadog لتتبع الأخطاء في الإنتاج بشكل استباقي.



الخلاصة النهائية:

النظام يعمل حالياً، لكنه يحتاج إلى دورة تحسين أمنية وهندسية تركز على حماية البيانات، الأداء، والتوسع الأفقي. التوصيات المقدمة تمثل خريطة طريق واضحة يمكن تنفيذها خلال شهر واحد مع الحفاظ على استقرار التطبيق. بعد تنفيذ هذه التحسينات، سيكون النظام جاهزاً لبيئة إنتاج مؤسسية (Enterprise-Grade).



أتمنى أن تكون هذه التوصيات مفيدة. إذا كنت بحاجة إلى تفاصيل تنفيذية أعمق لأي من النقاط، أو كود نموذجي كامل للحلول، أنا مستعد لتقديمها.



اكتب برومبت للوكيل الاصلاح كل المشاكل مع تقرير صارم لاثبات وعدم افساد التعديل والاكواد السابقة لكلا التطبيق الويب وسطح المكتب

برومبت إصلاح شامل للتطبيقات (Web + Desktop)

🎯 الهدف العام

إجراء إصلاح شامل وممنهج لجميع المشاكل الأمنية والهندسية المحددة في تقرير المراجعة، مع ضمان عدم كسر أي وظيفة حالية، وتوثيق كل تغيير بشكل صارم.



📋 تعليمات الإصلاح العامة

القواعد الذهبية

لا تغيير بدون اختبار: كل تعديل يجب أن يكون مصحوباً باختبار يؤكد استمرار عمل الوظيفة الأصلية.



التوثيق الإجباري: كل ملف يتم تعديله يجب أن يحتوي على تعليق يوضح سبب التعديل والتاريخ.



التراجع الآمن: في حال فشل أي اختبار، يجب العودة فوراً إلى النسخة السابقة.



التغيير التدريجي: تطبيق الإصلاحات بشكل منفصل (commit واحد لكل إصلاح) لتسهيل التتبع والتراجع.



🔧 قائمة الإصلاحات المطلوبة (حسب الأولوية)

المجموعة الأولى: الإصلاحات الأمنية الحرجة (Critical Security Fixes)

1\. إصلاح تجاوز المصادقة المعززة (Step-Up Authentication Bypass)

الموقع: g:\\b2b\\src\\main\\ipc\\handlers.ts (الأسطر 97-107)



المطلوب:



typescript

// التعديل المطلوب - إزالة جميع الاستثناءات

function requireDesktopBackupStepUp(password: string): void {

&#x20; // 1. التحقق من وجود جلسة نشطة

&#x20; const session = AuthService.getSession()

&#x20; if (!session || session.isLocked) {

&#x20;   throw new Error('BACKUP\_STEP\_UP\_FAILED: No active session')

&#x20; }

&#x20; 

&#x20; // 2. التحقق الصارم من كلمة المرور - بدون استثناءات

&#x20; if (!password || typeof password !== 'string' || password.trim().length === 0) {

&#x20;   throw new Error('BACKUP\_STEP\_UP\_FAILED: Password required')

&#x20; }

&#x20; 

&#x20; // 3. المصادقة الصارمة

&#x20; if (!AuthService.verifyCurrentSessionPassword(password)) {

&#x20;   throw new Error('BACKUP\_STEP\_UP\_FAILED: Invalid password')

&#x20; }

&#x20; 

&#x20; // 4. تسجيل محاولة المصادقة الناجحة (للتدقيق)

&#x20; Logger.audit('STEP\_UP\_SUCCESS', {

&#x20;   userId: session.userId,

&#x20;   timestamp: new Date().toISOString(),

&#x20;   ipAddress: getClientIP()

&#x20; })

}

اختبارات التحقق:



□ محاولة تمرير كلمة مرور فارغة → يجب أن ترفض

□ محاولة تمرير كلمة مرور خاطئة مع مستخدم Admin → يجب أن ترفض

□ محاولة بدون جلسة نشطة → يجب أن ترفض

□ محاولة بكلمة مرور صحيحة → يجب أن تسمح

2\. إصلاح تخزين التوكنات (Secure Token Storage)

الموقع: g:\\b2b\\src\\main\\services\\SyncCredentialStore.ts



المطلوب:



typescript

import { safeStorage } from 'electron'

import crypto from 'crypto'



class SecureCredentialStore {

&#x20; private static readonly STORAGE\_FILE = 'secure-credentials.enc'

&#x20; 

&#x20; // تشفير متقدم مع ربط بالجهاز

&#x20; static async store(key: string, value: string): Promise<void> {

&#x20;   try {

&#x20;     // 1. الحصول على معرف الجهاز الفريد

&#x20;     const deviceId = await this.getDeviceId()

&#x20;     

&#x20;     // 2. ربط التوكن بمعرف الجهاز لمنع نقله لجهاز آخر

&#x20;     const payload = JSON.stringify({

&#x20;       value: value,

&#x20;       deviceId: deviceId,

&#x20;       createdAt: Date.now()

&#x20;     })

&#x20;     

&#x20;     // 3. تشفير باستخدام safeStorage

&#x20;     const encrypted = safeStorage.encryptString(payload)

&#x20;     

&#x20;     // 4. تخزين في ملف آمن

&#x20;     const filePath = path.join(app.getPath('userData'), this.STORAGE\_FILE)

&#x20;     await fs.writeFile(filePath, encrypted.toString('base64'))

&#x20;     

&#x20;     // 5. تسجيل العملية

&#x20;     Logger.info('CREDENTIAL\_STORED', { key, timestamp: new Date().toISOString() })

&#x20;     

&#x20;   } catch (error) {

&#x20;     Logger.error('CREDENTIAL\_STORE\_FAILED', error)

&#x20;     throw new Error('SECURE\_STORAGE\_FAILED')

&#x20;   }

&#x20; }

&#x20; 

&#x20; static async get(key: string): Promise<string | null> {

&#x20;   try {

&#x20;     const filePath = path.join(app.getPath('userData'), this.STORAGE\_FILE)

&#x20;     const encrypted = await fs.readFile(filePath, 'utf8')

&#x20;     

&#x20;     // فك التشفير

&#x20;     const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))

&#x20;     const payload = JSON.parse(decrypted)

&#x20;     

&#x20;     // التحقق من الجهاز

&#x20;     const currentDeviceId = await this.getDeviceId()

&#x20;     if (payload.deviceId !== currentDeviceId) {

&#x20;       Logger.warn('CREDENTIAL\_DEVICE\_MISMATCH', { 

&#x20;         storedDevice: payload.deviceId,

&#x20;         currentDevice: currentDeviceId 

&#x20;       })

&#x20;       return null

&#x20;     }

&#x20;     

&#x20;     return payload.value

&#x20;     

&#x20;   } catch (error) {

&#x20;     Logger.error('CREDENTIAL\_RETRIEVE\_FAILED', error)

&#x20;     return null

&#x20;   }

&#x20; }

&#x20; 

&#x20; private static async getDeviceId(): Promise<string> {

&#x20;   // استخدام machine-id للحصول على معرف فريد

&#x20;   const machineId = await import('node-machine-id')

&#x20;   return machineId.machineIdSync()

&#x20; }

}

اختبارات التحقق:



□ تخزين توكن واسترجاعه يعمل بشكل صحيح

□ نقل الملف المشفر لجهاز آخر يفشل في فك التشفير

□ حذف الملف المشفر يؤدي لطلب توكن جديد

3\. إصلاح تنشيط الترخيص (Licensing Activation Permission)

الموقع: g:\\b2b\\src\\main\\ipc\\handlers.ts (السطر 2068)



المطلوب:



typescript

// في licensing:activate handler

ipcMain.handle('licensing:activate', async (event, { licenseKey, activationCode }) => {

&#x20; try {

&#x20;   // 1. التحقق من حالة النظام

&#x20;   const userCount = await UserRepository.count()

&#x20;   const isFirstRun = userCount === 0

&#x20;   

&#x20;   // 2. تطبيق السياسة الأمنية

&#x20;   if (!isFirstRun) {

&#x20;     // النظام مهيأ مسبقاً - يجب أن يكون المستخدم مديراً

&#x20;     requirePermission('manage\_settings')

&#x20;   } else {

&#x20;     // أول تشغيل - السماح بالتنشيط بدون تسجيل دخول

&#x20;     Logger.info('FIRST\_RUN\_LICENSING', { 

&#x20;       timestamp: new Date().toISOString(),

&#x20;       licenseKey: licenseKey.substring(0, 8) + '\*\*\*' 

&#x20;     })

&#x20;   }

&#x20;   

&#x20;   // 3. تنفيذ التنشيط

&#x20;   const result = await LicensingService.activate(licenseKey, activationCode)

&#x20;   

&#x20;   // 4. تسجيل العملية

&#x20;   Logger.audit('LICENSE\_ACTIVATED', {

&#x20;     userId: event.sender.id,

&#x20;     licenseKey: licenseKey.substring(0, 8) + '\*\*\*',

&#x20;     success: result.success,

&#x20;     timestamp: new Date().toISOString()

&#x20;   })

&#x20;   

&#x20;   return result

&#x20;   

&#x20; } catch (error) {

&#x20;   Logger.error('LICENSE\_ACTIVATION\_FAILED', error)

&#x20;   throw error

&#x20; }

})

اختبارات التحقق:



□ تنشيط في أول تشغيل (بدون مستخدمين) يعمل بنجاح

□ تنشيط بعد وجود مستخدمين يتطلب صلاحية manage\_settings

□ محاولة تنشيط من مستخدم عادي ترفض بشكل صحيح

4\. تفعيل عزل السياق (Context Isolation)

الموقع: جميع ملفات إنشاء النوافذ في g:\\b2b\\src\\main\\windows\\



المطلوب:



typescript

// مثال: g:\\b2b\\src\\main\\windows\\MainWindow.ts

class MainWindow {

&#x20; static create(): BrowserWindow {

&#x20;   const win = new BrowserWindow({

&#x20;     width: 1200,

&#x20;     height: 800,

&#x20;     webPreferences: {

&#x20;       // 1. تفعيل العزل

&#x20;       contextIsolation: true,

&#x20;       

&#x20;       // 2. استخدام preload آمن

&#x20;       preload: path.join(\_\_dirname, '../preload/preload.js'),

&#x20;       

&#x20;       // 3. تفعيل وضع الحماية

&#x20;       sandbox: true,

&#x20;       

&#x20;       // 4. تعطيل الميزات الخطيرة

&#x20;       nodeIntegration: false,

&#x20;       enableRemoteModule: false,

&#x20;       

&#x20;       // 5. سياسة الأمان الإضافية

&#x20;       webSecurity: true,

&#x20;       allowRunningInsecureContent: false

&#x20;     }

&#x20;   })

&#x20;   

&#x20;   return win

&#x20; }

}



// إنشاء preload آمن: g:\\b2b\\src\\preload\\preload.ts

import { contextBridge, ipcRenderer } from 'electron'



// تعريف الـ API المكشوف للـ Renderer

const validChannels = \[

&#x20; 'licensing:activate',

&#x20; 'backup:create',

&#x20; 'restore:confirm',

&#x20; 'sync:start',

&#x20; 'settings:update'

]



contextBridge.exposeInMainWorld('electronAPI', {

&#x20; // طريقة آمنة للاستدعاء

&#x20; invoke: (channel: string, data: any) => {

&#x20;   if (!validChannels.includes(channel)) {

&#x20;     throw new Error(`Channel "${channel}" is not allowed`)

&#x20;   }

&#x20;   return ipcRenderer.invoke(channel, data)

&#x20; },

&#x20; 

&#x20; // طريقة آمنة للاستماع

&#x20; on: (channel: string, callback: (data: any) => void) => {

&#x20;   if (!validChannels.includes(channel)) {

&#x20;     throw new Error(`Channel "${channel}" is not allowed`)

&#x20;   }

&#x20;   const subscription = (event: any, data: any) => callback(data)

&#x20;   ipcRenderer.on(channel, subscription)

&#x20;   return () => ipcRenderer.removeListener(channel, subscription)

&#x20; }

})

اختبارات التحقق:



□ جميع النوافذ تستخدم contextIsolation: true

□ محاولة استخدام require() في الـ Renderer تفشل

□ محاولة استدعاء قناة غير مصرح بها ترفض

□ الوظائف الأساسية (تنشيط، نسخ احتياطي، استعادة) تعمل عبر الـ API الجديد

المجموعة الثانية: إصلاحات الأداء والهندسة (Performance \& Architecture)

5\. تحسين تحميل البيانات (Lazy Loading)

الموقع: g:\\b2b\\src\\main\\db\\repositories\\EngagementRepository.ts



المطلوب:



typescript

class EngagementRepository {

&#x20; // إضافة دعم للترقيم والتحميل الكسول

&#x20; async getActiveEngagementsPaginated(

&#x20;   page: number = 1, 

&#x20;   limit: number = 50,

&#x20;   filters?: EngagementFilters

&#x20; ): Promise<PaginatedResult<Engagement>> {

&#x20;   const offset = (page - 1) \* limit

&#x20;   

&#x20;   // 1. بناء الاستعلام ديناميكياً

&#x20;   let query = `

&#x20;     SELECT 

&#x20;       e.\*,

&#x20;       (SELECT COUNT(\*) FROM legal\_service\_timeline WHERE engagement\_id = e.id) as timeline\_count,

&#x20;       (SELECT COUNT(\*) FROM legal\_service\_attachments WHERE engagement\_id = e.id) as attachments\_count

&#x20;     FROM legal\_engagements e

&#x20;     WHERE e.status = 'active'

&#x20;   `

&#x20;   

&#x20;   const params: any\[] = \[]

&#x20;   

&#x20;   // 2. إضافة الفلاتر

&#x20;   if (filters?.search) {

&#x20;     query += ` AND (e.title LIKE ? OR e.reference LIKE ?)`

&#x20;     params.push(`%${filters.search}%`, `%${filters.search}%`)

&#x20;   }

&#x20;   

&#x20;   if (filters?.dateFrom) {

&#x20;     query += ` AND e.created\_at >= ?`

&#x20;     params.push(filters.dateFrom)

&#x20;   }

&#x20;   

&#x20;   // 3. الترتيب والترقيم

&#x20;   query += ` ORDER BY e.updated\_at DESC LIMIT ? OFFSET ?`

&#x20;   params.push(limit, offset)

&#x20;   

&#x20;   // 4. تنفيذ الاستعلام

&#x20;   const rows = await this.db.all(query, params)

&#x20;   

&#x20;   // 5. الحصول على العدد الإجمالي (للمساعدة في الترقيم)

&#x20;   const countQuery = `

&#x20;     SELECT COUNT(\*) as total 

&#x20;     FROM legal\_engagements e 

&#x20;     WHERE e.status = 'active'

&#x20;     ${filters?.search ? `AND (e.title LIKE ? OR e.reference LIKE ?)` : ''}

&#x20;   `

&#x20;   const countParams = filters?.search ? \[`%${filters.search}%`, `%${filters.search}%`] : \[]

&#x20;   const countResult = await this.db.get(countQuery, countParams)

&#x20;   

&#x20;   return {

&#x20;     data: rows,

&#x20;     pagination: {

&#x20;       page,

&#x20;       limit,

&#x20;       total: countResult.total,

&#x20;       totalPages: Math.ceil(countResult.total / limit)

&#x20;     }

&#x20;   }

&#x20; }

&#x20; 

&#x20; // تحميل التفاصيل عند الطلب فقط

&#x20; async getEngagementDetails(id: string): Promise<EngagementDetails | null> {

&#x20;   // تحميل البيانات الأساسية

&#x20;   const engagement = await this.db.get(

&#x20;     `SELECT \* FROM legal\_engagements WHERE id = ?`,

&#x20;     \[id]

&#x20;   )

&#x20;   

&#x20;   if (!engagement) return null

&#x20;   

&#x20;   // تحميل البيانات المرتبطة بشكل منفصل (كسول)

&#x20;   const timeline = await this.db.all(

&#x20;     `SELECT \* FROM legal\_service\_timeline WHERE engagement\_id = ? ORDER BY date DESC`,

&#x20;     \[id]

&#x20;   )

&#x20;   

&#x20;   const attachments = await this.db.all(

&#x20;     `SELECT id, filename, size, uploaded\_at FROM legal\_service\_attachments WHERE engagement\_id = ?`,

&#x20;     \[id]

&#x20;   )

&#x20;   

&#x20;   return {

&#x20;     ...engagement,

&#x20;     timeline,

&#x20;     attachments

&#x20;   }

&#x20; }

}

اختبارات التحقق:



□ تحميل الصفحة الأولى يعرض 50 سجل كحد أقصى

□ التمرير للأسفل يحمل الصفحة التالية تلقائياً

□ البحث والتصفية يعملان مع الترقيم

□ النقر على قضية يحمل التفاصيل فقط عند الحاجة

6\. إصلاح المزامنة للجداول ذات النطاق الأبوي

الموقع: g:\\w2w\\cloud-server\\src\\sync\\syncPolicy.ts



المطلوب:



typescript

// دعم المزامنة عبر العلاقات الأبوية

interface SyncEntityConfig {

&#x20; tableName: string

&#x20; tenantScope: {

&#x20;   kind: 'column' | 'join'

&#x20;   config: {

&#x20;     // للحالة column

&#x20;     columnName?: string

&#x20;     // للحالة join

&#x20;     joinConfig?: {

&#x20;       parentTable: string

&#x20;       parentColumn: string // company\_id

&#x20;       childColumn: string // engagement\_id

&#x20;       joinOn: string // engagement\_id = id

&#x20;     }

&#x20;   }

&#x20; }

}



const syncEntities: SyncEntityConfig\[] = \[

&#x20; // الجداول المباشرة (تحتوي company\_id)

&#x20; {

&#x20;   tableName: 'legal\_engagements',

&#x20;   tenantScope: {

&#x20;     kind: 'column',

&#x20;     config: { columnName: 'company\_id' }

&#x20;   }

&#x20; },

&#x20; 

&#x20; // الجداول ذات النطاق الأبوي (لا تحتوي company\_id مباشرة)

&#x20; {

&#x20;   tableName: 'legal\_service\_timeline',

&#x20;   tenantScope: {

&#x20;     kind: 'join',

&#x20;     config: {

&#x20;       parentTable: 'legal\_engagements',

&#x20;       parentColumn: 'company\_id',

&#x20;       childColumn: 'engagement\_id',

&#x20;       joinOn: 'legal\_engagements.id = legal\_service\_timeline.engagement\_id'

&#x20;     }

&#x20;   }

&#x20; },

&#x20; 

&#x20; {

&#x20;   tableName: 'legal\_service\_attachments',

&#x20;   tenantScope: {

&#x20;     kind: 'join',

&#x20;     config: {

&#x20;       parentTable: 'legal\_engagements',

&#x20;       parentColumn: 'company\_id',

&#x20;       childColumn: 'engagement\_id',

&#x20;       joinOn: 'legal\_engagements.id = legal\_service\_attachments.engagement\_id'

&#x20;     }

&#x20;   }

&#x20; }

]



// تنفيذ سياسة المزامنة

class SyncPolicy {

&#x20; static async getTenantData(

&#x20;   tenantId: string, 

&#x20;   entity: SyncEntityConfig,

&#x20;   lastSync: Date

&#x20; ): Promise<any\[]> {

&#x20;   const { tableName, tenantScope } = entity

&#x20;   

&#x20;   if (tenantScope.kind === 'column') {

&#x20;     // الحالة البسيطة

&#x20;     return await this.getDataByColumn(tenantId, tableName, tenantScope.config.columnName!, lastSync)

&#x20;   } else if (tenantScope.kind === 'join') {

&#x20;     // الحالة المعقدة - JOIN

&#x20;     const { parentTable, parentColumn, childColumn, joinOn } = tenantScope.config.joinConfig!

&#x20;     const query = `

&#x20;       SELECT t.\* 

&#x20;       FROM ${tableName} t

&#x20;       INNER JOIN ${parentTable} p ON ${joinOn}

&#x20;       WHERE p.${parentColumn} = ?

&#x20;       AND t.updated\_at > ?

&#x20;     `

&#x20;     return await this.db.all(query, \[tenantId, lastSync.toISOString()])

&#x20;   }

&#x20;   

&#x20;   throw new Error(`Unsupported tenant scope: ${tenantScope.kind}`)

&#x20; }

}

اختبارات التحقق:



□ مزامنة legal\_service\_timeline تعمل مع الشركة الصحيحة

□ مزامنة legal\_service\_attachments تعمل مع الشركة الصحيحة

□ البيانات لا تتسرب بين الشركات المختلفة

□ الاختبارات السابقة للمزامنة المباشرة لا تزال تعمل

7\. إصلاح المزامنة غير الحاجبة مع إشعارات المستخدم

الموقع: g:\\b2b\\src\\main\\services\\StartupCoordinator.ts



المطلوب:



typescript

class StartupCoordinator {

&#x20; private syncStatus: 'idle' | 'syncing' | 'success' | 'failed' = 'idle'

&#x20; private lastSyncError: Error | null = null

&#x20; 

&#x20; async initialize(): Promise<void> {

&#x20;   // 1. التحقق من الاتصال بالسحابة (غير حاجب)

&#x20;   this.checkConnectivity()

&#x20;   

&#x20;   // 2. محاولة المزامنة (غير حاجبة)

&#x20;   this.performStartupSync()

&#x20;   

&#x20;   // 3. إعداد مراقبة المزامنة

&#x20;   this.setupSyncMonitoring()

&#x20;   

&#x20;   // 4. إطلاق التطبيق (لا ينتظر المزامنة)

&#x20;   await this.launchApplication()

&#x20; }

&#x20; 

&#x20; private async performStartupSync(): Promise<void> {

&#x20;   this.syncStatus = 'syncing'

&#x20;   this.lastSyncError = null

&#x20;   

&#x20;   try {

&#x20;     // محاولة المزامنة

&#x20;     await this.transport.synchronize()

&#x20;     this.syncStatus = 'success'

&#x20;     

&#x20;     // إشعار المستخدم بالنجاح

&#x20;     this.notifyUser('تمت المزامنة مع السحابة بنجاح ✅', 'success')

&#x20;     

&#x20;   } catch (error) {

&#x20;     this.syncStatus = 'failed'

&#x20;     this.lastSyncError = error

&#x20;     

&#x20;     Logger.warn('STARTUP\_SYNC\_FAILED', error)

&#x20;     

&#x20;     // إشعار المستخدم بالفشل (غير مزعج)

&#x20;     this.notifyUser(

&#x20;       '⚠️ تعذر الاتصال بالسحابة - ستعمل محلياً وسنعيد المحاولة تلقائياً',

&#x20;       'warning',

&#x20;       { duration: 5000, dismissible: true }

&#x20;     )

&#x20;     

&#x20;     // جدولة إعادة المحاولة

&#x20;     this.scheduleRetry()

&#x20;   }

&#x20; }

&#x20; 

&#x20; private notifyUser(message: string, type: 'success' | 'warning' | 'error', options?: any) {

&#x20;   // إرسال إشعار للواجهة

&#x20;   if (this.mainWindow) {

&#x20;     this.mainWindow.webContents.send('notification:show', {

&#x20;       message,

&#x20;       type,

&#x20;       ...options

&#x20;     })

&#x20;   }

&#x20;   

&#x20;   // تسجيل في نظام التشغيل (اختياري)

&#x20;   if (type === 'error') {

&#x20;     dialog.showErrorBox('تنبيه المزامنة', message)

&#x20;   }

&#x20; }

&#x20; 

&#x20; private scheduleRetry() {

&#x20;   // إعادة المحاولة بعد 5 دقائق

&#x20;   setTimeout(() => {

&#x20;     if (this.syncStatus === 'failed') {

&#x20;       Logger.info('RETRYING\_STARTUP\_SYNC')

&#x20;       this.performStartupSync()

&#x20;     }

&#x20;   }, 5 \* 60 \* 1000)

&#x20; }

&#x20; 

&#x20; // واجهة للواجهة لمعرفة حالة المزامنة

&#x20; getSyncStatus(): { status: string; lastError?: string } {

&#x20;   return {

&#x20;     status: this.syncStatus,

&#x20;     lastError: this.lastSyncError?.message

&#x20;   }

&#x20; }

}

اختبارات التحقق:



□ التطبيق يفتح فوراً حتى في حالة عدم وجود إنترنت

□ إشعار يظهر عند نجاح المزامنة

□ إشعار يظهر عند فشل المزامنة

□ إعادة المحاولة التلقائية تعمل بعد 5 دقائق

□ يمكن للمستخدم متابعة حالة المزامنة من الواجهة

المجموعة الثالثة: إصلاحات استعادة البيانات (Data Recovery)

8\. إصلاح المرفقات الناقصة مع وضع علامات تنبيهية

الموقع: g:\\w2w\\cloud-server\\src\\recovery\\postgresRestoreAdapter.ts



المطلوب:



typescript

class PostgresRestoreAdapter {

&#x20; async restoreItem(item: RestoreItem): Promise<RestoreResult> {

&#x20;   try {

&#x20;     // 1. محاولة استعادة البيانات الأساسية

&#x20;     const result = await this.restoreBaseData(item)

&#x20;     

&#x20;     // 2. التحقق من المرفقات

&#x20;     if (item.hasAttachments) {

&#x20;       const attachmentResult = await this.restoreAttachments(item)

&#x20;       

&#x20;       if (!attachmentResult.success) {

&#x20;         // وضع علامة على الوثيقة كمفقودة المرفقات

&#x20;         await this.markAttachmentAsMissing(item)

&#x20;         

&#x20;         // تسجيل التحذير

&#x20;         Logger.warn('ATTACHMENT\_MISSING', {

&#x20;           entityId: item.id,

&#x20;           entityName: item.entityName,

&#x20;           missingFiles: attachmentResult.missingFiles

&#x20;         })

&#x20;         

&#x20;         // إضافة تحذير في نتيجة الاستعادة

&#x20;         result.warnings = result.warnings || \[]

&#x20;         result.warnings.push({

&#x20;           type: 'MISSING\_ATTACHMENTS',

&#x20;           message: `المرفقات غير موجودة للوثيقة: ${item.id}`,

&#x20;           details: attachmentResult.missingFiles

&#x20;         })

&#x20;       }

&#x20;     }

&#x20;     

&#x20;     return result

&#x20;     

&#x20;   } catch (error) {

&#x20;     Logger.error('RESTORE\_ITEM\_FAILED', error)

&#x20;     throw error

&#x20;   }

&#x20; }

&#x20; 

&#x20; private async markAttachmentAsMissing(item: RestoreItem): Promise<void> {

&#x20;   // تحديث قاعدة البيانات لوضع علامة

&#x20;   const query = `

&#x20;     UPDATE ${item.entityName}

&#x20;     SET 

&#x20;       attachment\_status = 'unbundled\_metadata\_only',

&#x20;       attachment\_missing\_since = NOW(),

&#x20;       attachment\_restore\_warning = 'تم استعادة البيانات الوصفية فقط، المرفقات غير موجودة في الحزمة'

&#x20;     WHERE id = ?

&#x20;   `

&#x20;   await this.db.run(query, \[item.id])

&#x20; }

}

اختبارات التحقق:



□ استعادة وثيقة بمرفقات ناقصة تنجح مع وضع علامة

□ ظهور تحذير في تقرير الاستعادة

□ محاولة تحميل المرفق الناقص تعرض رسالة واضحة

□ إمكانية إعادة رفع المرفق يدوياً لاحقاً

📊 تقرير الإصلاح النهائي (Final Report Template)

بعد الانتهاء من جميع الإصلاحات، يجب إنشاء تقرير يوضح:



markdown

\# تقرير إصلاح التطبيقات الشامل

\## تاريخ الإصلاح: \[YYYY-MM-DD]

\## اسم المطور: \[Your Name]



\---



\### 1. ملخص الإصلاحات

\- عدد الملفات المعدلة: X

\- عدد الإصلاحات الأمنية: X

\- عدد الإصلاحات الهندسية: X

\- عدد الإصلاحات المرتبطة بالأداء: X



\---



\### 2. قائمة الإصلاحات المنجزة



| # | الإصلاح | الموقع | الحالة | ملاحظات |

|---|---------|--------|--------|----------|

| 1 | إصلاح تجاوز المصادقة المعززة | handlers.ts | ✅ تم | تم إزالة جميع الاستثناءات |

| 2 | تأمين تخزين التوكنات | SyncCredentialStore.ts | ✅ تم | استخدام safeStorage |

| 3 | إصلاح تنشيط الترخيص | handlers.ts | ✅ تم | إضافة فحص أول تشغيل |

| 4 | تفعيل عزل السياق | جميع النوافذ | ✅ تم | تم تفعيل contextIsolation |

| 5 | تحسين تحميل البيانات | EngagementRepository.ts | ✅ تم | دعم الترقيم والتحميل الكسول |

| 6 | إصلاح مزامنة الجداول الأبوية | syncPolicy.ts | ✅ تم | دعم JOIN |

| 7 | تحسين المزامنة غير الحاجبة | StartupCoordinator.ts | ✅ تم | إضافة إشعارات |

| 8 | إصلاح المرفقات الناقصة | postgresRestoreAdapter.ts | ✅ تم | وضع علامات تنبيهية |



\---



\### 3. نتائج الاختبارات



\#### الاختبارات الأمنية

\- \[✅] جميع محاولات تجاوز المصادقة ترفض

\- \[✅] التوكنات مشفرة ومربوطة بالجهاز

\- \[✅] تنشيط الترخيص آمن في جميع السيناريوهات

\- \[✅] جميع النوافذ معزولة



\#### اختبارات الأداء

\- \[✅] تحميل الصفحات يستغرق أقل من 500ms

\- \[✅] التطبيق يفتح في أقل من 2 ثانية

\- \[✅] المزامنة لا تؤثر على سرعة التطبيق



\#### اختبارات الوظائف

\- \[✅] جميع عمليات CRUD تعمل بشكل طبيعي

\- \[✅] المزامنة تعمل مع جميع الجداول

\- \[✅] الاستعادة تعمل مع المرفقات الناقصة



\---



\### 4. التحسينات المقترحة للمستقبل



1\. إضافة اختبارات آلية (CI/CD) لتغطية جميع السيناريوهات الأمنية

2\. تنفيذ نظام مراقبة (Monitoring) مثل Sentry

3\. إضافة دعم للمصادقة البيومترية (Windows Hello)

4\. تحسين أداء المزامنة الكبيرة باستخدام الضغط (Compression)



\---



\### 5. توقيع المطور

\[اسم المطور]

\[التاريخ]

🚀 خطوات التنفيذ

نسخ احتياطي كامل للمشروعين قبل البدء



إنشاء فروع (Branches) لكل إصلاح على حدة



تنفيذ الإصلاحات حسب الأولوية المحددة



اختبار كل إصلاح بشكل منفصل



دمج الفروع بعد اجتياز الاختبارات



إنشاء التقرير النهائي وتوثيق كل تغيير



⚠️ تحذيرات مهمة

لا تقم بتعديل أكثر من ملف في نفس الوقت دون اختبار



تأكد من أن جميع الاختبارات الحالية تعمل بعد كل تعديل



استخدم نظام التحكم في الإصدارات (Git) لتتبع التغييرات



لا تنسى تحديث ملفات التوثيق (README, CHANGELOG)



احتفظ بسجل لجميع الأخطاء التي واجهتها وحلولها



📝 أمثلة لأوامر الاختبار

bash

\# تشغيل اختبارات الأمان

npm run test:security



\# تشغيل اختبارات الأداء

npm run test:performance



\# تشغيل جميع الاختبارات

npm test



\# بناء التطبيق للاختبار

npm run build:test



\# تشغيل التطبيق في وضع التصحيح

npm run dev

ملاحظة أخيرة: هذا البرومبت مصمم ليكون دليلاً شاملاً لعملية الإصلاح. تأكد من فهم كل خطوة قبل التنفيذ، ولا تتردد في طرح الأسئلة إذا كان هناك أي غموض. الأولوية القصوى هي استقرار النظام والأمان مع الحفاظ على تجربة المستخدم الحالية.



اكتب كله برومبت واحد

🚨 برومبت إصلاح شامل وتدقيق صارم للتطبيقات (Web + Desktop)

📌 هوية الوكيل المطلوب

أنت وكيل تطوير هندسي وأمني متخصص (Senior Security Engineer \& Software Architect)، مكلف بإجراء إصلاح شامل وصارم لكلا المشروعين:



تطبيق السحابة والويب والجوال: g:\\w2w



تطبيق سطح المكتب: g:\\b2b



🎯 الأهداف الرئيسية

إصلاح جميع الثغرات الأمنية المكتشفة دون المساس بوظائف النظام



تحسين الأداء والهندسة المعمارية مع الحفاظ على التوافقية



ضمان عدم كسر أي ميزة حالية من خلال اختبارات صارمة



توثيق كل تغيير بشكل احترافي لتسهيل التدقيق المستقبلي



تقديم تقرير نهائي يثبت نجاح الإصلاحات ويوضح التغييرات



📋 القواعد الذهبية للإصلاح

القاعدة الأولى: الأمان أولاً

text

\- لا تهاون في الإصلاحات الأمنية مهما كان السبب

\- كل تجاوز أمني يجب إزالته بالكامل

\- المصادقة والتفويض (Authentication \& Authorization) خط أحمر

القاعدة الثانية: التوثيق الإجباري

text

\- كل ملف يتم تعديله يجب أن يحتوي على:

&#x20; /\*\*

&#x20;  \* @security FIX: \[رقم الإصلاح] - \[وصف المشكلة]

&#x20;  \* @date \[التاريخ]

&#x20;  \* @author \[اسم المطور]

&#x20;  \* @tested \[حالة الاختبار]

&#x20;  \*/

\- يجب تحديث CHANGELOG.md بعد كل إصلاح

\- يجب إنشاء تقرير تفصيلي في نهاية المهمة

القاعدة الثالثة: الاختبار قبل الدمج

text

\- قبل تعديل أي كود: تشغيل الاختبارات الحالية للتأكد من نجاحها

\- بعد كل تعديل: تشغيل نفس الاختبارات للتأكد من عدم كسر شيء

\- إضافة اختبارات جديدة تغطي الإصلاحات الأمنية

القاعدة الرابعة: التغيير التدريجي

text

\- Commit واحد لكل إصلاح (لا تدمج إصلاحات متعددة في Commit واحد)

\- رسالة Commit موحدة: `fix(security): \[رقم الإصلاح] - \[وصف مختصر]`

\- مثال: `fix(security): FIX-001 - Remove step-up authentication bypass`

🔧 قائمة الإصلاحات المطلوبة (مرتبة حسب الأولوية)

🔴 المجموعة الأولى: الإصلاحات الأمنية الحرجة (Critical Security Fixes)

FIX-001: إزالة تجاوز المصادقة المعززة (Step-Up Authentication Bypass)

الموقع: g:\\b2b\\src\\main\\ipc\\handlers.ts (الأسطر 97-107)



المشكلة:



typescript

// ❌ الكود الحالي - خطير أمنياً

function requireDesktopBackupStepUp(password: string): void {

&#x20; const session = AuthService.getSession()

&#x20; if (!session || session.isLocked) throw new Error('BACKUP\_STEP\_UP\_FAILED')

&#x20; if (password \&\& typeof password === 'string' \&\& password.trim().length > 0) {

&#x20;   if (!AuthService.verifyCurrentSessionPassword(password)) {

&#x20;     if (session.roleKey !== 'admin') {

&#x20;       throw new Error('BACKUP\_STEP\_UP\_FAILED')

&#x20;     }

&#x20;     // ❌ إذا كان Admin وكلمة المرور خاطئة، يتم التجاهل!!!

&#x20;   }

&#x20; }

&#x20; // ❌ إذا كانت كلمة المرور فارغة، يتم التجاهل!!!

}

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - آمن تماماً

function requireDesktopBackupStepUp(password: string): void {

&#x20; // 1. التحقق من وجود جلسة نشطة

&#x20; const session = AuthService.getSession()

&#x20; if (!session || session.isLocked) {

&#x20;   Logger.warn('STEP\_UP\_FAILED', { 

&#x20;     reason: 'No active session or locked',

&#x20;     timestamp: new Date().toISOString()

&#x20;   })

&#x20;   throw new Error('BACKUP\_STEP\_UP\_FAILED: No active session')

&#x20; }

&#x20; 

&#x20; // 2. التحقق الصارم من وجود كلمة مرور

&#x20; if (!password || typeof password !== 'string' || password.trim().length === 0) {

&#x20;   Logger.warn('STEP\_UP\_FAILED', { 

&#x20;     userId: session.userId,

&#x20;     reason: 'Empty password',

&#x20;     timestamp: new Date().toISOString()

&#x20;   })

&#x20;   throw new Error('BACKUP\_STEP\_UP\_FAILED: Password is required')

&#x20; }

&#x20; 

&#x20; // 3. المصادقة الصارمة - بدون استثناءات

&#x20; const isValid = AuthService.verifyCurrentSessionPassword(password)

&#x20; if (!isValid) {

&#x20;   Logger.warn('STEP\_UP\_FAILED', { 

&#x20;     userId: session.userId,

&#x20;     reason: 'Invalid password',

&#x20;     timestamp: new Date().toISOString()

&#x20;   })

&#x20;   throw new Error('BACKUP\_STEP\_UP\_FAILED: Invalid password')

&#x20; }

&#x20; 

&#x20; // 4. تسجيل نجاح المصادقة للتدقيق

&#x20; Logger.audit('STEP\_UP\_SUCCESS', {

&#x20;   userId: session.userId,

&#x20;   role: session.roleKey,

&#x20;   timestamp: new Date().toISOString(),

&#x20;   ipAddress: getClientIP()

&#x20; })

}

اختبارات التحقق المطلوبة:



□ TC-001: تمرير كلمة مرور فارغة → يجب أن ترفض مع رسالة واضحة

□ TC-002: تمرير كلمة مرور خاطئة مع مستخدم Admin → يجب أن ترفض

□ TC-003: تمرير كلمة مرور خاطئة مع مستخدم عادي → يجب أن ترفض

□ TC-004: تمرير كلمة مرور صحيحة → يجب أن تسمح

□ TC-005: بدون جلسة نشطة → يجب أن ترفض

□ TC-006: جلسة مقفلة (Locked) → يجب أن ترفض

FIX-002: تأمين تخزين التوكنات والمفاتيح (Secure Token Storage)

الموقع: g:\\b2b\\src\\main\\services\\SyncCredentialStore.ts



المشكلة:



typescript

// ❌ الكود الحالي - غير آمن

class SyncCredentialStore {

&#x20; static store(key: string, value: string) {

&#x20;   // تخزين بنص عادي في ملف JSON

&#x20;   const data = JSON.parse(fs.readFileSync('sync-credentials.json', 'utf8'))

&#x20;   data\[key] = value

&#x20;   fs.writeFileSync('sync-credentials.json', JSON.stringify(data))

&#x20; }

}

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - آمن ومشفر

import { safeStorage } from 'electron'

import crypto from 'crypto'

import { machineId } from 'node-machine-id'



interface SecurePayload {

&#x20; value: string

&#x20; deviceId: string

&#x20; createdAt: number

&#x20; version: string

}



class SecureCredentialStore {

&#x20; private static readonly STORAGE\_FILE = 'secure-credentials.enc'

&#x20; private static readonly CURRENT\_VERSION = 'v1'

&#x20; 

&#x20; static async store(key: string, value: string): Promise<void> {

&#x20;   try {

&#x20;     // 1. الحصول على معرف الجهاز الفريد

&#x20;     const deviceId = await machineId()

&#x20;     

&#x20;     // 2. إنشاء الحزمة الآمنة

&#x20;     const payload: SecurePayload = {

&#x20;       value: value,

&#x20;       deviceId: deviceId,

&#x20;       createdAt: Date.now(),

&#x20;       version: this.CURRENT\_VERSION

&#x20;     }

&#x20;     

&#x20;     // 3. تشفير باستخدام safeStorage (مشفر بنظام التشغيل)

&#x20;     const encrypted = safeStorage.encryptString(JSON.stringify(payload))

&#x20;     

&#x20;     // 4. تخزين في ملف مشفر

&#x20;     const filePath = path.join(app.getPath('userData'), this.STORAGE\_FILE)

&#x20;     await fs.writeFile(filePath, encrypted.toString('base64'))

&#x20;     

&#x20;     // 5. تسجيل العملية للتدقيق

&#x20;     Logger.audit('CREDENTIAL\_STORED', {

&#x20;       key: key,

&#x20;       deviceId: deviceId.substring(0, 8) + '\*\*\*',

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;     

&#x20;   } catch (error) {

&#x20;     Logger.error('SECURE\_STORE\_FAILED', { key, error })

&#x20;     throw new Error('SECURE\_STORAGE\_FAILED: Unable to store credential securely')

&#x20;   }

&#x20; }

&#x20; 

&#x20; static async get(key: string): Promise<string | null> {

&#x20;   try {

&#x20;     // 1. قراءة الملف المشفر

&#x20;     const filePath = path.join(app.getPath('userData'), this.STORAGE\_FILE)

&#x20;     

&#x20;     if (!fs.existsSync(filePath)) {

&#x20;       Logger.warn('CREDENTIAL\_NOT\_FOUND', { key })

&#x20;       return null

&#x20;     }

&#x20;     

&#x20;     const encrypted = await fs.readFile(filePath, 'utf8')

&#x20;     

&#x20;     // 2. فك التشفير

&#x20;     const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))

&#x20;     const payload: SecurePayload = JSON.parse(decrypted)

&#x20;     

&#x20;     // 3. التحقق من الإصدار

&#x20;     if (payload.version !== this.CURRENT\_VERSION) {

&#x20;       Logger.warn('CREDENTIAL\_VERSION\_MISMATCH', {

&#x20;         stored: payload.version,

&#x20;         current: this.CURRENT\_VERSION

&#x20;       })

&#x20;       return null

&#x20;     }

&#x20;     

&#x20;     // 4. التحقق من الجهاز (منع النقل)

&#x20;     const currentDeviceId = await machineId()

&#x20;     if (payload.deviceId !== currentDeviceId) {

&#x20;       Logger.warn('CREDENTIAL\_DEVICE\_MISMATCH', {

&#x20;         storedDevice: payload.deviceId.substring(0, 8) + '\*\*\*',

&#x20;         currentDevice: currentDeviceId.substring(0, 8) + '\*\*\*'

&#x20;       })

&#x20;       return null

&#x20;     }

&#x20;     

&#x20;     // 5. التحقق من انتهاء الصلاحية (اختياري: 30 يوم)

&#x20;     const maxAge = 30 \* 24 \* 60 \* 60 \* 1000 // 30 days

&#x20;     if (Date.now() - payload.createdAt > maxAge) {

&#x20;       Logger.warn('CREDENTIAL\_EXPIRED', { key, age: Date.now() - payload.createdAt })

&#x20;       await this.clear()

&#x20;       return null

&#x20;     }

&#x20;     

&#x20;     Logger.audit('CREDENTIAL\_RETRIEVED', {

&#x20;       key: key,

&#x20;       deviceId: currentDeviceId.substring(0, 8) + '\*\*\*',

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;     

&#x20;     return payload.value

&#x20;     

&#x20;   } catch (error) {

&#x20;     Logger.error('SECURE\_RETRIEVE\_FAILED', { key, error })

&#x20;     return null

&#x20;   }

&#x20; }

&#x20; 

&#x20; static async clear(): Promise<void> {

&#x20;   const filePath = path.join(app.getPath('userData'), this.STORAGE\_FILE)

&#x20;   if (fs.existsSync(filePath)) {

&#x20;     await fs.unlink(filePath)

&#x20;     Logger.audit('CREDENTIALS\_CLEARED', {

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;   }

&#x20; }

&#x20; 

&#x20; static async isStored(): Promise<boolean> {

&#x20;   const filePath = path.join(app.getPath('userData'), this.STORAGE\_FILE)

&#x20;   return fs.existsSync(filePath)

&#x20; }

}

اختبارات التحقق المطلوبة:



□ TC-007: تخزين توكن واسترجاعه يعمل بشكل صحيح

□ TC-008: نقل ملف التوكنات لجهاز آخر يفشل في فك التشفير

□ TC-009: انتهاء صلاحية التوكن (30 يوم) يؤدي لطلب جديد

□ TC-010: حذف الملف المشفر يؤدي لفشل الاسترجاع

□ TC-011: محاولة فتح الملف بمحرر نصوص تظهر بيانات مشفرة فقط

FIX-003: إصلاح تنشيط الترخيص (Licensing Activation Permission)

الموقع: g:\\b2b\\src\\main\\ipc\\handlers.ts (السطر 2068)



المشكلة:



typescript

// ❌ الكود الحالي - تم حذف التحقق من الصلاحية

ipcMain.handle('licensing:activate', async (event, { licenseKey }) => {

&#x20; // requirePermission('manage\_settings') تم حذفها!!

&#x20; return LicensingService.activate(licenseKey)

})

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - مع تحقق ذكي

ipcMain.handle('licensing:activate', async (event, { licenseKey, activationCode }) => {

&#x20; try {

&#x20;   // 1. التحقق من حالة النظام

&#x20;   const userCount = await UserRepository.count()

&#x20;   const isFirstRun = userCount === 0

&#x20;   

&#x20;   let userId = null

&#x20;   let userRole = null

&#x20;   

&#x20;   // 2. تطبيق السياسة الأمنية

&#x20;   if (!isFirstRun) {

&#x20;     // 2.1 النظام مهيأ مسبقاً - يجب أن يكون المستخدم مسجلاً ومديراً

&#x20;     const session = AuthService.getSession()

&#x20;     if (!session) {

&#x20;       throw new Error('LICENSE\_ACTIVATION\_FAILED: User not logged in')

&#x20;     }

&#x20;     

&#x20;     // 2.2 التحقق من صلاحية المدير

&#x20;     if (session.roleKey !== 'admin' \&\& session.roleKey !== 'super\_admin') {

&#x20;       Logger.warn('LICENSE\_ACTIVATION\_DENIED', {

&#x20;         userId: session.userId,

&#x20;         role: session.roleKey,

&#x20;         timestamp: new Date().toISOString()

&#x20;       })

&#x20;       throw new Error('LICENSE\_ACTIVATION\_FAILED: Insufficient permissions')

&#x20;     }

&#x20;     

&#x20;     userId = session.userId

&#x20;     userRole = session.roleKey

&#x20;     

&#x20;   } else {

&#x20;     // 2.3 أول تشغيل - السماح بالتنشيط بدون تسجيل دخول

&#x20;     Logger.info('FIRST\_RUN\_LICENSING', {

&#x20;       licenseKey: licenseKey.substring(0, 8) + '\*\*\*',

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;   }

&#x20;   

&#x20;   // 3. تنفيذ التنشيط

&#x20;   const result = await LicensingService.activate(licenseKey, activationCode)

&#x20;   

&#x20;   // 4. تسجيل العملية للتدقيق

&#x20;   Logger.audit('LICENSE\_ACTIVATED', {

&#x20;     userId: userId || 'FIRST\_RUN',

&#x20;     userRole: userRole || 'FIRST\_RUN',

&#x20;     licenseKey: licenseKey.substring(0, 8) + '\*\*\*',

&#x20;     success: result.success,

&#x20;     timestamp: new Date().toISOString(),

&#x20;     ipAddress: getClientIP()

&#x20;   })

&#x20;   

&#x20;   return result

&#x20;   

&#x20; } catch (error) {

&#x20;   Logger.error('LICENSE\_ACTIVATION\_FAILED', { 

&#x20;     error: error.message,

&#x20;     licenseKey: licenseKey?.substring(0, 8) + '\*\*\*',

&#x20;     timestamp: new Date().toISOString()

&#x20;   })

&#x20;   throw error

&#x20; }

})

اختبارات التحقق المطلوبة:



□ TC-012: تنشيط في أول تشغيل (بدون مستخدمين) يعمل بنجاح

□ TC-013: تنشيط بعد وجود مستخدمين يتطلب تسجيل دخول

□ TC-014: تنشيط من مستخدم عادي (غير مدير) ترفض

□ TC-015: تنشيط من مستخدم مدير تعمل بنجاح

□ TC-016: تنشيط بمفتاح منتهي الصلاحية ترفض مع رسالة واضحة

FIX-004: تفعيل عزل السياق (Context Isolation)

الموقع: جميع ملفات إنشاء النوافذ في g:\\b2b\\src\\main\\windows\\



المشكلة:



typescript

// ❌ الكود الحالي - غير آمن

const win = new BrowserWindow({

&#x20; webPreferences: {

&#x20;   nodeIntegration: true, // خطير!

&#x20;   contextIsolation: false, // خطير!

&#x20;   enableRemoteModule: true // خطير!

&#x20; }

})

الإصلاح المطلوب:



الخطوة 1: تحديث إعدادات النوافذ



typescript

// ✅ g:\\b2b\\src\\main\\windows\\MainWindow.ts

import { BrowserWindow, app } from 'electron'

import path from 'path'



class MainWindow {

&#x20; private static instance: BrowserWindow | null = null

&#x20; 

&#x20; static create(): BrowserWindow {

&#x20;   if (this.instance) {

&#x20;     return this.instance

&#x20;   }

&#x20;   

&#x20;   const win = new BrowserWindow({

&#x20;     width: 1200,

&#x20;     height: 800,

&#x20;     minWidth: 800,

&#x20;     minHeight: 600,

&#x20;     webPreferences: {

&#x20;       // 🔒 الإعدادات الأمنية الصارمة

&#x20;       contextIsolation: true,        // عزل السياق

&#x20;       sandbox: true,                 // وضع الحماية

&#x20;       nodeIntegration: false,        // تعطيل Node.js

&#x20;       enableRemoteModule: false,     // تعطيل Remote

&#x20;       webSecurity: true,             // تفعيل الأمان

&#x20;       allowRunningInsecureContent: false,

&#x20;       spellcheck: false,

&#x20;       

&#x20;       // 🔑 استخدام Preload آمن

&#x20;       preload: path.join(\_\_dirname, '../preload/preload.js')

&#x20;     },

&#x20;     show: false,

&#x20;     backgroundColor: '#1a1a2e'

&#x20;   })

&#x20;   

&#x20;   // منع فتح الروابط في نافذة خارجية

&#x20;   win.webContents.setWindowOpenHandler(({ url }) => {

&#x20;     if (url.startsWith('https://')) {

&#x20;       shell.openExternal(url)

&#x20;     }

&#x20;     return { action: 'deny' }

&#x20;   })

&#x20;   

&#x20;   // منع التنقل

&#x20;   win.webContents.on('will-navigate', (event, navigationUrl) => {

&#x20;     const parsedUrl = new URL(navigationUrl)

&#x20;     if (parsedUrl.origin !== 'http://localhost') {

&#x20;       event.preventDefault()

&#x20;       Logger.warn('NAVIGATION\_BLOCKED', { url: navigationUrl })

&#x20;     }

&#x20;   })

&#x20;   

&#x20;   this.instance = win

&#x20;   return win

&#x20; }

}

الخطوة 2: إنشاء Preload آمن



typescript

// ✅ g:\\b2b\\src\\preload\\preload.ts

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'



// قائمة القنوات المسموح بها (Whitelist)

const ALLOWED\_CHANNELS = {

&#x20; invoke: \[

&#x20;   'licensing:activate',

&#x20;   'backup:create',

&#x20;   'restore:confirm',

&#x20;   'sync:start',

&#x20;   'sync:status',

&#x20;   'settings:update',

&#x20;   'auth:login',

&#x20;   'auth:logout',

&#x20;   'user:profile'

&#x20; ],

&#x20; on: \[

&#x20;   'notification:show',

&#x20;   'sync:progress',

&#x20;   'sync:complete',

&#x20;   'backup:progress',

&#x20;   'restore:progress'

&#x20; ]

} as const



// 🔒 واجهة آمنة للـ Renderer

contextBridge.exposeInMainWorld('electronAPI', {

&#x20; // استدعاء آمن (طلب - رد)

&#x20; invoke: async (channel: string, data: any): Promise<any> => {

&#x20;   if (!ALLOWED\_CHANNELS.invoke.includes(channel as any)) {

&#x20;     Logger.warn('INVOKE\_BLOCKED', { channel })

&#x20;     throw new Error(`Channel "${channel}" is not allowed`)

&#x20;   }

&#x20;   

&#x20;   try {

&#x20;     return await ipcRenderer.invoke(channel, data)

&#x20;   } catch (error) {

&#x20;     Logger.error('INVOKE\_FAILED', { channel, error })

&#x20;     throw error

&#x20;   }

&#x20; },

&#x20; 

&#x20; // استماع آمن (أحداث من Main)

&#x20; on: (channel: string, callback: (data: any) => void): (() => void) => {

&#x20;   if (!ALLOWED\_CHANNELS.on.includes(channel as any)) {

&#x20;     Logger.warn('ON\_BLOCKED', { channel })

&#x20;     throw new Error(`Channel "${channel}" is not allowed`)

&#x20;   }

&#x20;   

&#x20;   const subscription = (\_event: IpcRendererEvent, data: any) => {

&#x20;     try {

&#x20;       callback(data)

&#x20;     } catch (error) {

&#x20;       Logger.error('ON\_CALLBACK\_FAILED', { channel, error })

&#x20;     }

&#x20;   }

&#x20;   

&#x20;   ipcRenderer.on(channel, subscription)

&#x20;   

&#x20;   // إرجاع دالة لإلغاء الاشتراك

&#x20;   return () => {

&#x20;     ipcRenderer.removeListener(channel, subscription)

&#x20;   }

&#x20; },

&#x20; 

&#x20; // إرسال آمن (بدون انتظار رد)

&#x20; send: (channel: string, data: any): void => {

&#x20;   if (!ALLOWED\_CHANNELS.invoke.includes(channel as any) \&\& 

&#x20;       !ALLOWED\_CHANNELS.on.includes(channel as any)) {

&#x20;     Logger.warn('SEND\_BLOCKED', { channel })

&#x20;     throw new Error(`Channel "${channel}" is not allowed`)

&#x20;   }

&#x20;   

&#x20;   ipcRenderer.send(channel, data)

&#x20; },

&#x20; 

&#x20; // الحصول على معلومات البيئة

&#x20; getEnv: (): { platform: string, version: string, isDev: boolean } => {

&#x20;   return {

&#x20;     platform: process.platform,

&#x20;     version: app.getVersion(),

&#x20;     isDev: !app.isPackaged

&#x20;   }

&#x20; }

})



// تسجيل نجاح التحميل

Logger.info('PRELOAD\_LOADED', { 

&#x20; timestamp: new Date().toISOString(),

&#x20; allowedChannels: ALLOWED\_CHANNELS 

})

الخطوة 3: تحديث الواجهة (Renderer) لاستخدام الـ API الجديد



typescript

// ✅ g:\\w2w\\src\\renderer\\src\\api\\ApiAdapter.ts (تحديث)

class ApiAdapter {

&#x20; // استخدام الـ API الآمن بدلاً من الاتصال المباشر

&#x20; static async invoke<T>(channel: string, data?: any): Promise<T> {

&#x20;   try {

&#x20;     // استخدام الـ API المكشوف من Preload

&#x20;     return await window.electronAPI.invoke(channel, data)

&#x20;   } catch (error) {

&#x20;     Logger.error('API\_INVOKE\_FAILED', { channel, error })

&#x20;     throw new Error(`API call failed: ${error.message}`)

&#x20;   }

&#x20; }

&#x20; 

&#x20; // مثال: تنشيط الترخيص

&#x20; static async activateLicense(licenseKey: string, activationCode: string): Promise<LicensingResult> {

&#x20;   return this.invoke('licensing:activate', { licenseKey, activationCode })

&#x20; }

&#x20; 

&#x20; // مثال: إنشاء نسخة احتياطية

&#x20; static async createBackup(options: BackupOptions): Promise<BackupResult> {

&#x20;   return this.invoke('backup:create', options)

&#x20; }

}

اختبارات التحقق المطلوبة:



□ TC-017: جميع النوافذ تستخدم contextIsolation: true

□ TC-018: محاولة استخدام require() في الـ Renderer تفشل

□ TC-019: محاولة استدعاء قناة غير مصرح بها ترفض

□ TC-020: جميع الوظائف الأساسية تعمل عبر الـ API الجديد

□ TC-021: التنقل إلى URLs خارجية يتم منعه

🟡 المجموعة الثانية: إصلاحات الأداء والهندسة (Performance \& Architecture)

FIX-005: تحسين تحميل البيانات (Lazy Loading \& Pagination)

الموقع: g:\\b2b\\src\\main\\db\\repositories\\EngagementRepository.ts



المشكلة:



typescript

// ❌ الكود الحالي - تحميل كل شيء مرة واحدة

class EngagementRepository {

&#x20; async getAll(): Promise<Engagement\[]> {

&#x20;   return this.db.all('SELECT \* FROM legal\_engagements')

&#x20;   // ⚠️ مع 10,000 سجل، التطبيق يتجمد لمدة 3-5 ثوانٍ

&#x20; }

}

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - تحميل كسول مع ترقيم



interface PaginationOptions {

&#x20; page?: number

&#x20; limit?: number

&#x20; sortBy?: string

&#x20; sortOrder?: 'ASC' | 'DESC'

}



interface EngagementFilters {

&#x20; search?: string

&#x20; status?: 'active' | 'archived' | 'all'

&#x20; dateFrom?: Date

&#x20; dateTo?: Date

&#x20; assigneeId?: string

}



interface PaginatedResult<T> {

&#x20; data: T\[]

&#x20; pagination: {

&#x20;   page: number

&#x20;   limit: number

&#x20;   total: number

&#x20;   totalPages: number

&#x20;   hasNext: boolean

&#x20;   hasPrevious: boolean

&#x20; }

&#x20; filters?: EngagementFilters

}



class EngagementRepository {

&#x20; private readonly DEFAULT\_LIMIT = 50

&#x20; private readonly MAX\_LIMIT = 200

&#x20; 

&#x20; // 1. طريقة الترقيم الأساسية

&#x20; async getPaginated(

&#x20;   options: PaginationOptions = {},

&#x20;   filters: EngagementFilters = {}

&#x20; ): Promise<PaginatedResult<Engagement>> {

&#x20;   const page = Math.max(1, options.page || 1)

&#x20;   const limit = Math.min(options.limit || this.DEFAULT\_LIMIT, this.MAX\_LIMIT)

&#x20;   const offset = (page - 1) \* limit

&#x20;   

&#x20;   // بناء الاستعلام

&#x20;   let whereConditions: string\[] = \[]

&#x20;   const params: any\[] = \[]

&#x20;   

&#x20;   // 1.1 تطبيق الفلاتر

&#x20;   if (filters.status \&\& filters.status !== 'all') {

&#x20;     whereConditions.push('status = ?')

&#x20;     params.push(filters.status)

&#x20;   }

&#x20;   

&#x20;   if (filters.search) {

&#x20;     whereConditions.push('(title LIKE ? OR reference LIKE ? OR description LIKE ?)')

&#x20;     params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)

&#x20;   }

&#x20;   

&#x20;   if (filters.dateFrom) {

&#x20;     whereConditions.push('created\_at >= ?')

&#x20;     params.push(filters.dateFrom.toISOString())

&#x20;   }

&#x20;   

&#x20;   if (filters.dateTo) {

&#x20;     whereConditions.push('created\_at <= ?')

&#x20;     params.push(filters.dateTo.toISOString())

&#x20;   }

&#x20;   

&#x20;   if (filters.assigneeId) {

&#x20;     whereConditions.push('assignee\_id = ?')

&#x20;     params.push(filters.assigneeId)

&#x20;   }

&#x20;   

&#x20;   const whereClause = whereConditions.length > 0 

&#x20;     ? 'WHERE ' + whereConditions.join(' AND ')

&#x20;     : ''

&#x20;   

&#x20;   // 1.2 الحصول على العدد الإجمالي

&#x20;   const countQuery = `

&#x20;     SELECT COUNT(\*) as total 

&#x20;     FROM legal\_engagements 

&#x20;     ${whereClause}

&#x20;   `

&#x20;   const countResult = await this.db.get(countQuery, params)

&#x20;   const total = countResult?.total || 0

&#x20;   

&#x20;   // 1.3 الحصول على البيانات مع الترقيم

&#x20;   const sortBy = options.sortBy || 'updated\_at'

&#x20;   const sortOrder = options.sortOrder || 'DESC'

&#x20;   

&#x20;   const dataQuery = `

&#x20;     SELECT 

&#x20;       id,

&#x20;       title,

&#x20;       reference,

&#x20;       status,

&#x20;       assignee\_id,

&#x20;       created\_at,

&#x20;       updated\_at,

&#x20;       (SELECT COUNT(\*) FROM legal\_service\_timeline WHERE engagement\_id = legal\_engagements.id) as timeline\_count,

&#x20;       (SELECT COUNT(\*) FROM legal\_service\_attachments WHERE engagement\_id = legal\_engagements.id) as attachments\_count

&#x20;     FROM legal\_engagements

&#x20;     ${whereClause}

&#x20;     ORDER BY ${sortBy} ${sortOrder}

&#x20;     LIMIT ? OFFSET ?

&#x20;   `

&#x20;   

&#x20;   const dataParams = \[...params, limit, offset]

&#x20;   const data = await this.db.all(dataQuery, dataParams)

&#x20;   

&#x20;   // 1.4 حساب معلومات الترقيم

&#x20;   const totalPages = Math.ceil(total / limit)

&#x20;   

&#x20;   return {

&#x20;     data,

&#x20;     pagination: {

&#x20;       page,

&#x20;       limit,

&#x20;       total,

&#x20;       totalPages,

&#x20;       hasNext: page < totalPages,

&#x20;       hasPrevious: page > 1

&#x20;     },

&#x20;     filters

&#x20;   }

&#x20; }

&#x20; 

&#x20; // 2. تحميل التفاصيل الكاملة عند الطلب (كسول)

&#x20; async getDetails(id: string): Promise<EngagementDetails | null> {

&#x20;   // 2.1 تحميل البيانات الأساسية

&#x20;   const engagement = await this.db.get(`

&#x20;     SELECT \* FROM legal\_engagements WHERE id = ?

&#x20;   `, \[id])

&#x20;   

&#x20;   if (!engagement) return null

&#x20;   

&#x20;   // 2.2 تحميل التايملاين (كسول)

&#x20;   const timeline = await this.db.all(`

&#x20;     SELECT 

&#x20;       id,

&#x20;       date,

&#x20;       event\_type,

&#x20;       description,

&#x20;       created\_by,

&#x20;       created\_at

&#x20;     FROM legal\_service\_timeline 

&#x20;     WHERE engagement\_id = ?

&#x20;     ORDER BY date DESC, created\_at DESC

&#x20;     LIMIT 50

&#x20;   `, \[id])

&#x20;   

&#x20;   // 2.3 تحميل المرفقات (كسول)

&#x20;   const attachments = await this.db.all(`

&#x20;     SELECT 

&#x20;       id,

&#x20;       filename,

&#x20;       size,

&#x20;       mime\_type,

&#x20;       uploaded\_at,

&#x20;       uploaded\_by

&#x20;     FROM legal\_service\_attachments 

&#x20;     WHERE engagement\_id = ?

&#x20;     ORDER BY uploaded\_at DESC

&#x20;     LIMIT 20

&#x20;   `, \[id])

&#x20;   

&#x20;   // 2.4 تحميل الملاحظات (كسول)

&#x20;   const notes = await this.db.all(`

&#x20;     SELECT 

&#x20;       id,

&#x20;       content,

&#x20;       created\_at,

&#x20;       created\_by

&#x20;     FROM legal\_service\_notes 

&#x20;     WHERE engagement\_id = ?

&#x20;     ORDER BY created\_at DESC

&#x20;     LIMIT 20

&#x20;   `, \[id])

&#x20;   

&#x20;   return {

&#x20;     ...engagement,

&#x20;     timeline,

&#x20;     attachments,

&#x20;     notes,

&#x20;     \_loadedAt: new Date().toISOString()

&#x20;   }

&#x20; }

&#x20; 

&#x20; // 3. تحميل إضافي للمزيد من المرفقات (إذا لزم الأمر)

&#x20; async loadMoreAttachments(

&#x20;   engagementId: string, 

&#x20;   page: number = 1, 

&#x20;   limit: number = 20

&#x20; ): Promise<PaginatedResult<Attachment>> {

&#x20;   const offset = (page - 1) \* limit

&#x20;   

&#x20;   const totalQuery = `

&#x20;     SELECT COUNT(\*) as total 

&#x20;     FROM legal\_service\_attachments 

&#x20;     WHERE engagement\_id = ?

&#x20;   `

&#x20;   const { total } = await this.db.get(totalQuery, \[engagementId])

&#x20;   

&#x20;   const data = await this.db.all(`

&#x20;     SELECT \* FROM legal\_service\_attachments 

&#x20;     WHERE engagement\_id = ?

&#x20;     ORDER BY uploaded\_at DESC

&#x20;     LIMIT ? OFFSET ?

&#x20;   `, \[engagementId, limit, offset])

&#x20;   

&#x20;   return {

&#x20;     data,

&#x20;     pagination: {

&#x20;       page,

&#x20;       limit,

&#x20;       total,

&#x20;       totalPages: Math.ceil(total / limit),

&#x20;       hasNext: page < Math.ceil(total / limit),

&#x20;       hasPrevious: page > 1

&#x20;     }

&#x20;   }

&#x20; }

&#x20; 

&#x20; // 4. البحث السريع (للمربع العلوي)

&#x20; async quickSearch(query: string, limit: number = 10): Promise<Engagement\[]> {

&#x20;   if (!query || query.length < 2) {

&#x20;     return \[]

&#x20;   }

&#x20;   

&#x20;   return this.db.all(`

&#x20;     SELECT 

&#x20;       id,

&#x20;       title,

&#x20;       reference,

&#x20;       status,

&#x20;       updated\_at

&#x20;     FROM legal\_engagements

&#x20;     WHERE title LIKE ? OR reference LIKE ?

&#x20;     ORDER BY updated\_at DESC

&#x20;     LIMIT ?

&#x20;   `, \[`%${query}%`, `%${query}%`, limit])

&#x20; }

}

اختبارات التحقق المطلوبة:



□ TC-022: تحميل الصفحة الأولى يعرض 50 سجل كحد أقصى

□ TC-023: التمرير للأسفل يحمل الصفحة التالية تلقائياً

□ TC-024: البحث والتصفية يعملان مع الترقيم

□ TC-025: النقر على قضية يحمل التفاصيل فقط عند الحاجة

□ TC-026: تحميل المزيد من المرفقات يعمل بشكل صحيح

□ TC-027: البحث السريع يعيد نتائج في أقل من 200ms

FIX-006: إصلاح المزامنة للجداول ذات النطاق الأبوي (Parent-Scoped Sync)

الموقع: g:\\w2w\\cloud-server\\src\\sync\\syncPolicy.ts



المشكلة:



typescript

// ❌ الكود الحالي - لا يدعم الجداول التابعة

const syncPolicy = {

&#x20; entities: \['legal\_engagements'], // فقط الجداول المباشرة

&#x20; tenantScope: 'column' // يشترط وجود company\_id

}

// legal\_service\_timeline لا تحتوي company\_id → تفشل المزامنة

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - دعم العلاقات الأبوية



interface EntitySyncConfig {

&#x20; tableName: string

&#x20; primaryKey: string

&#x20; scope: {

&#x20;   type: 'direct' | 'parent'

&#x20;   config: DirectScopeConfig | ParentScopeConfig

&#x20; }

&#x20; fields: string\[]

&#x20; timestampField: string

}



interface DirectScopeConfig {

&#x20; type: 'direct'

&#x20; tenantColumn: string // company\_id

}



interface ParentScopeConfig {

&#x20; type: 'parent'

&#x20; parentTable: string

&#x20; parentKey: string // id

&#x20; childKey: string // engagement\_id

&#x20; tenantColumn: string // company\_id

&#x20; joinCondition: string // parent.id = child.engagement\_id

}



class SyncPolicy {

&#x20; private static readonly ENTITY\_CONFIGS: EntitySyncConfig\[] = \[

&#x20;   // 1. الجداول المباشرة (تحتوي company\_id)

&#x20;   {

&#x20;     tableName: 'legal\_engagements',

&#x20;     primaryKey: 'id',

&#x20;     scope: {

&#x20;       type: 'direct',

&#x20;       config: { type: 'direct', tenantColumn: 'company\_id' }

&#x20;     },

&#x20;     fields: \['id', 'title', 'reference', 'status', 'company\_id', 'created\_at', 'updated\_at'],

&#x20;     timestampField: 'updated\_at'

&#x20;   },

&#x20;   

&#x20;   // 2. الجداول التابعة (لا تحتوي company\_id مباشرة)

&#x20;   {

&#x20;     tableName: 'legal\_service\_timeline',

&#x20;     primaryKey: 'id',

&#x20;     scope: {

&#x20;       type: 'parent',

&#x20;       config: {

&#x20;         type: 'parent',

&#x20;         parentTable: 'legal\_engagements',

&#x20;         parentKey: 'id',

&#x20;         childKey: 'engagement\_id',

&#x20;         tenantColumn: 'company\_id',

&#x20;         joinCondition: 'legal\_engagements.id = legal\_service\_timeline.engagement\_id'

&#x20;       }

&#x20;     },

&#x20;     fields: \['id', 'engagement\_id', 'date', 'event\_type', 'description', 'created\_at', 'updated\_at'],

&#x20;     timestampField: 'updated\_at'

&#x20;   },

&#x20;   

&#x20;   {

&#x20;     tableName: 'legal\_service\_attachments',

&#x20;     primaryKey: 'id',

&#x20;     scope: {

&#x20;       type: 'parent',

&#x20;       config: {

&#x20;         type: 'parent',

&#x20;         parentTable: 'legal\_engagements',

&#x20;         parentKey: 'id',

&#x20;         childKey: 'engagement\_id',

&#x20;         tenantColumn: 'company\_id',

&#x20;         joinCondition: 'legal\_engagements.id = legal\_service\_attachments.engagement\_id'

&#x20;       }

&#x20;     },

&#x20;     fields: \['id', 'engagement\_id', 'filename', 'size', 'mime\_type', 'uploaded\_at', 'created\_at', 'updated\_at'],

&#x20;     timestampField: 'updated\_at'

&#x20;   },

&#x20;   

&#x20;   {

&#x20;     tableName: 'legal\_service\_notes',

&#x20;     primaryKey: 'id',

&#x20;     scope: {

&#x20;       type: 'parent',

&#x20;       config: {

&#x20;         type: 'parent',

&#x20;         parentTable: 'legal\_engagements',

&#x20;         parentKey: 'id',

&#x20;         childKey: 'engagement\_id',

&#x20;         tenantColumn: 'company\_id',

&#x20;         joinCondition: 'legal\_engagements.id = legal\_service\_notes.engagement\_id'

&#x20;       }

&#x20;     },

&#x20;     fields: \['id', 'engagement\_id', 'content', 'created\_by', 'created\_at', 'updated\_at'],

&#x20;     timestampField: 'updated\_at'

&#x20;   }

&#x20; ]

&#x20; 

&#x20; // تنفيذ المزامنة

&#x20; static async syncEntity(

&#x20;   tenantId: string,

&#x20;   entityName: string,

&#x20;   lastSync: Date,

&#x20;   batchSize: number = 100

&#x20; ): Promise<SyncResult> {

&#x20;   const config = this.ENTITY\_CONFIGS.find(c => c.tableName === entityName)

&#x20;   if (!config) {

&#x20;     throw new Error(`SYNC\_ENTITY\_NOT\_ALLOWED: ${entityName}`)

&#x20;   }

&#x20;   

&#x20;   let query: string

&#x20;   let params: any\[]

&#x20;   

&#x20;   if (config.scope.type === 'direct') {

&#x20;     // حالة بسيطة - عمود مباشر

&#x20;     const scope = config.scope.config as DirectScopeConfig

&#x20;     query = `

&#x20;       SELECT ${config.fields.join(', ')}

&#x20;       FROM ${config.tableName}

&#x20;       WHERE ${scope.tenantColumn} = ?

&#x20;         AND ${config.timestampField} > ?

&#x20;       ORDER BY ${config.timestampField} ASC

&#x20;       LIMIT ?

&#x20;     `

&#x20;     params = \[tenantId, lastSync.toISOString(), batchSize]

&#x20;     

&#x20;   } else {

&#x20;     // حالة معقدة - JOIN مع الجدول الأب

&#x20;     const scope = config.scope.config as ParentScopeConfig

&#x20;     query = `

&#x20;       SELECT ${config.fields.map(f => `${config.tableName}.${f}`).join(', ')}

&#x20;       FROM ${config.tableName}

&#x20;       INNER JOIN ${scope.parentTable}

&#x20;         ON ${scope.joinCondition}

&#x20;       WHERE ${scope.parentTable}.${scope.tenantColumn} = ?

&#x20;         AND ${config.tableName}.${config.timestampField} > ?

&#x20;       ORDER BY ${config.tableName}.${config.timestampField} ASC

&#x20;       LIMIT ?

&#x20;     `

&#x20;     params = \[tenantId, lastSync.toISOString(), batchSize]

&#x20;   }

&#x20;   

&#x20;   const rows = await this.db.all(query, params)

&#x20;   

&#x20;   return {

&#x20;     entityName,

&#x20;     count: rows.length,

&#x20;     data: rows,

&#x20;     hasMore: rows.length === batchSize

&#x20;   }

&#x20; }

&#x20; 

&#x20; // التحقق من صحة الإعدادات

&#x20; static validateConfigs(): void {

&#x20;   for (const config of this.ENTITY\_CONFIGS) {

&#x20;     if (config.scope.type === 'parent') {

&#x20;       const scope = config.scope.config as ParentScopeConfig

&#x20;       // تأكد من وجود الجداول

&#x20;       const parentExists = this.tableExists(scope.parentTable)

&#x20;       const childExists = this.tableExists(config.tableName)

&#x20;       

&#x20;       if (!parentExists || !childExists) {

&#x20;         throw new Error(`INVALID\_SYNC\_CONFIG: Missing table for ${config.tableName}`)

&#x20;       }

&#x20;       

&#x20;       // تأكد من وجود الأعمدة

&#x20;       const columns = this.getTableColumns(config.tableName)

&#x20;       const requiredColumns = \[config.primaryKey, config.scope.config.childKey, config.timestampField]

&#x20;       

&#x20;       for (const col of requiredColumns) {

&#x20;         if (!columns.includes(col)) {

&#x20;           throw new Error(`INVALID\_SYNC\_CONFIG: Missing column ${col} in ${config.tableName}`)

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;   }

&#x20; }

}

اختبارات التحقق المطلوبة:



□ TC-028: مزامنة legal\_service\_timeline تعمل مع الشركة الصحيحة

□ TC-029: مزامنة legal\_service\_attachments تعمل مع الشركة الصحيحة

□ TC-030: البيانات لا تتسرب بين الشركات المختلفة

□ TC-031: المزامنة المباشرة (legal\_engagements) لا تزال تعمل

□ TC-032: التحقق من صحة الإعدادات (Validation) يعمل بشكل صحيح

FIX-007: تحسين المزامنة غير الحاجبة مع إشعارات المستخدم

الموقع: g:\\b2b\\src\\main\\services\\StartupCoordinator.ts



المشكلة:



typescript

// ❌ الكود الحالي - المزامنة تفشل بصمت

try {

&#x20; await this.transport.synchronize()

} catch (syncError) {

&#x20; console.warn('\[StartupCoordinator] Startup sync non-blocking error:', syncError)

&#x20; // ⚠️ المستخدم لا يعلم بفشل المزامنة!

}

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - مع إشعارات ذكية



type SyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'failed'

type ConnectivityStatus = 'online' | 'offline' | 'unknown'



interface SyncState {

&#x20; status: SyncStatus

&#x20; lastSync: Date | null

&#x20; lastError: string | null

&#x20; retryCount: number

&#x20; isRetrying: boolean

}



class StartupCoordinator {

&#x20; private syncState: SyncState = {

&#x20;   status: 'idle',

&#x20;   lastSync: null,

&#x20;   lastError: null,

&#x20;   retryCount: 0,

&#x20;   isRetrying: false

&#x20; }

&#x20; 

&#x20; private connectivityStatus: ConnectivityStatus = 'unknown'

&#x20; private connectivityCheckInterval: NodeJS.Timeout | null = null

&#x20; private syncRetryTimeout: NodeJS.Timeout | null = null

&#x20; 

&#x20; private mainWindow: BrowserWindow | null = null

&#x20; 

&#x20; async initialize(mainWindow: BrowserWindow): Promise<void> {

&#x20;   this.mainWindow = mainWindow

&#x20;   

&#x20;   // 1. التحقق من الاتصال (غير حاجب)

&#x20;   await this.checkConnectivity()

&#x20;   

&#x20;   // 2. بدء مراقبة الاتصال

&#x20;   this.startConnectivityMonitoring()

&#x20;   

&#x20;   // 3. محاولة المزامنة (غير حاجبة)

&#x20;   this.performStartupSync()

&#x20;   

&#x20;   // 4. إطلاق التطبيق (لا ينتظر المزامنة)

&#x20;   await this.launchApplication()

&#x20; }

&#x20; 

&#x20; private async performStartupSync(): Promise<void> {

&#x20;   // التحقق من حالة الاتصال

&#x20;   if (this.connectivityStatus === 'offline') {

&#x20;     this.notifyUser(

&#x20;       '⚠️ لا يوجد اتصال بالإنترنت - ستعمل محلياً وسنحاول المزامنة تلقائياً',

&#x20;       'warning'

&#x20;     )

&#x20;     this.syncState.status = 'failed'

&#x20;     this.syncState.lastError = 'No internet connection'

&#x20;     return

&#x20;   }

&#x20;   

&#x20;   this.syncState.status = 'syncing'

&#x20;   this.syncState.retryCount = 0

&#x20;   

&#x20;   try {

&#x20;     // محاولة المزامنة

&#x20;     const result = await this.transport.synchronize()

&#x20;     

&#x20;     this.syncState.status = 'success'

&#x20;     this.syncState.lastSync = new Date()

&#x20;     this.syncState.lastError = null

&#x20;     this.syncState.retryCount = 0

&#x20;     

&#x20;     // إشعار نجاح

&#x20;     this.notifyUser(

&#x20;       `✅ تمت المزامنة مع السحابة بنجاح (${result.syncedItems} عنصر)`,

&#x20;       'success'

&#x20;     )

&#x20;     

&#x20;     Logger.info('STARTUP\_SYNC\_SUCCESS', {

&#x20;       syncedItems: result.syncedItems,

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;     

&#x20;   } catch (error) {

&#x20;     this.syncState.status = 'failed'

&#x20;     this.syncState.lastError = error.message

&#x20;     this.syncState.retryCount++

&#x20;     

&#x20;     Logger.warn('STARTUP\_SYNC\_FAILED', {

&#x20;       error: error.message,

&#x20;       retryCount: this.syncState.retryCount,

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;     

&#x20;     // إشعار فشل (غير مزعج)

&#x20;     this.notifyUser(

&#x20;       '⚠️ تعذر الاتصال بالسحابة - ستعمل محلياً وسنعيد المحاولة تلقائياً',

&#x20;       'warning'

&#x20;     )

&#x20;     

&#x20;     // جدولة إعادة المحاولة

&#x20;     this.scheduleSyncRetry()

&#x20;   }

&#x20; }

&#x20; 

&#x20; private scheduleSyncRetry(): void {

&#x20;   // تنظيف أي موقت سابق

&#x20;   if (this.syncRetryTimeout) {

&#x20;     clearTimeout(this.syncRetryTimeout)

&#x20;   }

&#x20;   

&#x20;   // حساب وقت الانتظار (تزايدي)

&#x20;   const delays = \[30000, 60000, 120000, 300000, 600000] // 30s, 1m, 2m, 5m, 10m

&#x20;   const index = Math.min(this.syncState.retryCount - 1, delays.length - 1)

&#x20;   const delay = delays\[index] || 600000

&#x20;   

&#x20;   this.syncState.isRetrying = true

&#x20;   

&#x20;   this.syncRetryTimeout = setTimeout(async () => {

&#x20;     Logger.info('SYNC\_RETRY\_ATTEMPT', {

&#x20;       attempt: this.syncState.retryCount + 1,

&#x20;       delay: delay / 1000 + 's'

&#x20;     })

&#x20;     

&#x20;     await this.performStartupSync()

&#x20;     this.syncState.isRetrying = false

&#x20;   }, delay)

&#x20; }

&#x20; 

&#x20; private async checkConnectivity(): Promise<void> {

&#x20;   try {

&#x20;     // محاولة الاتصال بالسحابة

&#x20;     const response = await this.transport.ping()

&#x20;     this.connectivityStatus = response.success ? 'online' : 'offline'

&#x20;     

&#x20;     if (response.success) {

&#x20;       Logger.info('CONNECTIVITY\_ONLINE', {

&#x20;         timestamp: new Date().toISOString()

&#x20;       })

&#x20;     }

&#x20;     

&#x20;   } catch (error) {

&#x20;     this.connectivityStatus = 'offline'

&#x20;     Logger.warn('CONNECTIVITY\_OFFLINE', {

&#x20;       error: error.message,

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;   }

&#x20; }

&#x20; 

&#x20; private startConnectivityMonitoring(): void {

&#x20;   // فحص الاتصال كل 60 ثانية

&#x20;   this.connectivityCheckInterval = setInterval(() => {

&#x20;     this.checkConnectivity()

&#x20;     

&#x20;     // إذا عاد الاتصال وكانت المزامنة فاشلة، حاول مرة أخرى

&#x20;     if (this.connectivityStatus === 'online' \&\& 

&#x20;         this.syncState.status === 'failed' \&\&

&#x20;         !this.syncState.isRetrying) {

&#x20;       Logger.info('CONNECTION\_RESTORED\_ATTEMPTING\_SYNC')

&#x20;       this.scheduleSyncRetry()

&#x20;     }

&#x20;     

&#x20;     // تحديث حالة الاتصال في الواجهة

&#x20;     this.updateSyncStatusUI()

&#x20;     

&#x20;   }, 60000) // كل دقيقة

&#x20; }

&#x20; 

&#x20; private notifyUser(message: string, type: 'success' | 'warning' | 'error'): void {

&#x20;   if (!this.mainWindow) return

&#x20;   

&#x20;   // إرسال إشعار للواجهة

&#x20;   this.mainWindow.webContents.send('notification:show', {

&#x20;     message,

&#x20;     type,

&#x20;     duration: type === 'error' ? 10000 : 5000,

&#x20;     dismissible: true

&#x20;   })

&#x20;   

&#x20;   // تسجيل في نظام التشغيل (حالة الخطأ فقط)

&#x20;   if (type === 'error') {

&#x20;     dialog.showErrorBox('تنبيه المزامنة', message)

&#x20;   }

&#x20; }

&#x20; 

&#x20; private updateSyncStatusUI(): void {

&#x20;   if (!this.mainWindow) return

&#x20;   

&#x20;   // إرسال حالة المزامنة للواجهة لعرض أيقونة الحالة

&#x20;   this.mainWindow.webContents.send('sync:status', {

&#x20;     status: this.syncState.status,

&#x20;     lastSync: this.syncState.lastSync,

&#x20;     lastError: this.syncState.lastError,

&#x20;     isRetrying: this.syncState.isRetrying,

&#x20;     connectivity: this.connectivityStatus,

&#x20;     retryCount: this.syncState.retryCount

&#x20;   })

&#x20; }

&#x20; 

&#x20; // تنظيف عند إغلاق التطبيق

&#x20; async shutdown(): Promise<void> {

&#x20;   if (this.connectivityCheckInterval) {

&#x20;     clearInterval(this.connectivityCheckInterval)

&#x20;   }

&#x20;   if (this.syncRetryTimeout) {

&#x20;     clearTimeout(this.syncRetryTimeout)

&#x20;   }

&#x20; }

&#x20; 

&#x20; // واجهة للواجهة للتحكم اليدوي

&#x20; async manualSync(): Promise<SyncResult> {

&#x20;   if (this.syncState.status === 'syncing') {

&#x20;     throw new Error('SYNC\_ALREADY\_IN\_PROGRESS')

&#x20;   }

&#x20;   

&#x20;   // إلغاء أي إعادة محاولة معلقة

&#x20;   if (this.syncRetryTimeout) {

&#x20;     clearTimeout(this.syncRetryTimeout)

&#x20;     this.syncState.isRetrying = false

&#x20;   }

&#x20;   

&#x20;   this.notifyUser('🔄 جاري المزامنة مع السحابة...', 'info')

&#x20;   

&#x20;   await this.performStartupSync()

&#x20;   

&#x20;   return {

&#x20;     status: this.syncState.status,

&#x20;     lastSync: this.syncState.lastSync,

&#x20;     error: this.syncState.lastError

&#x20;   }

&#x20; }

}

اختبارات التحقق المطلوبة:



□ TC-033: التطبيق يفتح فوراً حتى في حالة عدم وجود إنترنت

□ TC-034: إشعار يظهر عند نجاح المزامنة

□ TC-035: إشعار يظهر عند فشل المزامنة

□ TC-036: إعادة المحاولة التلقائية تعمل مع تأخير تزايدي

□ TC-037: يمكن للمستخدم متابعة حالة المزامنة من الواجهة

□ TC-038: عند عودة الاتصال، تتم إعادة المحاولة تلقائياً

□ TC-039: المزامنة اليدوية تعمل عند طلب المستخدم

🟢 المجموعة الثالثة: إصلاحات استعادة البيانات (Data Recovery)

FIX-008: إصلاح المرفقات الناقصة مع وضع علامات تنبيهية

الموقع: g:\\w2w\\cloud-server\\src\\recovery\\postgresRestoreAdapter.ts



المشكلة:



typescript

// ❌ الكود الحالي - يتم تجاهل المرفقات الناقصة بصمت

console.warn(`\[RESTORE\_ATTACHMENT] Attachment bytes not packaged...`)

// ⚠️ المستخدم لا يعلم أن المرفقات مفقودة حتى يحاول تحميلها

الإصلاح المطلوب:



typescript

// ✅ الكود الجديد - وضع علامات واضحة على المرفقات الناقصة



interface RestoreItem {

&#x20; id: string

&#x20; entityName: string

&#x20; row: Record<string, any>

&#x20; attachments?: Array<{

&#x20;   id: string

&#x20;   filename: string

&#x20;   size: number

&#x20;   contentType: string

&#x20;   data: Buffer | null // null إذا كان مفقوداً

&#x20; }>

}



interface RestoreResult {

&#x20; success: boolean

&#x20; entityName: string

&#x20; id: string

&#x20; warnings: RestoreWarning\[]

&#x20; errors: RestoreError\[]

&#x20; stats: {

&#x20;   fieldsRestored: number

&#x20;   attachmentsRestored: number

&#x20;   attachmentsMissing: number

&#x20;   totalTime: number

&#x20; }

}



interface RestoreWarning {

&#x20; type: 'MISSING\_ATTACHMENT' | 'INVALID\_DATA' | 'SCHEMA\_MISMATCH'

&#x20; message: string

&#x20; details: any

}



class PostgresRestoreAdapter {

&#x20; async restoreItem(item: RestoreItem): Promise<RestoreResult> {

&#x20;   const startTime = Date.now()

&#x20;   const warnings: RestoreWarning\[] = \[]

&#x20;   const errors: RestoreError\[] = \[]

&#x20;   let attachmentsRestored = 0

&#x20;   let attachmentsMissing = 0

&#x20;   

&#x20;   try {

&#x20;     // 1. استعادة البيانات الأساسية

&#x20;     const baseResult = await this.restoreBaseData(item)

&#x20;     

&#x20;     if (!baseResult.success) {

&#x20;       errors.push({

&#x20;         type: 'BASE\_DATA\_RESTORE\_FAILED',

&#x20;         message: 'Failed to restore base data',

&#x20;         details: baseResult.error

&#x20;       })

&#x20;       

&#x20;       return {

&#x20;         success: false,

&#x20;         entityName: item.entityName,

&#x20;         id: item.id,

&#x20;         warnings,

&#x20;         errors,

&#x20;         stats: {

&#x20;           fieldsRestored: 0,

&#x20;           attachmentsRestored: 0,

&#x20;           attachmentsMissing: 0,

&#x20;           totalTime: Date.now() - startTime

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;     

&#x20;     // 2. معالجة المرفقات

&#x20;     if (item.attachments \&\& item.attachments.length > 0) {

&#x20;       for (const attachment of item.attachments) {

&#x20;         try {

&#x20;           if (attachment.data \&\& attachment.data.length > 0) {

&#x20;             // 2.1 المرفق موجود - استعادته

&#x20;             await this.restoreAttachment(attachment, item.id)

&#x20;             attachmentsRestored++

&#x20;           } else {

&#x20;             // 2.2 المرفق مفقود - وضع علامة

&#x20;             await this.markAttachmentAsMissing(attachment, item)

&#x20;             attachmentsMissing++

&#x20;             

&#x20;             warnings.push({

&#x20;               type: 'MISSING\_ATTACHMENT',

&#x20;               message: `الملف "${attachment.filename}" غير موجود في حزمة الاستعادة`,

&#x20;               details: {

&#x20;                 attachmentId: attachment.id,

&#x20;                 filename: attachment.filename,

&#x20;                 expectedSize: attachment.size

&#x20;               }

&#x20;             })

&#x20;             

&#x20;             Logger.warn('ATTACHMENT\_MISSING\_IN\_RESTORE', {

&#x20;               entityId: item.id,

&#x20;               entityName: item.entityName,

&#x20;               attachmentId: attachment.id,

&#x20;               filename: attachment.filename,

&#x20;               timestamp: new Date().toISOString()

&#x20;             })

&#x20;           }

&#x20;         } catch (error) {

&#x20;           // 2.3 فشل استعادة المرفق - تسجيل الخطأ

&#x20;           errors.push({

&#x20;             type: 'ATTACHMENT\_RESTORE\_FAILED',

&#x20;             message: `Failed to restore attachment: ${attachment.filename}`,

&#x20;             details: error.message

&#x20;           })

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;     

&#x20;     // 3. إنشاء تقرير الاستعادة

&#x20;     const result: RestoreResult = {

&#x20;       success: errors.length === 0,

&#x20;       entityName: item.entityName,

&#x20;       id: item.id,

&#x20;       warnings,

&#x20;       errors,

&#x20;       stats: {

&#x20;         fieldsRestored: baseResult.fieldsRestored || 0,

&#x20;         attachmentsRestored,

&#x20;         attachmentsMissing,

&#x20;         totalTime: Date.now() - startTime

&#x20;       }

&#x20;     }

&#x20;     

&#x20;     // 4. تسجيل الاستعادة كاملة

&#x20;     Logger.audit('RESTORE\_COMPLETED', {

&#x20;       entityName: item.entityName,

&#x20;       id: item.id,

&#x20;       warnings: warnings.length,

&#x20;       errors: errors.length,

&#x20;       attachmentsRestored,

&#x20;       attachmentsMissing,

&#x20;       totalTime: result.stats.totalTime,

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;     

&#x20;     // 5. إذا كان هناك مرفقات مفقودة، إرسال تحذير للمستخدم

&#x20;     if (attachmentsMissing > 0) {

&#x20;       await this.notifyUserOfMissingAttachments(item, attachmentsMissing)

&#x20;     }

&#x20;     

&#x20;     return result

&#x20;     

&#x20;   } catch (error) {

&#x20;     Logger.error('RESTORE\_ITEM\_CRITICAL\_FAILURE', {

&#x20;       entityName: item.entityName,

&#x20;       id: item.id,

&#x20;       error: error.message,

&#x20;       timestamp: new Date().toISOString()

&#x20;     })

&#x20;     

&#x20;     return {

&#x20;       success: false,

&#x20;       entityName: item.entityName,

&#x20;       id: item.id,

&#x20;       warnings,

&#x20;       errors: \[

&#x20;         ...errors,

&#x20;         {

&#x20;           type: 'CRITICAL\_FAILURE',

&#x20;           message: 'Restore process failed critically',

&#x20;           details: error.message

&#x20;         }

&#x20;       ],

&#x20;       stats: {

&#x20;         fieldsRestored: 0,

&#x20;         attachmentsRestored: 0,

&#x20;         attachmentsMissing: 0,

&#x20;         totalTime: Date.now() - startTime

&#x20;       }

&#x20;     }

&#x20;   }

&#x20; }

&#x20; 

&#x20; private async markAttachmentAsMissing(

&#x20;   attachment: any,

&#x20;   item: RestoreItem

&#x20; ): Promise<void> {

&#x20;   // تحديث قاعدة البيانات لتعليم المرفق كمفقود

&#x20;   const query = `

&#x20;     UPDATE ${item.entityName}

&#x20;     SET 

&#x20;       attachment\_status = 'unbundled\_metadata\_only',

&#x20;       attachment\_missing\_since = NOW(),

&#x20;       attachment\_restore\_warning = $1,

&#x20;       attachment\_name = $2,

&#x20;       attachment\_size = $3,

&#x20;       attachment\_content\_type = $4

&#x20;     WHERE id = $5

&#x20;   `

&#x20;   

&#x20;   const warningMessage = 

&#x20;     `تم استعادة البيانات الوصفية فقط للمرفق "${attachment.filename}". ` +

&#x20;     `الملف غير موجود في حزمة الاستعادة. يرجى إعادة رفع الملف يدوياً.`

&#x20;   

&#x20;   await this.db.run(query, \[

&#x20;     warningMessage,

&#x20;     attachment.filename,

&#x20;     attachment.size || 0,

&#x20;     attachment.contentType || 'unknown',

&#x20;     item.id

&#x20;   ])

&#x20;   

&#x20;   // إنشاء سجل في جدول المفقودات

&#x20;   await this.logMissingAttachment(item.id, attachment)

&#x20; }

&#x20; 

&#x20; private async logMissingAttachment(entityId: string, attachment: any): Promise<void> {

&#x20;   await this.db.run(`

&#x20;     INSERT INTO missing\_attachments (

&#x20;       entity\_id,

&#x20;       entity\_type,

&#x20;       attachment\_id,

&#x20;       filename,

&#x20;       expected\_size,

&#x20;       content\_type,

&#x20;       restore\_date,

&#x20;       status

&#x20;     ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'pending')

&#x20;   `, \[

&#x20;     entityId,

&#x20;     attachment.entityName || 'unknown',

&#x20;     attachment.id,

&#x20;     attachment.filename,

&#x20;     attachment.size || 0,

&#x20;     attachment.contentType || 'unknown'

&#x20;   ])

&#x20; }

&#x20; 

&#x20; private async notifyUserOfMissingAttachments(

&#x20;   item: RestoreItem,

&#x20;   missingCount: number

&#x20; ): Promise<void> {

&#x20;   // إرسال إشعار للمستخدم (عبر WebSocket أو البريد)

&#x20;   const notification = {

&#x20;     type: 'RESTORE\_WARNING',

&#x20;     title: 'تحذير: مرفقات مفقودة في الاستعادة',

&#x20;     message: `تم استعادة البيانات الأساسية للوثيقة "${item.id}" ولكن ${missingCount} من المرفقات غير موجودة في حزمة الاستعادة. يرجى مراجعة تقرير الاستعادة وإعادة رفع الملفات المفقودة.`,

&#x20;     details: {

&#x20;       entityId: item.id,

&#x20;       missingCount: missingCount,

&#x20;       timestamp: new Date().toISOString()

&#x20;     }

&#x20;   }

&#x20;   

&#x20;   // حفظ الإشعار في قاعدة البيانات

&#x20;   await this.saveNotification(notification)

&#x20;   

&#x20;   // إرسال عبر WebSocket إذا كان متصلاً

&#x20;   if (this.wsServer) {

&#x20;     this.wsServer.emit('notification', notification)

&#x20;   }

&#x20; }

&#x20; 

&#x20; // طريقة للحصول على تقرير الاستعادة للمستخدم

&#x20; async getRestoreReport(entityId: string): Promise<RestoreReport> {

&#x20;   const attachments = await this.db.all(`

&#x20;     SELECT 

&#x20;       filename,

&#x20;       attachment\_status,

&#x20;       attachment\_restore\_warning,

&#x20;       attachment\_missing\_since,

&#x20;       created\_at

&#x20;     FROM ${item.entityName}

&#x20;     WHERE id = ?

&#x20;   `, \[entityId])

&#x20;   

&#x20;   const missingAttachments = await this.db.all(`

&#x20;     SELECT 

&#x20;       filename,

&#x20;       expected\_size,

&#x20;       restore\_date,

&#x20;       status

&#x20;     FROM missing\_attachments

&#x20;     WHERE entity\_id = ?

&#x20;     ORDER BY restore\_date DESC

&#x20;   `, \[entityId])

&#x20;   

&#x20;   return {

&#x20;     entityId,

&#x20;     attachments,

&#x20;     missingAttachments,

&#x20;     summary: {

&#x20;       totalAttachments: attachments.length,

&#x20;       missingAttachments: missingAttachments.length,

&#x20;       restoredSuccessfully: attachments.length - missingAttachments.length,

&#x20;       restoreDate: new Date().toISOString()

&#x20;     }

&#x20;   }

&#x20; }

}



// واجهة المستخدم لتقرير الاستعادة

interface RestoreReport {

&#x20; entityId: string

&#x20; attachments: Array<{

&#x20;   filename: string

&#x20;   attachment\_status: string

&#x20;   attachment\_restore\_warning?: string

&#x20;   attachment\_missing\_since?: string

&#x20;   created\_at: string

&#x20; }>

&#x20; missingAttachments: Array<{

&#x20;   filename: string

&#x20;   expected\_size: number

&#x20;   restore\_date: string

&#x20;   status: string

&#x20; }>

&#x20; summary: {

&#x20;   totalAttachments: number

&#x20;   missingAttachments: number

&#x20;   restoredSuccessfully: number

&#x20;   restoreDate: string

&#x20; }

}

اختبارات التحقق المطلوبة:



□ TC-040: استعادة وثيقة بمرفقات ناقصة تنجح مع وضع علامة

□ TC-041: ظهور تحذير في تقرير الاستعادة للمرفقات المفقودة

□ TC-042: محاولة تحميل المرفق الناقص تعرض رسالة واضحة

□ TC-043: إمكانية إعادة رفع المرفق يدوياً لاحقاً

□ TC-044: تسجيل المرفقات المفقودة في جدول خاص

□ TC-045: إشعار المستخدم عند وجود مرفقات مفقودة

🧪 خطة الاختبارات الشاملة

اختبارات الأمان (Security Tests)

typescript

// test/security/security.test.ts

describe('🔒 Security Tests', () => {

&#x20; describe('FIX-001: Step-Up Authentication', () => {

&#x20;   it('should reject empty password', () => {

&#x20;     expect(() => requireDesktopBackupStepUp('')).toThrow('BACKUP\_STEP\_UP\_FAILED')

&#x20;   })

&#x20;   

&#x20;   it('should reject invalid password for admin', () => {

&#x20;     // محاكاة جلسة Admin

&#x20;     expect(() => requireDesktopBackupStepUp('wrongpassword')).toThrow('BACKUP\_STEP\_UP\_FAILED')

&#x20;   })

&#x20;   

&#x20;   it('should accept valid password', () => {

&#x20;     // محاكاة جلسة مع كلمة مرور صحيحة

&#x20;     expect(() => requireDesktopBackupStepUp('correctpassword')).not.toThrow()

&#x20;   })

&#x20; })

&#x20; 

&#x20; describe('FIX-002: Secure Token Storage', () => {

&#x20;   it('should store and retrieve token securely', async () => {

&#x20;     const token = 'test-token-123'

&#x20;     await SecureCredentialStore.store('test', token)

&#x20;     const retrieved = await SecureCredentialStore.get('test')

&#x20;     expect(retrieved).toBe(token)

&#x20;   })

&#x20;   

&#x20;   it('should fail on different device', async () => {

&#x20;     // محاكاة جهاز مختلف

&#x20;     const token = await SecureCredentialStore.get('test')

&#x20;     expect(token).toBeNull()

&#x20;   })

&#x20; })

})

اختبارات الأداء (Performance Tests)

typescript

// test/performance/performance.test.ts

describe('⚡ Performance Tests', () => {

&#x20; describe('FIX-005: Lazy Loading', () => {

&#x20;   it('should load first page in under 500ms', async () => {

&#x20;     const start = Date.now()

&#x20;     const result = await repo.getPaginated({ page: 1, limit: 50 })

&#x20;     const duration = Date.now() - start

&#x20;     expect(duration).toBeLessThan(500)

&#x20;     expect(result.data.length).toBeLessThanOrEqual(50)

&#x20;   })

&#x20;   

&#x20;   it('should load details lazily', async () => {

&#x20;     const start = Date.now()

&#x20;     const details = await repo.getDetails('test-id')

&#x20;     const duration = Date.now() - start

&#x20;     expect(duration).toBeLessThan(300)

&#x20;     expect(details).toHaveProperty('timeline')

&#x20;     expect(details).toHaveProperty('attachments')

&#x20;   })

&#x20; })

})

📝 تقرير الإصلاح النهائي (Final Report)

نموذج التقرير الواجب تقديمه

markdown

\# 📊 تقرير الإصلاح الشامل للتطبيقات



\## معلومات التقرير

\- \*\*التاريخ:\*\* \[YYYY-MM-DD]

\- \*\*المطور:\*\* \[اسم المطور]

\- \*\*الإصدار:\*\* \[vX.X.X]

\- \*\*المشاريع:\*\* g:\\w2w (Web/Cloud) + g:\\b2b (Desktop)



\---



\## ✅ الإصلاحات المنجزة



\### 🔴 المجموعة الأولى: الأمنية (Critical)

| الرمز | الإصلاح | الملفات المعدلة | الحالة | الاختبارات |

|-------|---------|----------------|--------|-----------|

| FIX-001 | إزالة تجاوز المصادقة | handlers.ts | ✅ تم | 6/6 نجاح |

| FIX-002 | تشفير التوكنات | SyncCredentialStore.ts | ✅ تم | 5/5 نجاح |

| FIX-003 | إصلاح تنشيط الترخيص | handlers.ts | ✅ تم | 5/5 نجاح |

| FIX-004 | تفعيل عزل السياق | windows/\*, preload.ts | ✅ تم | 5/5 نجاح |



\### 🟡 المجموعة الثانية: الهندسية (Architecture)

| الرمز | الإصلاح | الملفات المعدلة | الحالة | الاختبارات |

|-------|---------|----------------|--------|-----------|

| FIX-005 | تحسين التحميل | EngagementRepository.ts | ✅ تم | 6/6 نجاح |

| FIX-006 | إصلاح المزامنة الأبوية | syncPolicy.ts | ✅ تم | 5/5 نجاح |

| FIX-007 | تحسين المزامنة غير الحاجبة | StartupCoordinator.ts | ✅ تم | 7/7 نجاح |



\### 🟢 المجموعة الثالثة: الاستعادة (Recovery)

| الرمز | الإصلاح | الملفات المعدلة | الحالة | الاختبارات |

|-------|---------|----------------|--------|-----------|

| FIX-008 | إصلاح المرفقات الناقصة | postgresRestoreAdapter.ts | ✅ تم | 6/6 نجاح |



\---



\## 📈 نتائج الاختبارات



\### الأمان (Security)

\- ✅ جميع الثغرات الحرجة تم إغلاقها

\- ✅ 100% من اختبارات الأمان نجحت

\- ✅ لا توجد استثناءات في المصادقة

\- ✅ جميع البيانات الحساسة مشفرة



\### الأداء (Performance)

\- ✅ تحميل الصفحات: < 500ms (تحسن 85%)

\- ✅ فتح التطبيق: < 2s (تحسن 40%)

\- ✅ المزامنة: غير حاجبة (تحسن 100%)



\### الموثوقية (Reliability)

\- ✅ جميع اختبارات CRUD نجحت

\- ✅ المزامنة مع جميع الجداول تعمل

\- ✅ الاستعادة مع المرفقات الناقصة تعمل

\- ✅ إعادة المحاولة التلقائية تعمل



\---



\## 📂 قائمة الملفات المعدلة



\### Desktop (g:\\b2b)

src/main/ipc/handlers.ts - إصلاحات أمنية (FIX-001, FIX-003)



src/main/services/SyncCredentialStore.ts - تشفير التوكنات (FIX-002)



src/main/windows/\*.ts - تفعيل العزل (FIX-004)



src/preload/preload.ts - واجهة آمنة جديدة (FIX-004)



src/main/db/repositories/EngagementRepository.ts - تحسين التحميل (FIX-005)



src/main/services/StartupCoordinator.ts - تحسين المزامنة (FIX-007)



package.json - تحديث التبعيات



CHANGELOG.md - توثيق التغييرات



text



\### Web/Cloud (g:\\w2w)

cloud-server/src/sync/syncPolicy.ts - دعم المزامنة الأبوية (FIX-006)



cloud-server/src/recovery/postgresRestoreAdapter.ts - إصلاح المرفقات (FIX-008)



src/renderer/src/api/ApiAdapter.ts - تحديث للواجهة الآمنة (FIX-004)



CHANGELOG.md - توثيق التغييرات



text



\---



\## 🛠️ الأدوات المستخدمة



\- \*\*TypeScript\*\* - التطوير الأساسي

\- \*\*Electron\*\* - تطبيق سطح المكتب

\- \*\*Node.js\*\* - بيئة التشغيل

\- \*\*Jest\*\* - اختبارات الوحدة

\- \*\*ESLint\*\* - فحص الكود

\- \*\*Prettier\*\* - تنسيق الكود



\---



\## 📋 قائمة التحقق النهائية



\- \[x] جميع الإصلاحات الأمنية منفذة

\- \[x] جميع الاختبارات تمر بنجاح

\- \[x] لا توجد أخطاء في الـ Console

\- \[x] التطبيق يعمل بشكل طبيعي

\- \[x] التوثيق محدث

\- \[x] CHANGELOG محدث

\- \[x] الـ Build يعمل بنجاح

\- \[x] الـ Deploy جاهز للإنتاج



\---



\## 🚀 خطوات النشر



\### 1. بناء التطبيقات

```bash

\# Desktop

cd g:\\b2b

npm run build



\# Web/Cloud

cd g:\\w2w

npm run build

2\. تشغيل الاختبارات النهائية

bash

npm run test:all

npm run test:e2e

3\. إنشاء الحزم

bash

\# Desktop

npm run dist



\# Web/Cloud

npm run deploy:staging

4\. النشر للإنتاج (بعد الموافقة)

bash

\# Desktop

npm run publish



\# Web/Cloud

npm run deploy:production

⚠️ ملاحظات وتحذيرات

قبل النشر: تأكد من نسخ احتياطي لقاعدة البيانات



التوافق: الإصلاحات متوافقة مع الإصدارات السابقة



التراجع: يمكن العودة للإصدار السابق عبر Git



المراقبة: راقب الأخطاء في أول 24 ساعة بعد النشر



✍️ توقيع المطور

الاسم: \[اسم المطور]



التوقيع: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_



التاريخ: \[YYYY-MM-DD]



📎 الملاحق

الملحق أ: نتائج الاختبارات التفصيلية

\[رابط إلى ملف results.html]



الملحق ب: تغييرات قاعدة البيانات

\[رابط إلى ملف migrations.sql]



الملحق ج: إرشادات التشغيل

\[رابط إلى ملف DEPLOYMENT.md]



نهاية التقرير



text



\---



\## 🎯 ملخص نهائي للوكيل



\*\*أنت مطالب بما يلي:\*\*



1\. ✅ تنفيذ جميع الإصلاحات الثمانية (FIX-001 إلى FIX-008)

2\. ✅ كتابة وتشغيل جميع اختبارات التحقق (45+ اختبار)

3\. ✅ توثيق كل تغيير في الكود وفي التقرير

4\. ✅ تقديم تقرير نهائي مفصل بالشكل المطلوب

5\. ✅ التأكد من استمرار عمل جميع الوظائف الحالية

6\. ✅ تحسين الأداء والأمان دون المساس بتجربة المستخدم

7\. ✅ جعل النظام جاهزاً لبيئة إنتاج مؤسسية



\*\*الموعد النهائي:\*\* 7 أيام عمل



\*\*المخرجات المطلوبة:\*\*

1\. ✅ كود مصدر معدّل بالكامل

2\. ✅ تقرير نهائي مفصل (Final Report)

3\. ✅ نتائج الاختبارات (Test Results)

4\. ✅ تحديث التوثيق (Documentation)

5\. ✅ تغييرات قاعدة البيانات (Migrations) إن وجدت



\---



> \*\*تذكير\*\*: الأمان ليس خياراً، بل ضرورة. كل الإصلاحات الأمنية يجب أن تنفذ بالكامل دون تنازلات. التقرير النهائي سيكون دليلاً على جودة العمل وكفاءته.



\*\*بالتوفيق! 🚀\*\*



