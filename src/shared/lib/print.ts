/**
 * Print capability helpers — used by Invoice & ThermalReceipt so receipt
 * printing keeps working offline and degrades gracefully on devices that
 * can't open a print window (in-app browsers, some iOS WebViews, etc).
 */

export function canPrint(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.print !== "function") return false;
  // Detect common in-app browsers that block window.open / print reliably.
  const ua = navigator.userAgent || "";
  const inApp = /(FBAN|FBAV|Instagram|Line|MicroMessenger|WhatsApp)/i.test(ua);
  return !inApp;
}

export function canOpenPrintWindow(): boolean {
  if (!canPrint()) return false;
  // window.open may be blocked; we can't fully test without trying, but
  // popups are commonly blocked in standalone PWA mode on iOS.
  const isStandalone =
    (typeof window !== "undefined" &&
      window.matchMedia?.("(display-mode: standalone)").matches) ||
    // @ts-expect-error iOS Safari legacy
    (typeof navigator !== "undefined" && navigator.standalone === true);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  if (isStandalone && isIOS) return false;
  return true;
}

/**
 * Open an HTML string in a new window and trigger print.
 * Returns false if the popup was blocked so the caller can fall back to
 * downloading the HTML.
 */
export function printHtml(html: string, title = "Receipt"): boolean {
  if (!canOpenPrintWindow()) return false;

  // Open a maximized window — important for A4 invoice preview before printing
  const w = screen.availWidth ?? 1280;
  const h = screen.availHeight ?? 900;
  const win = window.open("", "_blank", `width=${w},height=${h},left=0,top=0`);
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  // Try to maximize the window (works in most desktop browsers)
  try { win.moveTo(0, 0); win.resizeTo(w, h); } catch { /* noop */ }

  // Wait for fonts & layout to settle before triggering print dialog.
  // 800ms gives Google Fonts (Inter) time to load over the network.
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* noop */
    }
    setTimeout(() => {
      try { win.close(); } catch { /* noop */ }
    }, 500);
  }, 800);
  return true;
}


export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
