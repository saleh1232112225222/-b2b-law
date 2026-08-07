اثOpenCodeOpenCodث

# Verbatim Memory MCP Server (Local-First & Full-Text Search)

[English](#english) | [العربية](#العربية)

---

## English

A lightweight, zero-dependency, and extremely fast Model Context Protocol (MCP) server written in Python. It provides a **Verbatim Memory** system for AI models, allowing them to store entire, unsummarized chat transcripts locally on your device for high-fidelity search and retrieval using SQLite FTS5.

### Features

1. **Verbatim Memory**: Stores full raw transcripts without compression or lossy summarization.
2. **Local-First Privacy**: All database files are stored locally in `~/.verbatim-memory/memory.db`.
3. **High Performance**: Employs SQLite's Full-Text Search (FTS5) engine for sub-millisecond keyword and phrase queries.
4. **Zero Dependencies**: Runs on standard Python 3.x with no `pip install` required.

### Exposed Tools

* **`store_transcript`**: Saves a verbatim transcript of a chat session.
  * Arguments: `session_id` (string), `project_name` (string), `transcript` (string).
* **`search_transcripts`**: Queries stored transcripts using SQLite FTS5 (falling back to `LIKE` if query syntax is invalid).
  * Arguments: `query` (string), `project_name` (string, optional), `limit` (integer, optional).
* **`get_session_transcript`**: Retrieves the full transcript of a specific session.
  * Arguments: `session_id` (string).

### Configuration in Claude Desktop (Windows)

Add the server configuration to your Claude Desktop configuration file (located at `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "verbatim-memory": {
      "command": "python",
      "args": [
        "g:/w2w/verbatim-memory-mcp/server.py"
      ]
    }
  }
}
```

### Running Tests

To run unit and integration tests:

```bash
python g:\w2w\verbatim-memory-mcp\test_server.py
```

---

## العربية

خادم بروتوكول سياق النموذج (MCP) خفيف الوزن وسريع للغاية ومكتوب بلغة Python بدون أي مكتبات خارجية. يتيح للنماذج الذكية حفظ واسترجاع نصوص المحادثات البرمجية بالكامل وبشكل حرفي (**Verbatim Memory**) محلياً على جهازك باستخدام تقنية البحث النصي الكامل لـ SQLite (FTS5).

### الميزات

1. **الذاكرة الحرفية الكاملة**: حفظ النصوص كما هي دون تلخيص أو فقدان للتفاصيل الدقيقة.
2. **خصوصية محلية أولاً**: تُحفظ قاعدة البيانات بالكامل على جهازك في المسار `~/.verbatim-memory/memory.db`.
3. **أداء متقدم**: استخدام محرك SQLite FTS5 للبحث السريع جداً في أجزاء من الثانية.
4. **بدون مكتبات خارجية**: يعمل مباشرة باستخدام مكتبات Python القياسية دون الحاجة لتثبيت أي حزم عبر `pip`.

### الأدوات المتوفرة للنماذج

* **`store_transcript`**: لحفظ النص الكامل لجلسة محادثة معينة.
  * المدخلات: معرف الجلسة `session_id` (نص)، اسم المشروع `project_name` (نص)، النص الكامل `transcript` (نص).
* **`search_transcripts`**: للبحث الدقيق والسريع داخل النصوص المحفوظة.
  * المدخلات: نص البحث `query` (نص)، فلتر اسم المشروع `project_name` (نص اختياري)، الحد الأقصى للنتائج `limit` (رقم اختياري).
* **`get_session_transcript`**: لاسترجاع النص الكامل لجلسة محددة باستخدام معرفها.
  * المدخلات: معرف الجلسة `session_id` (نص).

### إعداد الخادم في تطبيق Claude Desktop (ويندوز)

قم بإضافة الإعدادات التالية إلى ملف إعدادات Claude المكتبي الخاص بك (الموجود في المسار `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "verbatim-memory": {
      "command": "python",
      "args": [
        "g:/w2w/verbatim-memory-mcp/server.py"
      ]
    }
  }
}
```

### تشغيل الاختبارات

لتشغيل اختبارات التحقق والتكامل:

```bash
python g:\w2w\verbatim-memory-mcp\test_server.py
```
