import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
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
        scannerRef.current.clear();
      }
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
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
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
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('NotAllowedError') || msg.includes('Permission')
          ? 'Camera access denied. Please allow camera permissions in your browser settings.'
          : msg.includes('NotFoundError')
            ? 'No camera found on this device.'
            : 'Failed to start camera. Please try again.'
      );
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

  if (!isScanning) {
    return (
      <div className="space-y-3">
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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Viewfinder container */}
      <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 bg-black">
        {/* Camera feed — html5-qrcode renders the video here */}
        <div id={containerId} className="absolute inset-0 [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Semi-transparent border areas */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Clear center cutout */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] bg-transparent rounded-lg"
            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
          />

          {/* Corner brackets */}
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%]" viewBox="0 0 100 100" fill="none">
            {/* Top-left */}
            <path d="M 2 20 L 2 2 L 20 2" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            {/* Top-right */}
            <path d="M 80 2 L 98 2 L 98 20" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            {/* Bottom-left */}
            <path d="M 2 80 L 2 98 L 20 98" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            {/* Bottom-right */}
            <path d="M 80 98 L 98 98 L 98 80" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
          </svg>

          {/* Scanning line animation */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] overflow-hidden rounded-lg">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
          </div>
        </div>

        {/* Label */}
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
        className="w-full gap-2 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10"
      >
        <CameraOff className="h-4 w-4" />
        Close Scanner
      </Button>
    </div>
  );
}
