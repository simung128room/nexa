import { executeJsInBrowserSandbox } from "./jsEvaluator";
import { ExecutionResult } from "../types";

/**
 * Robust Client-Side Python Sandbox Engine
 * Translates standard Python statements, loops, conditionals, f-strings, and data structures
 * into sandboxed JavaScript for instant, zero-latency execution.
 */

export function transpilePythonToJs(pythonCode: string): string {
  if (pythonCode.length > 50000) {
    throw new Error("Python code is too long to safely transpile.");
  }
  const lines = pythonCode.split("\n");
  const jsLines: string[] = [];
  const indentStack: number[] = [0];

  // Helper built-ins prepended to every runtime execution
  const helperHeader = `
    const print = (...args) => {
      const formatted = args.map(a => {
        if (a === null) return 'None';
        if (a === undefined) return 'None';
        if (typeof a === 'boolean') return a ? 'True' : 'False';
        if (typeof a === 'object') return JSON.stringify(a);
        return String(a);
      }).join(' ');
      console.log(formatted);
    };
    const len = (obj) => (obj && obj.length !== undefined ? obj.length : (obj ? Object.keys(obj).length : 0));
    const range = (start, stop, step = 1) => {
      if (stop === undefined) { stop = start; start = 0; }
      const res = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) res.push(i);
      } else if (step < 0) {
        for (let i = start; i > stop; i += step) res.push(i);
      }
      return res;
    };
    const sum = (arr) => Array.isArray(arr) ? arr.reduce((acc, curr) => acc + curr, 0) : 0;
    const max = (...args) => {
      const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return Math.max(...arr);
    };
    const min = (...args) => {
      const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return Math.min(...arr);
    };
    const abs = (n) => Math.abs(n);
    const round = (n, digits = 0) => {
      const factor = Math.pow(10, digits);
      return Math.round(n * factor) / factor;
    };
    const str = (v) => (v === null || v === undefined ? 'None' : (typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v)));
    const int = (v) => parseInt(v, 10);
    const float = (v) => parseFloat(v);
    const bool = (v) => Boolean(v);
    const True = true;
    const False = false;
    const None = null;
    const getattr = () => { throw new Error("Security Policy Violation: getattr reflection is permanently disabled in sandbox."); };
    const setattr = () => { throw new Error("Security Policy Violation: setattr is permanently disabled in sandbox."); };
    const delattr = () => { throw new Error("Security Policy Violation: delattr is permanently disabled in sandbox."); };
    const hasattr = () => false;
    const open = () => { throw new Error("Security Policy Violation: File system access is disabled in browser sandbox."); };
    const __import__ = () => { throw new Error("Security Policy Violation: Module import is disabled in sandbox."); };
    const globals = () => ({});
    const locals = () => ({});
    const vars = () => ({});
    const compile = () => { throw new Error("Security Policy Violation: Dynamic compilation is disabled in sandbox."); };
  `;

  // Track declared variables to avoid undeclared variable ReferenceErrors
  const declaredVars = new Set<string>([
    "print", "len", "range", "sum", "max", "min", "abs", "round",
    "str", "int", "float", "bool", "True", "False", "None",
    "getattr", "setattr", "delattr", "hasattr", "open", "__import__", "globals", "locals", "vars", "compile"
  ]);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines or pure comment lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Measure indentation (number of leading spaces or tabs)
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].replace(/\t/g, "    ").length : 0;

    // Check if this line is an elif or else
    const isElifOrElse = /^(elif\b|else\s*:)/.test(trimmed);

    // Pop indent stack and close braces
    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      jsLines.push("}");
    }

    // Convert f-strings safely: f"Hello {name}" -> `Hello ${name}`
    // Validate expression within `{...}` to prevent arbitrary code injection
    const sanitizeFStringExpr = (expr: string) => {
      const cleanExpr = expr.trim();
      if (/^[a-zA-Z0-9_\s+\-*/%(),.\[\]]+$/.test(cleanExpr) && !/__proto__|constructor|import|eval|Function/.test(cleanExpr)) {
        return `\${${cleanExpr}}`;
      }
      return `\${String(${JSON.stringify(cleanExpr)})}`;
    };

    let line = trimmed
      .replace(/f"([^"]*)"/g, (_, content) => '`' + content.replace(/\{([^}]+)\}/g, (__, expr) => sanitizeFStringExpr(expr)) + '`')
      .replace(/f'([^']*)'/g, (_, content) => '`' + content.replace(/\{([^}]+)\}/g, (__, expr) => sanitizeFStringExpr(expr)) + '`');

    // Convert Python logical operators
    line = line
      .replace(/\band\b/g, "&&")
      .replace(/\bor\b/g, "||")
      .replace(/\bnot\b\s+/g, "!")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");

    // Convert .append(x) -> .push(x)
    line = line.replace(/\.append\s*\(/g, ".push(");

    // 1. def function_name(args):
    const defMatch = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*:/);
    if (defMatch) {
      const funcName = defMatch[1];
      const args = defMatch[2];
      declaredVars.add(funcName);
      jsLines.push(`function ${funcName}(${args}) {`);
      indentStack.push(indent + 4);
      continue;
    }

    // 2. if condition:
    const ifMatch = line.match(/^if\s+(.*?)\s*:/);
    if (ifMatch) {
      const cond = ifMatch[1];
      jsLines.push(`if (${cond}) {`);
      indentStack.push(indent + 4);
      continue;
    }

    // 3. elif condition:
    const elifMatch = line.match(/^elif\s+(.*?)\s*:/);
    if (elifMatch) {
      const cond = elifMatch[1];
      if (indentStack.length > 1 && !isElifOrElse) {
        indentStack.pop();
        jsLines.push("}");
      }
      jsLines.push(`else if (${cond}) {`);
      indentStack.push(indent + 4);
      continue;
    }

    // 4. else:
    if (line === "else:" || line.startsWith("else:")) {
      if (indentStack.length > 1 && !isElifOrElse) {
        indentStack.pop();
        jsLines.push("}");
      }
      jsLines.push(`else {`);
      indentStack.push(indent + 4);
      continue;
    }

    // 5. for x in iterable:
    const forInMatch = line.match(/^for\s+([a-zA-Z0-9_,\s]+)\s+in\s+(.*?)\s*:/);
    if (forInMatch) {
      const varName = forInMatch[1].trim();
      const iter = forInMatch[2].trim();
      jsLines.push(`for (const ${varName} of ${iter}) {`);
      indentStack.push(indent + 4);
      continue;
    }

    // 6. while condition:
    const whileMatch = line.match(/^while\s+(.*?)\s*:/);
    if (whileMatch) {
      const cond = whileMatch[1];
      jsLines.push(`while (${cond}) {`);
      indentStack.push(indent + 4);
      continue;
    }

    // 7. Variable assignment without let/var
    const assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)\s*(.+)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const val = assignMatch[2];
      if (!declaredVars.has(varName)) {
        declaredVars.add(varName);
        jsLines.push(`let ${varName} = ${val};`);
      } else {
        jsLines.push(`${varName} = ${val};`);
      }
      continue;
    }

    // 8. General statement (e.g. print(...), x += 1, return ...)
    if (!line.endsWith(";") && !line.endsWith("{") && !line.endsWith("}")) {
      line += ";";
    }
    jsLines.push(line);
  }

  // Close remaining open indent blocks
  while (indentStack.length > 1) {
    indentStack.pop();
    jsLines.push("}");
  }

  return `${helperHeader}\n\n${jsLines.join("\n")}`;
}

