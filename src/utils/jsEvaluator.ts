/**
 * Client-Side Sandboxed JavaScript / TypeScript Evaluator
 * Runs exclusively in an isolated Web Worker with defense-in-depth isolation.
 * All network (fetch, XHR, WebSocket, EventSource, sendBeacon),
 * storage (indexedDB, localStorage, sessionStorage), worker creation APIs,
 * dynamic imports, Function constructors, and string-based timer evaluations are neutralized.
 */

import { transform } from 'sucrase';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs: string;
}

export function executeJsInBrowserSandbox(code: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const logs: string[] = [];

    // Pre-screen code for forbidden syntax / bypass patterns before compilation
    const normalizedCode = code
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/['"]\s*\+\s*['"]/g, ""); // strip string concatenation evasion

    const FORBIDDEN_SYNTAX = [
      /\bimport\s*\(/i,
      /\bimportScripts\b/i,
      /\beval\s*\(/i,
      /\bFunction\s*\(/i,
      /\bAsyncFunction\b/i,
      /\bGeneratorFunction\b/i,
      /__proto__/i,
      /\bprototype\b\s*\[/i,
      /\bconstructor\s*\[/i,
      /\bconstructor\s*\.\s*constructor\b/i,
      /\bObject\s*\.\s*(?:defineProperty|setPrototypeOf|assign)\s*\(\s*(?:Object|Function|Array)\.prototype/i,
    ];

    for (const pattern of FORBIDDEN_SYNTAX) {
      if (pattern.test(code) || pattern.test(normalizedCode)) {
        return resolve({
          success: false,
          output: "",
          error: "Security Policy Violation: ตรวจพบคำสั่งหรือรูปแบบโค้ดที่มีความเสี่ยงสูง (Dynamic Import, Eval, Prototype Pollution หรือ Constructor Chaining)",
          executionTimeMs: (performance.now() - start).toFixed(2),
        });
      }
    }

    // Transpile TypeScript to JavaScript safely using Sucrase before sending to Worker
    let compiledCode = code;
    try {
      compiledCode = transform(code, { transforms: ["typescript"] }).code;
    } catch (err: any) {
      return resolve({
        success: false,
        output: "",
        error: "TypeScript Compilation Error: โค้ดมีข้อผิดพลาดทางไวยากรณ์ (Syntax Error)",
        executionTimeMs: (performance.now() - start).toFixed(2),
      });
    }

    // Worker code with multi-layer defensive sandbox
    const workerScript = `
      (function() {
        'use strict';

        // 1. Permanently remove and lock down all networking, storage, and worker-spawning capabilities
        const dangerousGlobals = [
          'fetch',
          'XMLHttpRequest',
          'WebSocket',
          'EventSource',
          'importScripts',
          'indexedDB',
          'openDatabase',
          'BroadcastChannel',
          'SharedWorker',
          'Worker',
          'caches',
          'cookieStore',
          'Proxy',
          'Reflect',
          'location',
          'navigator'
        ];

        for (const key of dangerousGlobals) {
          try {
            Object.defineProperty(self, key, {
              value: undefined,
              writable: false,
              configurable: false,
            });
            Object.defineProperty(globalThis, key, {
              value: undefined,
              writable: false,
              configurable: false,
            });
          } catch (e) {}
        }

        // 2. Neutralize string-based code evaluation in setTimeout / setInterval
        const nativeSetTimeout = self.setTimeout;
        const nativeSetInterval = self.setInterval;

        self.setTimeout = function(handler, timeout, ...args) {
          if (typeof handler !== 'function') {
            throw new Error("Security Policy Violation: String arguments in setTimeout are disabled.");
          }
          return nativeSetTimeout(handler, timeout, ...args);
        };

        self.setInterval = function(handler, timeout, ...args) {
          if (typeof handler !== 'function') {
            throw new Error("Security Policy Violation: String arguments in setInterval are disabled.");
          }
          return nativeSetInterval(handler, timeout, ...args);
        };

        // 3. Neutralize eval and Object.setPrototypeOf permanently
        try {
          Object.defineProperty(self, 'eval', { value: undefined, writable: false, configurable: false });
          Object.defineProperty(globalThis, 'eval', { value: undefined, writable: false, configurable: false });
          Object.defineProperty(Object, 'setPrototypeOf', {
            value: function() { throw new Error("Security Policy Violation: setPrototypeOf is disabled in sandbox."); },
            writable: false,
            configurable: false,
          });
        } catch (e) {}

        // 4. Capture native Function builder for runner, then permanently neutralize constructor-chaining
        const InternalRunnerFunction = Function;
        const blockedConstructor = function() {
          throw new Error("Security Policy Violation: Dynamic code evaluation via Function constructor is permanently disabled in sandbox.");
        };

        try {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
          const AsyncGeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;

          const fnConstructors = [Function, AsyncFunction, GeneratorFunction, AsyncGeneratorFunction];
          for (const fn of fnConstructors) {
            try {
              Object.defineProperty(fn.prototype, 'constructor', {
                value: blockedConstructor,
                writable: false,
                configurable: false,
              });
              Object.defineProperty(fn, 'constructor', {
                value: blockedConstructor,
                writable: false,
                configurable: false,
              });
            } catch (e) {}
          }

          // Lock global Function references
          Object.defineProperty(self, 'Function', { value: blockedConstructor, writable: false, configurable: false });
          Object.defineProperty(globalThis, 'Function', { value: blockedConstructor, writable: false, configurable: false });

          // Neutralize __proto__ access
          Object.defineProperty(Object.prototype, '__proto__', {
            get: function() { return null; },
            set: function() { return false; },
            configurable: false,
          });

          // Exhaustively freeze all standard prototypes to prevent Prototype Pollution exploits
          const prototypesToFreeze = [
            Object.prototype,
            Array.prototype,
            Function.prototype,
            String.prototype,
            Number.prototype,
            Boolean.prototype,
            Date.prototype,
            RegExp.prototype,
            Promise.prototype,
            Map.prototype,
            Set.prototype,
            WeakMap.prototype,
            WeakSet.prototype,
            Error.prototype,
            Symbol.prototype,
            AsyncFunction.prototype,
            GeneratorFunction.prototype,
            AsyncGeneratorFunction.prototype,
          ];

          for (const proto of prototypesToFreeze) {
            try {
              Object.freeze(proto);
            } catch (e) {}
          }
        } catch (e) {}

        self.onmessage = function(e) {
          const logs = [];
          const customConsole = {
            log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            error: (...args) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            warn: (...args) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            info: (...args) => logs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          };

          try {
            const rawCode = String(e.data || "");

            // Additional execution pre-screening
            if (/\\b(?:importScripts|constructor\\s*\\.\\s*constructor|__proto__)\\b/i.test(rawCode)) {
              throw new Error("Security Policy Violation: ตรวจพบคำสั่งต้องห้ามใน Sandbox");
            }

            const runner = new InternalRunnerFunction(
              'console',
              'Function',
              '"use strict"; ' + rawCode
            );

            const ret = runner(customConsole, blockedConstructor);
            self.postMessage({
              success: true,
              logs,
              returnValue: ret !== undefined ? (typeof ret === 'object' ? JSON.stringify(ret, null, 2) : String(ret)) : undefined
            });
          } catch (err) {
            self.postMessage({
              success: false,
              logs,
              error: err && err.message ? err.message : String(err)
            });
          }
        };
      })();
    `;

    let blob: Blob;
    let workerUrl: string;
    try {
      blob = new Blob([workerScript], { type: "application/javascript" });
      workerUrl = URL.createObjectURL(blob);
    } catch {
      return resolve({
        success: false,
        output: "",
        error: "ไม่สามารถสร้าง Web Worker สำหรับ Sandbox ได้ เพื่อความปลอดภัยระบบจะไม่รันโค้ดบน Main Thread",
        executionTimeMs: "0.00",
      });
    }

    let worker: Worker | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (worker) {
        worker.terminate();
        worker = null;
      }
      try {
        URL.revokeObjectURL(workerUrl);
      } catch {}
    };

    try {
      worker = new Worker(workerUrl);

      // Hard 3-second timeout to prevent infinite loops (e.g. while(true))
      timeoutTimer = setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          output: logs.join("\n"),
          error: "Execution Timeout: โค้ดใช้เวลาประมวลผลนานเกิน 3 วินาที (ตรวจพบลูปไม่สิ้นสุดหรือคำนวณหนักเกินไป)",
          executionTimeMs: "3000",
        });
      }, 3000);

      worker.onmessage = (event) => {
        cleanup();
        const elapsed = (performance.now() - start).toFixed(2);
        const { success, logs: resLogs, returnValue, error } = event.data;
        const finalOutput = (resLogs && resLogs.length > 0)
          ? resLogs.join("\n")
          : (returnValue !== undefined ? returnValue : "โค้ดประมวลผลสำเร็จ (ไม่มีผลลัพธ์จาก console)");

        resolve({
          success,
          output: finalOutput,
          error,
          executionTimeMs: elapsed,
        });
      };

      worker.onerror = (errEvent) => {
        cleanup();
        const elapsed = (performance.now() - start).toFixed(2);
        resolve({
          success: false,
          output: "",
          error: errEvent.message || "เกิดข้อผิดพลาดในการประมวลผล Web Worker Sandbox",
          executionTimeMs: elapsed,
        });
      };

      worker.postMessage(compiledCode);
    } catch (e: any) {
      cleanup();
      resolve({
        success: false,
        output: "",
        error: `ไม่สามารถเริ่มต้น Web Worker ได้: ${e?.message || String(e)}`,
        executionTimeMs: (performance.now() - start).toFixed(2),
      });
    }
  });
}
