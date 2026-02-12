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

      {/* 
        html5-qrcode renders its own video + shaded region inside this div.
        We just style it cleanly and let the library handle the viewfinder.
        No custom overlays — they were blocking the video feed on mobile.
      */}
      <div
        id={containerId}
        className={isScanning ? 'w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-primary/30' : 'hidden'}
        style={isScanning ? { minHeight: 300 } : undefined}
      />

      {isScanning && (
        <Button
          onClick={stopScanning}
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <CameraOff className="h-4 w-4" />
          Close Scanner
        </Button>
      )}
    </div>
  );
}
