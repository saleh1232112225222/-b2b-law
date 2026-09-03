/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Robust Lexical SQL DDL Parser
 * Tracks parentheses, quotes, and dollar quotes so commas inside NUMERIC(12,2)
 * or constraints are never treated as column delimiters.
 */

class LexicalSqlParser {
  /**
   * Tokenizes and extracts table schemas from SQL DDL text
   */
  static parseTables(sql) {
    const cleanSql = this.stripComments(sql)
    const statements = this.splitTopLevelStatements(cleanSql)
    const tables = new Map()

    for (const stmt of statements) {
      const trimmed = stmt.trim()
      if (!trimmed) continue

      // Handle CREATE TABLE
      const createMatch = trimmed.match(
        /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(/i
      )
      if (createMatch) {
        const tableName = createMatch[1].toLowerCase()
        const body = this.extractParenthesizedBody(trimmed, createMatch[0].length - 1)
        if (body) {
          const parsed = this.parseTableBody(tableName, body)
          if (!tables.has(tableName)) {
            tables.set(tableName, parsed)
          } else {
            // merge
            const existing = tables.get(tableName)
            for (const col of parsed.columns) {
              if (!existing.columns.some((c) => c.name === col.name)) {
                existing.columns.push(col)
              }
            }
            if (!existing.primaryKey && parsed.primaryKey) {
              existing.primaryKey = parsed.primaryKey
            }
            existing.uniqueKeys.push(...parsed.uniqueKeys)
            existing.foreignKeys.push(...parsed.foreignKeys)
          }
        }
      }

      // Handle ALTER TABLE ... ADD COLUMN
      const alterAddMatch = trimmed.match(
        /^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(.*)$/i
      )
      if (alterAddMatch) {
        const tableName = alterAddMatch[1].toLowerCase()
        const colDef = alterAddMatch[2].trim()
        const colParsed = this.parseColumnDefinition(colDef)
        if (colParsed) {
          if (!tables.has(tableName)) {
            tables.set(tableName, {
              tableName,
              columns: [colParsed],
              primaryKey: colParsed.isPrimaryKey ? [colParsed.name] : null,
              uniqueKeys: colParsed.isUnique ? [[colParsed.name]] : [],
              foreignKeys: colParsed.foreignKey ? [colParsed.foreignKey] : []
            })
          } else {
            const table = tables.get(tableName)
            if (!table.columns.some((c) => c.name === colParsed.name)) {
              table.columns.push(colParsed)
            }
            if (colParsed.isPrimaryKey && !table.primaryKey) {
              table.primaryKey = [colParsed.name]
            }
            if (colParsed.isUnique) {
              table.uniqueKeys.push([colParsed.name])
            }
            if (colParsed.foreignKey) {
              table.foreignKeys.push(colParsed.foreignKey)
            }
          }
        }
      }
    }

    return tables
  }

  static stripComments(sql) {
    let out = ''
    let i = 0
    const len = sql.length
    let inSingleQuote = false
    let inDoubleQuote = false
    let inDollarQuote = false
    let dollarTag = ''

    while (i < len) {
      const char = sql[i]
      const next = sql[i + 1]

      if (inSingleQuote) {
        out += char
        if (char === "'" && sql[i - 1] !== '\\') {
          inSingleQuote = false
        }
        i++
      } else if (inDoubleQuote) {
        out += char
        if (char === '"' && sql[i - 1] !== '\\') {
          inDoubleQuote = false
        }
        i++
      } else if (inDollarQuote) {
        out += char
        if (char === '$' && sql.startsWith(dollarTag, i)) {
          out += dollarTag.slice(1)
          i += dollarTag.length
          inDollarQuote = false
        } else {
          i++
        }
      } else {
        // Check for line comment --
        if (char === '-' && next === '-') {
          while (i < len && sql[i] !== '\n') i++
          out += '\n'
        }
        // Check for block comment /*
        else if (char === '/' && next === '*') {
          i += 2
          while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) i++
          i += 2
        }
        // Check string quotes
        else if (char === "'") {
          inSingleQuote = true
          out += char
          i++
        } else if (char === '"') {
          inDoubleQuote = true
          out += char
          i++
        }
        // Check dollar quotes $$ or $tag$
        else if (char === '$') {
          const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/)
          if (match) {
            dollarTag = match[1]
            inDollarQuote = true
            out += dollarTag
            i += dollarTag.length
          } else {
            out += char
            i++
          }
        } else {
          out += char
          i++
        }
      }
    }

