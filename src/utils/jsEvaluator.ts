/**
 * Client-Side Sandboxed JavaScript / TypeScript Evaluator
 * Runs exclusively in an isolated Web Worker.
 * All network (fetch, XHR, WebSocket, EventSource, sendBeacon),
 * storage (indexedDB, localStorage), and worker creation APIs are disabled and sealed.
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

    // Transpile TypeScript to JavaScript safely using Sucrase before sending to Worker
    let compiledCode = code;
    try {
      compiledCode = transform(code, { transforms: ["typescript"] }).code;
    } catch (err: any) {
      return resolve({
        success: false,
        output: "",
        error: `TypeScript Compilation Error: ${err.message || String(err)}`,
        executionTimeMs: (performance.now() - start).toFixed(2),
      });
    }

    // Worker code that strips and freezes all dangerous APIs before user code executes
    const workerScript = `
      (function() {
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
          'Reflect'
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

        // Neutralize eval permanently
        try {
          Object.defineProperty(self, 'eval', { value: undefined, writable: false, configurable: false });
          Object.defineProperty(globalThis, 'eval', { value: undefined, writable: false, configurable: false });
        } catch (e) {}

        if (self.navigator) {
          try {
            Object.defineProperty(self.navigator, 'sendBeacon', {
              value: undefined,
              writable: false,
              configurable: false,
            });
          } catch (e) {}
        }

        // 2. Preserve native Function builder for runner, then permanently neutralize
        // constructor-chaining escapes on Function, AsyncFunction, GeneratorFunction, and AsyncGeneratorFunction
        const SafeFunction = Function;
        try {
          const blockedConstructor = function() {
            throw new Error("Security Policy Violation: Dynamic code evaluation via Function constructor is permanently disabled in sandbox.");
          };

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

            // 3. Heuristic Pre-Check (Detect dangerous keywords and string concatenation tricks)
            // Detect string concatenation trying to assemble forbidden terms
            const stringConcatForbidden = /['"][a-zA-Z0-9_]*['"]\s*\+\s*['"][a-zA-Z0-9_]*['"]/i.test(rawCode);
            if (stringConcatForbidden) {
              const simplified = rawCode.replace(/['"]\s*\+\s*['"]/g, "");
              if (/(?:__proto__|importScripts|\beval\b|constructor|Function|prototype|indexedDB|localStorage)/i.test(simplified)) {
                throw new Error("Security Policy Violation: ตรวจพบความพยายามหลบเลี่ยง Sandbox ผ่าน String Concatenation");
              }
            }

            if (/(?:__proto__|importScripts|\beval\s*\(|debugger|\bconstructor\b|getPrototypeOf|Object\.defineProperty)/i.test(rawCode)) {
              throw new Error("Security Policy Violation: ตรวจพบคำสั่งหรือคีย์เวิร์ดที่มีความเสี่ยงสูง (Sandbox Security Policy)");
            }

            const runner = new SafeFunction(
              'console',
              '"use strict"; ' + rawCode
            );

            const ret = runner(customConsole);
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
