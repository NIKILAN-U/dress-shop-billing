/**
 * Serializes a hidden, print-only DOM element (built with Tailwind's
 * `hidden print:block` pattern) into a standalone HTML document — including
 * the app's own compiled stylesheet, so it renders identically — and sends
 * it to Electron's silent print pipeline targeting a specific named printer.
 *
 * If the silent path fails for any reason (wrong printer name, a driver that
 * won't cooperate, anything) this falls back to the browser's native print
 * dialog — slower and needs a manual click, but it is the one path that is
 * known to reliably reach an actual printer, so a cashier is never left
 * unable to print a receipt because of a printer-targeting problem.
 */
export const printElementSilently = async (elementId, deviceName) => {
  const el = document.getElementById(elementId);
  if (!el) return { success: false, failureReason: `Element #${elementId} not found` };

  if (!window.electronAPI?.printReceipt) {
    window.print();
    return { success: true };
  }

  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join('\n');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    ${styleLinks}
    <style>
      @page { margin: 0; size: auto; }
      html, body { margin: 0; padding: 0; }
      #${elementId} { display: block !important; }
    </style>
  </head>
  <body>${el.outerHTML}</body>
</html>`;

  const result = await window.electronAPI.printReceipt(html, deviceName);
  if (!result?.success) {
    console.error('[Print] Silent print failed, falling back to print dialog:', result?.failureReason);
    window.print();
  }
  return result;
};
