import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  enabled: boolean;
}

export function QrScanner({ onScan, enabled }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>('');
  const containerId = 'qr-reader';

  const stopScanning = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
    setIsScanning(false);
    lastScannedRef.current = '';
  }, []);

  const startScanning = async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (decodedText !== lastScannedRef.current) {
            lastScannedRef.current = decodedText;
            onScan(decodedText);
          }
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.error('[QrScanner] Failed to start:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else if (msg.includes('NotReadableError') || msg.includes('TrackStartError')) {
        setError('Camera is in use by another app. Please close other camera apps and try again.');
      } else {
        setError(`Could not start scanner: ${msg}`);
      }
    }
  };

  useEffect(() => {
    if (!enabled && isScanning) {
      stopScanning();
    }
  }, [enabled, isScanning, stopScanning]);

  useEffect(() => {
    return () => { stopScanning(); };
  }, [stopScanning]);

  return (
    <div className="space-y-3">
      {!isScanning && (
        <>
          <Button
            onClick={startScanning}
            variant="outline"
            className="w-full h-14 text-lg gap-3 rounded-xl"
          >
            <Camera className="h-5 w-5" />
            Open Camera Scanner
          </Button>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </>
      )}

      {/* Container always in DOM so html5-qrcode can find it */}
      <div className={isScanning ? '' : 'hidden'}>
        <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 bg-black">
          <div id={containerId} className="absolute inset-0 [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

          {/* Viewfinder overlay */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] rounded-lg"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            />
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%]" viewBox="0 0 100 100" fill="none">
              <path d="M 2 20 L 2 2 L 20 2" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
              <path d="M 80 2 L 98 2 L 98 20" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
              <path d="M 2 80 L 2 98 L 20 98" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
              <path d="M 80 98 L 98 98 L 98 80" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] overflow-hidden rounded-lg">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
            </div>
          </div>

          <div className="absolute bottom-3 left-0 right-0 z-20 text-center">
            <span className="text-xs text-white/80 bg-black/50 px-3 py-1 rounded-full">
              Point camera at QR code
            </span>
          </div>
        </div>

        <Button
          onClick={stopScanning}
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 mt-3"
        >
          <CameraOff className="h-4 w-4" />
          Close Scanner
        </Button>
      </div>
    </div>
  );
}
