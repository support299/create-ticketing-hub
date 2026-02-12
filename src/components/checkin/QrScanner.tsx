import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  enabled: boolean;
}

export function QrScanner({ onScan, enabled }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScannedRef = useRef<string>('');

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanning = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    lastScannedRef.current = '';
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code?.data && code.data !== lastScannedRef.current) {
      lastScannedRef.current = code.data;
      onScan(code.data);
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onScan]);

  // CRITICAL: getUserMedia called directly in click handler for mobile compatibility
  const startScanning = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('[QrScanner] Camera error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else if (msg.includes('NotReadableError')) {
        setError('Camera is in use by another app. Close it and try again.');
      } else {
        setError('Could not access camera. Please try again.');
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

      {/* Video + viewfinder — always in DOM, shown when scanning */}
      <div className={isScanning ? 'relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 bg-black' : 'hidden'}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* Hidden canvas for frame analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Clear center cutout via box-shadow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] rounded-lg"
            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
          />

          {/* Corner brackets */}
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%]" viewBox="0 0 100 100" fill="none">
            <path d="M 2 20 L 2 2 L 20 2" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            <path d="M 80 2 L 98 2 L 98 20" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            <path d="M 2 80 L 2 98 L 20 98" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
            <path d="M 80 98 L 98 98 L 98 80" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
          </svg>

          {/* Scanning line */}
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
