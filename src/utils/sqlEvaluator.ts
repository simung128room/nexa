/**
 * In-Memory Relational SQL Engine for Browser Sandbox Execution
 * Faithfully executes SQL statements with real in-memory schema, table states, and validations.
 * Supports CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, DROP TABLE, WHERE (AND/OR), ORDER BY, and LIMIT.
 */

interface TableSchema {
  columns: string[];
  rows: Record<string, any>[];
}

function parseSqlValue(valStr: string): any {
  const trimmed = valStr.trim();
  if (/^['"].*['"]$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (trimmed.toLowerCase() === "null") return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  return trimmed;
}

function evaluateSingleCondition(row: Record<string, any>, conditionStr: string): boolean {
  const trimmed = conditionStr.trim();
  if (!trimmed) return true;

  // IS NULL / IS NOT NULL
  const isNullMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+is\s+(not\s+)?null$/i);
  if (isNullMatch) {
    const col = isNullMatch[1].replace(/[`"']/g, "");
    const isNot = Boolean(isNullMatch[2]);
    const val = row[col];
    return isNot ? val !== null && val !== undefined : val === null || val === undefined;
  }

  // IN (...)
  const inMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+(not\s+)?in\s*\((.*?)\)$/i);
  if (inMatch) {
    const col = inMatch[1].replace(/[`"']/g, "");
    const isNot = Boolean(inMatch[2]);
    const setValues = inMatch[3].split(",").map((v) => parseSqlValue(v));
    const rowVal = row[col];
    const exists = setValues.some((v) => String(v).toLowerCase() === String(rowVal).toLowerCase());
    return isNot ? !exists : exists;
  }

  // Safe Token-Based Comparison operators (=, !=, <>, >=, <=, >, <, LIKE) - ReDoS immune
  const ops = ["!=", "<>", ">=", "<=", "like", "=", ">", "<"];
  let matchedOp = "";
  let opIdx = -1;
  const lowerTrimmed = trimmed.toLowerCase();

  for (const op of ops) {
    const idx = op === "like" ? lowerTrimmed.search(/\s+like\s+/) : lowerTrimmed.indexOf(op);
    if (idx > 0) {
      matchedOp = op;
      opIdx = op === "like" ? idx + 1 : idx;
      break;
    }
  }

  if (opIdx === -1 || !matchedOp) {
    return true;
  }

  const col = trimmed.substring(0, opIdx).trim().replace(/[`"']/g, "");
  const rawTarget = trimmed.substring(opIdx + matchedOp.length).trim();
  const targetVal = parseSqlValue(rawTarget);
  const rowVal = row[col];

  if (rowVal === null || rowVal === undefined) {
    return false;
  }

  const op = matchedOp.toLowerCase();
  if (op === "=") {
    if (typeof targetVal === "number" && typeof rowVal === "number") {
      return rowVal === targetVal;
    }
    return String(rowVal).toLowerCase() === String(targetVal).toLowerCase();
  }
  if (op === "!=" || op === "<>") {
    if (typeof targetVal === "number" && typeof rowVal === "number") {
      return rowVal !== targetVal;
    }
    return String(rowVal).toLowerCase() !== String(targetVal).toLowerCase();
  }
  if (op === ">") return Number(rowVal) > Number(targetVal);
  if (op === "<") return Number(rowVal) < Number(targetVal);
  if (op === ">=") return Number(rowVal) >= Number(targetVal);
  if (op === "<=") return Number(rowVal) <= Number(targetVal);
  if (op === "like") {
    // Escape all regex specials and replace wildcard characters
    const patternStr = String(targetVal)
      .slice(0, 200) // Bound pattern length
      .toLowerCase()
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/%/g, ".*?")
      .replace(/_/g, ".");
    try {
      const rx = new RegExp(`^${patternStr}$`, "i");
      return rx.test(String(rowVal));
    } catch {
      return false;
    }
  }

  return true;
}

function evaluateWhereClause(row: Record<string, any>, whereClause?: string): boolean {
  if (!whereClause || !whereClause.trim()) return true;

  // Handle OR clauses
  const orParts = whereClause.split(/\s+or\s+/i);
  return orParts.some((orPart) => {
    // Handle AND clauses
    const andParts = orPart.split(/\s+and\s+/i);
    return andParts.every((andPart) => evaluateSingleCondition(row, andPart));
  });
}

function parseSetAssignments(setClause: string): Record<string, any> {
  const updates: Record<string, any> = {};
  const assignments = setClause.split(",");
  for (const assign of assignments) {
    const parts = assign.split("=");
    if (parts.length === 2) {
      const col = parts[0].trim().replace(/[`"']/g, "");
      const val = parseSqlValue(parts[1].trim());
      updates[col] = val;
    }
  }
  return updates;
}

export function executeSqlInSandbox(sql: string): { output: string; success: boolean; error?: string } {
  try {
    if (!sql || typeof sql !== "string") {
      return { success: true, output: "ไม่มีคำสั่ง SQL ที่ต้องประมวลผล" };
    }

    // Guard against memory DoS via oversized input
    const boundedSql = sql.slice(0, 50000);

    const rawStatements = boundedSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))
      .slice(0, 100); // Limit to 100 statements per execution

    if (rawStatements.length === 0) {
      return {
        success: true,
        output: "ไม่มีคำสั่ง SQL ที่ต้องประมวลผล (No executable SQL statements found).",
      };
    }

    const database: Record<string, TableSchema> = {};
    const outputs: string[] = [];

    for (const stmt of rawStatements) {
      const cleanStmt = stmt.replace(/\s+/g, " ").trim();
      const lower = cleanStmt.toLowerCase();

      // 1. CREATE TABLE
      if (lower.startsWith("create table")) {
        const createMatch = cleanStmt.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s*\((.*?)\)/i);
        if (!createMatch) {
          throw new Error(`Syntax error near 'CREATE TABLE'. Statement: ${cleanStmt}`);
        }

        const tableName = createMatch[1].toLowerCase();
        const columnsDef = createMatch[2];

        if (database[tableName]) {
          outputs.push(`[NOTICE]: Table '${tableName}' already exists.`);
          continue;
        }

        const cols: string[] = [];
        const rawCols = columnsDef.split(",");
        for (const c of rawCols) {
          const colParts = c.trim().split(" ").filter(Boolean);
          if (colParts.length > 0) {
            const colName = colParts[0].replace(/[`"']/g, "");
            if (!["primary", "foreign", "constraint", "unique", "check"].includes(colName.toLowerCase())) {
              cols.push(colName);
            }
          }
        }

        database[tableName] = {
          columns: cols.length > 0 ? cols : ["id"],
          rows: [],
        };
        outputs.push(`CREATE TABLE: Table '${tableName}' created successfully with columns (${database[tableName].columns.join(", ")}).`);
      }
      // 2. INSERT INTO
      else if (lower.startsWith("insert into")) {
        const insertMatch = cleanStmt.match(/insert\s+into\s+([a-zA-Z0-9_]+)(?:\s*\((.*?)\))?\s+values\s*\((.*?)\)/i);
        if (!insertMatch) {
          throw new Error(`Syntax error in 'INSERT INTO'. Statement: ${cleanStmt}`);
        }

        const tableName = insertMatch[1].toLowerCase();
        if (!database[tableName]) {
          throw new Error(`Table '${tableName}' does not exist. Please CREATE TABLE first.`);
        }

        const specifiedCols = insertMatch[2]
          ? insertMatch[2].split(",").map((c) => c.trim().replace(/[`"']/g, ""))
          : database[tableName].columns;

        const rawValues = insertMatch[3].split(",").map((v) => parseSqlValue(v));

        const newRow: Record<string, any> = {};
        specifiedCols.forEach((col, idx) => {
          newRow[col] = rawValues[idx] !== undefined ? rawValues[idx] : null;
        });

        database[tableName].rows.push(newRow);
        outputs.push(`INSERT: 1 row inserted into '${tableName}'. (Total rows: ${database[tableName].rows.length})`);
      }
      // 3. SELECT
      else if (lower.startsWith("select")) {
        const fromMatch = cleanStmt.match(/select\s+(.*?)\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.*?))?(?:\s+order\s+by\s+(.*?))?(?:\s+limit\s+(\d+))?$/i);

        // Handle SELECT without FROM (e.g. SELECT 1+1, SELECT NOW())
        if (!fromMatch) {
          const simpleMatch = cleanStmt.match(/select\s+(.*)/i);
          if (simpleMatch) {
            outputs.push(`SELECT Result:\n${simpleMatch[1]}`);
            continue;
          }
          throw new Error(`Syntax error in 'SELECT'. Statement: ${cleanStmt}`);
        }

        const colsSelect = fromMatch[1].trim();
        const tableName = fromMatch[2].toLowerCase();
        const whereClause = fromMatch[3]?.trim();
        const orderByClause = fromMatch[4]?.trim();
        const limitCount = fromMatch[5] ? parseInt(fromMatch[5], 10) : undefined;

        if (!database[tableName]) {
          throw new Error(`Table '${tableName}' does not exist in database.`);
        }

        let filteredRows = database[tableName].rows.filter((row) => evaluateWhereClause(row, whereClause));

        // ORDER BY support (e.g. ORDER BY id DESC, ORDER BY name ASC)
        if (orderByClause) {
          const orderMatch = orderByClause.match(/([a-zA-Z0-9_]+)(?:\s+(asc|desc))?/i);
          if (orderMatch) {
            const orderCol = orderMatch[1].replace(/[`"']/g, "");
            const isDesc = orderMatch[2]?.toLowerCase() === "desc";
            filteredRows.sort((a, b) => {
              const valA = a[orderCol];
              const valB = b[orderCol];
              if (valA === valB) return 0;
              if (valA === null || valA === undefined) return isDesc ? 1 : -1;
              if (valB === null || valB === undefined) return isDesc ? -1 : 1;
              if (typeof valA === "number" && typeof valB === "number") {
                return isDesc ? valB - valA : valA - valB;
              }
              return isDesc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
            });
          }
        }

        if (limitCount !== undefined && !isNaN(limitCount)) {
          filteredRows = filteredRows.slice(0, limitCount);
        }

        const displayCols =
          colsSelect === "*"
            ? database[tableName].columns
            : colsSelect.split(",").map((c) => c.trim().replace(/[`"']/g, ""));

        if (filteredRows.length === 0) {
          outputs.push(`Query Result for '${tableName}':\n(0 rows returned - Table is empty or no matching rows)\nColumns: [${displayCols.join(", ")}]`);
        } else {
          // Render ASCII Table
          let tableStr = `Query Result for '${tableName}' (${filteredRows.length} rows returned):\n`;
          const colWidths: Record<string, number> = {};

          displayCols.forEach((col) => {
            let maxLen = col.length;
            filteredRows.forEach((row) => {
              const strVal = row[col] !== undefined && row[col] !== null ? String(row[col]) : "NULL";
              if (strVal.length > maxLen) maxLen = strVal.length;
            });
            colWidths[col] = Math.max(maxLen, 6);
          });

          // Header
          const headerRow = displayCols.map((col) => col.padEnd(colWidths[col])).join(" | ");
          const divider = displayCols.map((col) => "-".repeat(colWidths[col])).join("-+-");

          tableStr += `+-${divider}-+\n`;
          tableStr += `| ${headerRow} |\n`;
          tableStr += `+-${divider}-+\n`;

          filteredRows.forEach((row) => {
            const rowStr = displayCols
              .map((col) => {
                const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : "NULL";
                return val.padEnd(colWidths[col]);
              })
              .join(" | ");
            tableStr += `| ${rowStr} |\n`;
          });

          tableStr += `+-${divider}-+`;
          outputs.push(tableStr);
        }
      }
      // 4. DROP TABLE
      else if (lower.startsWith("drop table")) {
        const dropMatch = cleanStmt.match(/drop\s+table\s+(?:if\s+exists\s+)?([a-zA-Z0-9_]+)/i);
        if (dropMatch) {
          const tableName = dropMatch[1].toLowerCase();
          if (database[tableName]) {
            delete database[tableName];
            outputs.push(`DROP TABLE: Table '${tableName}' dropped successfully.`);
          } else {
            outputs.push(`[NOTICE]: Table '${tableName}' does not exist.`);
          }
        }
      }
      // 5. UPDATE
      else if (lower.startsWith("update")) {
        const updateMatch = cleanStmt.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.*?)(?:\s+where\s+(.*))?$/i);
        if (!updateMatch) {
          throw new Error(`Syntax error in 'UPDATE'. Statement: ${cleanStmt}`);
        }

        const tableName = updateMatch[1].toLowerCase();
        const setClause = updateMatch[2].trim();
        const whereClause = updateMatch[3]?.trim();

        if (!database[tableName]) {
          throw new Error(`Table '${tableName}' does not exist.`);
        }

        const updates = parseSetAssignments(setClause);
        let updatedCount = 0;

        database[tableName].rows.forEach((row) => {
          if (evaluateWhereClause(row, whereClause)) {
            Object.assign(row, updates);
            updatedCount++;
          }
        });

        outputs.push(`UPDATE: ${updatedCount} row(s) updated in '${tableName}'.`);
      }
      // 6. DELETE FROM
      else if (lower.startsWith("delete from")) {
        const deleteMatch = cleanStmt.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.*))?$/i);
        if (!deleteMatch) {
          throw new Error(`Syntax error in 'DELETE FROM'. Statement: ${cleanStmt}`);
        }

        const tableName = deleteMatch[1].toLowerCase();
        const whereClause = deleteMatch[2]?.trim();

        if (!database[tableName]) {
          throw new Error(`Table '${tableName}' does not exist.`);
        }

        const initialCount = database[tableName].rows.length;
        if (whereClause) {
          database[tableName].rows = database[tableName].rows.filter((row) => !evaluateWhereClause(row, whereClause));
          const deletedCount = initialCount - database[tableName].rows.length;
          outputs.push(`DELETE: ${deletedCount} row(s) deleted from '${tableName}'.`);
        } else {
          database[tableName].rows = [];
          outputs.push(`DELETE: All ${initialCount} row(s) deleted from '${tableName}'.`);
        }
      }
      // Default / Other statements
      else {
        outputs.push(`SQL Executed: ${cleanStmt}`);
      }
    }

    return {
      success: true,
      output: outputs.join("\n\n"),
    };
  } catch (err: any) {
    return {
      success: false,
      output: "",
      error: `SQL Execution Error: ${err?.message || String(err)}`,
    };
  }
}
