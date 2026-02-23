/**
 * Web Worker — sandboxed Python execution via Pyodide (CPython → WebAssembly).
 *
 * On first run Pyodide is loaded from the jsDelivr CDN (~11 MB). The runtime
 * is cached by the browser so subsequent runs are near-instant. stdout/stderr
 * are captured via StringIO redirection.
 *
 * The worker posts a { status: "loading" } message before the first run so the
 * UI can show a "Loading Python…" indicator.
 */

/* eslint-disable no-restricted-globals */
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

var pyodideInstance = null;
var pyodideLoading = null;

function initPyodide() {
  if (pyodideLoading) return pyodideLoading;
  // loadPyodide is provided by the importScripts above
  // eslint-disable-next-line no-undef
  pyodideLoading = loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
  });
  return pyodideLoading;
}

self.onmessage = async function (e) {
  var code = e.data.code;
  var start = performance.now();

  try {
    /* Signal that we're loading the runtime (first run only) */
    if (!pyodideInstance) {
      self.postMessage({ status: "loading" });
      pyodideInstance = await initPyodide();
    }

    /* Reset stdout / stderr for this execution */
    pyodideInstance.runPython(
      "import sys\nfrom io import StringIO\n" +
        "sys.stdout = StringIO()\nsys.stderr = StringIO()\n",
    );

    /* Execute user code */
    var result;
    try {
      result = pyodideInstance.runPython(code);
    } catch (pyErr) {
      var stdout1 = pyodideInstance.runPython("sys.stdout.getvalue()");
      var stderr1 = pyodideInstance.runPython("sys.stderr.getvalue()");
      self.postMessage({
        output: (stdout1 || "").slice(0, 10000),
        error: stderr1 || pyErr.message,
        executionTime: Math.round(performance.now() - start),
      });
      return;
    }

    var stdout = pyodideInstance.runPython("sys.stdout.getvalue()");
    var output = stdout || "";

    /* Append the expression result if it's not None */
    if (result !== undefined && result !== null) {
      var resultStr = String(result);
      if (resultStr !== "None") {
        output = output ? output + resultStr : resultStr;
      }
    }

    self.postMessage({
      output: output.slice(0, 10000),
      executionTime: Math.round(performance.now() - start),
    });
  } catch (err) {
    self.postMessage({
      output: "",
      error: err.message || "Python execution failed",
      executionTime: Math.round(performance.now() - start),
    });
  }
};