    return out
  }

  static splitTopLevelStatements(sql) {
    const stmts = []
    let current = ''
    let parenDepth = 0
    let inSingleQuote = false
    let inDoubleQuote = false

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]
      if (inSingleQuote) {
        current += char
        if (char === "'" && sql[i - 1] !== '\\') inSingleQuote = false
      } else if (inDoubleQuote) {
        current += char
        if (char === '"' && sql[i - 1] !== '\\') inDoubleQuote = false
      } else if (char === "'") {
        inSingleQuote = true
        current += char
      } else if (char === '"') {
        inDoubleQuote = true
        current += char
      } else if (char === '(') {
        parenDepth++
        current += char
      } else if (char === ')') {
        parenDepth--
        current += char
      } else if (char === ';' && parenDepth === 0) {
        stmts.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim()) stmts.push(current.trim())
    return stmts
  }

  static extractParenthesizedBody(sql, openParenIndex) {
    let depth = 0
    let inSingleQuote = false
    let inDoubleQuote = false
    let start = -1

    for (let i = openParenIndex; i < sql.length; i++) {
      const char = sql[i]
      if (inSingleQuote) {
        if (char === "'" && sql[i - 1] !== '\\') inSingleQuote = false
      } else if (inDoubleQuote) {
        if (char === '"' && sql[i - 1] !== '\\') inDoubleQuote = false
      } else if (char === "'") {
        inSingleQuote = true
      } else if (char === '"') {
        inDoubleQuote = true
      } else if (char === '(') {
        if (depth === 0) start = i + 1
        depth++
      } else if (char === ')') {
        depth--
        if (depth === 0) {
          return sql.slice(start, i)
        }
      }
    }
    return null
  }

  static parseTableBody(tableName, body) {
    const items = this.splitTopLevelCommas(body)
    const columns = []
    let primaryKey = null
    const uniqueKeys = []
    const foreignKeys = []

    for (const rawItem of items) {
      const item = rawItem.trim()
      if (!item) continue

      // Table-level PRIMARY KEY (col1, col2, ...)
      const pkMatch = item.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i)
      if (pkMatch) {
        primaryKey = pkMatch[1].split(',').map((s) => s.trim().replace(/["`]/g, '').toLowerCase())
        continue
      }

      // Table-level UNIQUE (col1, col2, ...)
      const uqMatch = item.match(
        /^(?:CONSTRAINT\s+["`]?([a-zA-Z0-9_]+)["`]?\s+)?UNIQUE\s*\(([^)]+)\)/i
      )
      if (uqMatch) {
        const uqCols = uqMatch[2].split(',').map((s) => s.trim().replace(/["`]/g, '').toLowerCase())
        uniqueKeys.push(uqCols)
        continue
      }

      // Table-level FOREIGN KEY (col) REFERENCES target (target_col)
      const fkMatch = item.match(
        /^(?:CONSTRAINT\s+["`]?([a-zA-Z0-9_]+)["`]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["`]?([a-zA-Z0-9_]+)["`]?\s*\(([^)]+)\)/i
      )
      if (fkMatch) {
        foreignKeys.push({
          column: fkMatch[2].trim().replace(/["`]/g, '').toLowerCase(),
          referencesTable: fkMatch[3].trim().replace(/["`]/g, '').toLowerCase(),
          referencesColumn: fkMatch[4].trim().replace(/["`]/g, '').toLowerCase()
        })
        continue
      }

      // Skip table-level CHECK constraints
      if (
        item.match(/^CONSTRAINT\s+["`]?([a-zA-Z0-9_]+)["`]?\s+CHECK/i) ||
        item.match(/^CHECK\s*\(/i)
      ) {
        continue
      }

      // Otherwise it is a column definition
      const col = this.parseColumnDefinition(item)
      if (col) {
        columns.push(col)
        if (col.isPrimaryKey && !primaryKey) {
          primaryKey = [col.name]
        }
        if (col.isUnique) {
          uniqueKeys.push([col.name])
        }
        if (col.foreignKey) {
          foreignKeys.push(col.foreignKey)
        }
      }
    }

    if (primaryKey) {
      for (const pkCol of primaryKey) {
        const found = columns.find((c) => c.name === pkCol)
        if (found) {
          found.isNullable = false
          found.isPrimaryKey = true
        }
      }
    }

    return {
      tableName,
      columns,
      primaryKey,
      uniqueKeys,
      foreignKeys
    }
  }

  static splitTopLevelCommas(text) {
    const items = []
    let current = ''
    let parenDepth = 0
    let inSingleQuote = false
    let inDoubleQuote = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (inSingleQuote) {
        current += char
        if (char === "'" && text[i - 1] !== '\\') inSingleQuote = false
      } else if (inDoubleQuote) {
        current += char
        if (char === '"' && text[i - 1] !== '\\') inDoubleQuote = false
      } else if (char === "'") {
        inSingleQuote = true
        current += char
      } else if (char === '"') {
        inDoubleQuote = true
        current += char
      } else if (char === '(') {
        parenDepth++
        current += char
      } else if (char === ')') {
        parenDepth--
        current += char
      } else if (char === ',' && parenDepth === 0) {
        items.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim()) items.push(current.trim())
    return items
  }

  static parseColumnDefinition(def) {
    const trimmed = def.trim()
    if (!trimmed) return null

    const nameMatch = trimmed.match(/^["`]?([a-zA-Z0-9_]+)["`]?\s+(.*)$/)
    if (!nameMatch) return null

    const name = nameMatch[1].toLowerCase()
    // Validate semantic invariant: ^[A-Za-z_][A-Za-z0-9_]*$
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`INVALID_IDENTIFIER: Column name "${name}" violates identifier format.`)
    }

    // Ignore SQL keywords that might be parsed as columns if malformed
    if (['primary', 'unique', 'constraint', 'foreign', 'check'].includes(name)) {
      return null
    }

    const rest = nameMatch[2]
    const typeMatch = rest.match(/^([a-zA-Z0-9_]+(?:\s*\([^)]+\))?)/)
    const dataType = typeMatch ? typeMatch[1].trim() : 'TEXT'

    const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest)
    const isUnique = /\bUNIQUE\b/i.test(rest)
    const isNotNull = /\bNOT\s+NULL\b/i.test(rest) || isPrimaryKey
    const isNullable = !isNotNull

    let foreignKey = null
    const fkMatch = rest.match(
      /\bREFERENCES\s+["`]?([a-zA-Z0-9_]+)["`]?\s*(?:\(\s*["`]?([a-zA-Z0-9_]+)["`]?\s*\))?/i
    )
    if (fkMatch) {
      foreignKey = {
        column: name,
        referencesTable: fkMatch[1].toLowerCase(),
        referencesColumn: fkMatch[2] ? fkMatch[2].toLowerCase() : 'id'
      }
    }

    return {
      name,
      dataType,
      isNullable,
      isPrimaryKey,
      isUnique,
      foreignKey
    }
  }
}

module.exports = { LexicalSqlParser }