export function executePythonInSandbox(pythonCode: string): Promise<ExecutionResult> {
  // Pre-execution security screening for system and reflection abuse
  const DANGEROUS_PYTHON_PATTERNS = [
    /__import__/,
    /\b(eval|exec|open)\s*\(/,
    /^\s*(?:from|import)\s+(os|sys|subprocess|shutil|socket|pty|urllib|requests|pickle|ctypes|builtins)\b/m,
    /\b__builtins__\b/,
    /\b__subclasses__\b/,
    /\b__class__\b/,
    /\b__bases__\b/,
    /\b__mro__\b/,
    /\b__dict__\b/,
    /\b__proto__\b/,
    /\bconstructor\b/,
    /\bgetattr\s*\(/,
    /\bsetattr\s*\(/,
    /\bdelattr\s*\(/,
    /\bcompile\s*\(/,
  ];

  // Decode hex and unicode escapes for screening
  let decodedPython = pythonCode;
  try {
    decodedPython = pythonCode
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } catch (e) {}

  // Check if string concatenation is being used to bypass pattern matching
  const deconcatenated = decodedPython.replace(/['"]\s*\+\s*['"]/g, "");

  for (const pattern of DANGEROUS_PYTHON_PATTERNS) {
    if (pattern.test(pythonCode) || pattern.test(decodedPython) || pattern.test(deconcatenated)) {
      return Promise.resolve({
        success: false,
        output: "",
        error: "Security Policy Violation: คำสั่งที่พยายามเข้าถึง OS, System Modules, Reflection (getattr) หรือ Dynamic Eval ถูกบล็อกใน Client-Side Sandbox",
        executionTimeMs: "0.00",
      });
    }
  }

  try {
    const jsCode = transpilePythonToJs(pythonCode);
    return executeJsInBrowserSandbox(jsCode);
  } catch (err: any) {
    return Promise.resolve({
      success: false,
      output: "",
      error: `Python syntax translation error: ${err.message || String(err)}`,
      executionTimeMs: "0.00",
    });
  }
}
