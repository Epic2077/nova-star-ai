/**
 * Web Worker — sandboxed JavaScript execution.
 *
 * Runs user code inside an IIFE that **shadows every dangerous Worker global**
 * (fetch, XMLHttpRequest, importScripts, WebSocket, self, globalThis, …).
 * Only safe built-ins (Math, Date, JSON, etc.) are exposed via a mock `console`.
 *
 * Because this executes in a Worker thread the browser already guarantees:
 *   • No DOM / document / window access
 *   • No cookie / localStorage access
 *   • Separate thread — cannot block the UI
 *   • Can be terminated externally via worker.terminate()
 */

/* eslint-disable no-restricted-globals */
self.onmessage = function (e) {
  var code = e.data.code;
  var logs = [];

  /* ---- mock console ---- */
  var mockConsole = {
    log: function () {
      logs.push(Array.prototype.map.call(arguments, String).join(" "));
    },
    error: function () {
      logs.push(
        "[error] " + Array.prototype.map.call(arguments, String).join(" "),
      );
    },
    warn: function () {
      logs.push(
        "[warn] " + Array.prototype.map.call(arguments, String).join(" "),
      );
    },
    info: function () {
      logs.push(
        "[info] " + Array.prototype.map.call(arguments, String).join(" "),
      );
    },
    table: function (data) {
      logs.push(JSON.stringify(data, null, 2));
    },
  };

  var start = performance.now();

  try {
    /*
     * Wrap user code in an IIFE whose parameters shadow every dangerous
     * identifier available in a Worker scope. The shadowed values are all
     * `undefined`, so any attempt to use them throws a clear TypeError.
     */
    var wrapped =
      '"use strict";\n' +
      "return (function(\n" +
      "  console,\n" +
      "  self, globalThis, fetch, XMLHttpRequest,\n" +
      "  importScripts, postMessage, close,\n" +
      "  Worker, SharedWorker, WebSocket, EventSource,\n" +
      "  indexedDB, caches, navigator, location, performance\n" +
      ") {\n" +
      code +
      "\n})(\n" +
      "  arguments[0],\n" + // console  → mockConsole
      "  undefined, undefined, undefined, undefined,\n" +
      "  undefined, undefined, undefined,\n" +
      "  undefined, undefined, undefined, undefined,\n" +
      "  undefined, undefined, undefined, undefined, undefined\n" +
      ");";

    var fn = new Function(wrapped);
    var result = fn(mockConsole);

    if (result !== undefined) {
      var formatted =
        typeof result === "object"
          ? JSON.stringify(result, null, 2)
          : String(result);
      logs.push(formatted);
    }

    var elapsed = Math.round(performance.now() - start);
    self.postMessage({
      output: logs.join("\n").slice(0, 10000),
      executionTime: elapsed,
    });
  } catch (err) {
    var elapsed2 = Math.round(performance.now() - start);
    self.postMessage({
      output: logs.join("\n").slice(0, 10000),
      error: err.message,
      executionTime: elapsed2,
    });
  }
};
