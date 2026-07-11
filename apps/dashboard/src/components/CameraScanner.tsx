import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { X, Keyboard, Check, Square, ScanLine, ShoppingCart, RotateCcw } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";
import { toast } from "sonner";

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  scanCount?: number;
  addedCount?: number;
}

/**
 * Camera-based barcode scanner.
 *
 * Strategy:
 *  1. Try native BarcodeDetector API (Chrome/Android, Safari 17+) — fastest.
 *  2. Fall back to @zxing/browser using decodeFromVideoDevice (manages its
 *     own MediaStream — more reliable than passing one in).
 *  3. Manual entry input as last-resort (low-light, broken camera, etc).
 *
 * UX feedback: vibration + green flash + toast on successful detection.
 */
export default function CameraScanner({ open, onClose, onDetected, scanCount = 0, addedCount = 0 }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const detectorTimerRef = useRef<number | null>(null);
  const lastCodeRef = useRef<string>("");
  const lastCodeAtRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [active, setActive] = useState(false);
  const [flash, setFlash] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [stopped, setStopped] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const stopCamera = useCallback(() => {
    if (detectorTimerRef.current) {
      window.clearInterval(detectorTimerRef.current);
      detectorTimerRef.current = null;
    }
    if (zxingControlsRef.current) {
      try { zxingControlsRef.current.stop(); } catch { /* noop */ }
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setStartRequested(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setPermissionDenied(false);
    setActive(false);
    setStopped(false);
    setManualMode(false);
    setManualCode("");
    lastCodeRef.current = "";
    lastCodeAtRef.current = 0;

    // Don't start camera until user taps "Start Camera" (mobile gesture requirement)
    if (!startRequested) return;

    const handleCode = (raw: string) => {
      if (cancelled) return;
      const code = (raw || "").trim();
      if (!code) return;

      // Debounce identical reads within 1.5s — avoids accidental double-fire
      const now = Date.now();
      if (code === lastCodeRef.current && now - lastCodeAtRef.current < 1500) return;
      lastCodeRef.current = code;
      lastCodeAtRef.current = now;

      // Feedback: vibrate + green flash (toast handled by parent so we can stay continuous)
      try { navigator.vibrate?.(80); } catch { /* noop */ }
      setFlash(true);
      window.setTimeout(() => setFlash(false), 250);

      // Continuous mode: keep camera running so multiple items can be scanned
      // in a row. The parent handles dedupe via lastScanRef + our internal
      // 1.5s same-code debounce above.
      onDetected(code);
    };

    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        // Path A: native BarcodeDetector ----------------------------------
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (cancelled) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play().catch(() => {});
            }
            setActive(true);

            const detector = new BD({
              formats: [
                "ean_13", "ean_8", "upc_a", "upc_e",
                "code_128", "code_39", "code_93",
                "codabar", "itf", "qr_code",
              ],
            });

            detectorTimerRef.current = window.setInterval(async () => {
              if (cancelled || !videoRef.current) return;
              if (videoRef.current.readyState < 2) return; // not enough data yet
              try {
                const codes = await detector.detect(videoRef.current);
                if (codes && codes.length > 0 && codes[0].rawValue) {
                  handleCode(codes[0].rawValue);
                }
              } catch {
                /* skip frame */
              }
            }, 200);
            return;
          } catch (bdErr) {
            // Fall through to ZXing
            console.warn("BarcodeDetector failed, falling back to ZXing", bdErr);
          }
        }

        // Path B: ZXing ----------------------------------------------------
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR, BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
        });

        // Pick the rear camera explicitly when possible
        const devices = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);
        const rear =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ||
          devices[devices.length - 1];
        const deviceId = rear?.deviceId;

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (cancelled) return;
            if (result) handleCode(result.getText());
            // err is normal "not found in this frame" — ignore
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        zxingControlsRef.current = controls;
        // Capture the stream zxing created so we can stop tracks too
        const s = (videoRef.current?.srcObject as MediaStream) || null;
        streamRef.current = s;
        setActive(true);
      } catch (err: any) {
        const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
        const msg =
          denied
            ? "ক্যামেরার অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে এই সাইটের জন্য Camera permission Allow করুন।"
            : err?.name === "NotFoundError"
            ? "এই ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি।"
            : err?.name === "NotReadableError"
            ? "ক্যামেরা অন্য অ্যাপ ব্যবহার করছে — সেটি বন্ধ করে আবার চেষ্টা করুন।"
            : err?.message || "ক্যামেরা চালু করা যায়নি।";
        setError(msg);
        setPermissionDenied(denied);
        toast.error(msg);
      }
    };

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, startRequested, onDetected, stopCamera, retryNonce]);

  const handleStop = () => {
    setStopped(true);
    stopCamera();
  };

  const handleResume = () => {
    setStopped(false);
    setStartRequested(true);
  };

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) {
      toast.error("Enter a barcode");
      return;
    }
    onDetected(code);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" /> Scan barcode
          </DialogTitle>
          <DialogDescription>
            {manualMode
              ? "Type the barcode number from the product label."
              : "Hold the barcode steady inside the frame. Good lighting helps."}
          </DialogDescription>
        </DialogHeader>

        {!manualMode ? (
          <div className="relative bg-black aspect-[4/3] w-full">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Scan window overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-4/5 h-1/3 border-2 border-primary/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                <div className="w-full h-0.5 bg-primary animate-pulse mt-[calc(50%-1px)]" />
              </div>
            </div>
            {/* Success flash */}
            {flash && (
              <div className="absolute inset-0 bg-accent/40 grid place-items-center pointer-events-none">
                <Check className="h-16 w-16 text-accent-foreground drop-shadow-lg" />
              </div>
            )}
            {/* Scan counters overlay */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                  <ScanLine className="h-3 w-3" />
                  {scanCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/80 text-primary-foreground text-xs font-medium backdrop-blur-sm">
                  <ShoppingCart className="h-3 w-3" />
                  {addedCount}
                </span>
              </div>
            </div>
            {!active && !error && !stopped && !startRequested && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 text-primary-foreground p-4 text-center">
                <div className="space-y-4 max-w-xs">
                  <ScanLine className="h-12 w-12 mx-auto opacity-70" />
                  <div className="text-sm font-medium">Barcode Scanner</div>
                  <p className="text-xs text-white/70 max-w-xs">
                    Hold the barcode steady inside the frame. Good lighting helps.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setStartRequested(true)}
                    className="bg-primary text-primary-foreground px-8"
                  >
                    <ScanLine className="h-5 w-5 mr-2" /> Start Camera
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white/60" onClick={() => setManualMode(true)}>
                    <Keyboard className="h-3.5 w-3.5 mr-1.5" /> Type barcode manually
                  </Button>
                </div>
              </div>
            )}
            {!active && !error && !stopped && startRequested && (
              <div className="absolute inset-0 grid place-items-center text-primary-foreground text-sm">
                Starting camera…
              </div>
            )}
            {stopped && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 text-primary-foreground p-4 text-center">
                <div className="space-y-3">
                  <div className="text-sm">Camera stopped</div>
                  <Button size="sm" onClick={handleResume} variant="outline" className="text-foreground">
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Resume scanning
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 grid place-items-center bg-destructive/90 text-destructive-foreground p-5 text-center text-sm">
                <div className="space-y-3 max-w-xs">
                  <ScanLine className="h-10 w-10 mx-auto opacity-80" />
                  <div className="font-medium">{error}</div>
                  {permissionDenied && (
                    <div className="text-[11px] text-left text-white/80 bg-card/10 rounded-lg p-3 space-y-1.5">
                      <p className="font-medium text-white">🔧 ঠিক করার উপায়:</p>
                      <p className="flex items-start gap-1.5">
                        <span className="opacity-60 shrink-0">1.</span>
                        <span>Address bar-এ <strong className="text-white">🔒</strong> বা <strong className="text-white">ⓘ</strong> ট্যাপ করুন</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="opacity-60 shrink-0">2.</span>
                        <span><strong>Site Settings</strong> → <strong>Camera</strong> → <strong className="text-white">Allow</strong></span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="opacity-60 shrink-0">3.</span>
                        <span>পেজ reload করে আবার চেষ্টা করুন</span>
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setError(null); setStartRequested(true); setRetryNonce((n) => n + 1); }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Try again
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setManualMode(true)} className="text-foreground">
                      <Keyboard className="h-3.5 w-3.5 mr-1" /> Type manually
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-3">
            <Input
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="e.g. 8901234567890"
              className="font-mono text-lg"
            />
            <Button onClick={submitManual} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="h-4 w-4 mr-2" /> Use this barcode
            </Button>
          </div>
        )}

        {/* Stats row */}
        <div className="px-4 pt-3 pb-0 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ScanLine className="h-4 w-4" />
            <span className="font-medium text-foreground">{scanCount}</span>
            <span>scans</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            <span className="font-medium text-foreground">{addedCount}</span>
            <span>added</span>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setManualMode((m) => !m)}
          >
            <Keyboard className="h-4 w-4 mr-1.5" />
            {manualMode ? "Use camera" : "Type manually"}
          </Button>
          <div className="flex items-center gap-2">
            {active && !stopped && !manualMode && (
              <Button variant="outline" size="sm" onClick={handleStop} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Square className="h-3.5 w-3.5 mr-1 fill-current" /> Stop
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
