import { useEffect, useRef, useState } from 'react';
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

  const startScanning = async () => {
    setError(null);

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (decodedText !== lastScannedRef.current) {
            lastScannedRef.current = decodedText;
            onScan(decodedText);
          }
        },
        () => {
          // ignore scan failures (no QR in frame)
        }
      );

      setIsScanning(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes('NotAllowedError')
            ? 'Camera access denied. Please allow camera permissions.'
            : err.message
          : 'Failed to start camera'
      );
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    }
    scannerRef.current = null;
    setIsScanning(false);
    lastScannedRef.current = '';
  };

  useEffect(() => {
    if (!enabled && isScanning) {
      stopScanning();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-4">
      {!isScanning ? (
        <Button
          onClick={startScanning}
          variant="outline"
          className="w-full h-14 text-lg gap-3 rounded-xl"
        >
          <Camera className="h-5 w-5" />
          Scan QR Code
        </Button>
      ) : (
        <Button
          onClick={stopScanning}
          variant="outline"
          className="w-full gap-3 rounded-xl border-destructive text-destructive hover:bg-destructive/10"
        >
          <CameraOff className="h-4 w-4" />
          Stop Scanner
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <div
        id={containerId}
        className={isScanning ? 'rounded-xl overflow-hidden border border-border' : 'hidden'}
      />
    </div>
  );
}
