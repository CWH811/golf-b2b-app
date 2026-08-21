'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

// ── Types matching /api/scan route response ──
type ProductDetail = {
  sku: string;
  name: string;
  base_price: number;
};

type ScanResult = {
  match_found: boolean;
  matched_sku: string | null;
  confidence: number;
  reasoning: string;
  product_details?: ProductDetail;
  error?: string;
  timeout?: boolean;
  low_light?: boolean;
};

type ScanState =
  | { status: 'idle' }
  | { status: 'streaming' }
  | { status: 'capturing' }
  | { status: 'scanning' }
  | { status: 'success'; result: ScanResult }
  | { status: 'low_light'; result: ScanResult }
  | { status: 'manual_review'; result: ScanResult }
  | { status: 'no_match'; result: ScanResult }
  | { status: 'timeout' }
  | { status: 'offline' }
  | { status: 'error'; message: string };

// ── Queue for background-syncing photos when offline ──
type QueuedPhoto = {
  id: string;
  blob: Blob;
  timestamp: number;
  retries: number;
};

const QUEUE_KEY = 'gcore_scan_queue';

function getQueue(): QueuedPhoto[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedPhoto[]) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // sessionStorage full — silently fail
  }
}

// ── Component ──
export function ProductScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanState, setScanState] = useState<ScanState>({ status: 'idle' });
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(() => getQueue().length);

  // ── Online/offline tracking ──
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const initialOnline = window.navigator.onLine;
    setTimeout(() => setIsOnline(initialOnline), 0);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Start camera stream (rear-facing) ──
  const startCamera = useCallback(async () => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setScanState({ status: 'streaming' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Unable to access the camera. Ensure your device has a camera and try again.';
      setScanState({ status: 'error', message });
    }
  }, []);

  // ── Stop camera stream ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ── Capture frame and send to /api/scan ──
  const captureAndScan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Draw current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    setScanState({ status: 'scanning' });

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setScanState({ status: 'error', message: 'Failed to capture image from camera.' });
          return;
        }

        // If offline, queue the photo for background sync
        if (!navigator.onLine) {
          const queue: QueuedPhoto[] = getQueue();
          queue.push({
            id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            blob,
            timestamp: Date.now(),
            retries: 0,
          });
          saveQueue(queue);
          setQueuedCount(queue.length);
          setScanState({ status: 'offline' });
          return;
        }

        // Build form data
        const formData = new FormData();
        formData.append('image', blob, 'scan.jpg');

        // Abort controller for 15-second timeout + 5s buffer
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
          const response = await fetch('/api/scan', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }

          const result: ScanResult = await response.json();

          // Route to correct UI state
          if (result.timeout) {
            setScanState({ status: 'timeout' });
          } else if (result.low_light) {
            setScanState({ status: 'low_light', result });
          } else if (result.match_found && result.confidence < 85) {
            setScanState({ status: 'manual_review', result });
          } else if (result.match_found) {
            setScanState({ status: 'success', result });
          } else {
            setScanState({ status: 'no_match', result });
          }
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof DOMException && err.name === 'AbortError') {
            setScanState({ status: 'timeout' });
          } else if (err instanceof TypeError && err.message === 'Failed to fetch') {
            // Network dropped mid-request — queue for retry
            const queue: QueuedPhoto[] = getQueue();
            queue.push({
              id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`,
              blob,
              timestamp: Date.now(),
              retries: 0,
            });
            saveQueue(queue);
            setQueuedCount(queue.length);
            setScanState({ status: 'offline' });
          } else {
            setScanState({
              status: 'error',
              message: err instanceof Error ? err.message : 'An unexpected error occurred during scanning.',
            });
          }
        }
      },
      'image/jpeg',
      0.9
    );
  }, []);

  // ── Retry scanning (re-process queued items) ──
  const retryQueuedItems = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    // Only retry if online
    if (!navigator.onLine) return;

    const remaining: QueuedPhoto[] = [];

    for (const item of queue) {
      const formData = new FormData();
      formData.append('image', item.blob, 'scan.jpg');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch('/api/scan', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result: ScanResult = await response.json();
          if (result.match_found && result.confidence >= 85) {
            // Successfully processed — do not re-queue
            continue;
          }
        }
      } catch {
        // Still failing — keep in queue
      }

      // If we got here, the item still failed
      if (item.retries < 5) {
        remaining.push({ ...item, retries: item.retries + 1 });
      }
    }

    saveQueue(remaining);
    setQueuedCount(remaining.length);
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ── Reset to idle ──
  const reset = useCallback(() => {
    stopCamera();
    setScanState({ status: 'idle' });
  }, [stopCamera]);

  // ── Render helpers ──

  const renderScanningOverlay = () => (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#161719]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#39FF14] border-t-transparent" />
        <p className="text-sm font-medium text-slate-200">AI is analyzing the image…</p>
      </div>
    </div>
  );

  const renderLowLightOverlay = (result: ScanResult) => (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#161719]/85 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-2xl border border-amber-500/30 bg-[#1b1d20]/95 p-6 text-center shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
          <svg className="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-amber-200">Low Light Detected</h3>
        <p className="mt-2 text-sm text-slate-400">
          The image is too dark for accurate AI analysis. Please move to a brighter area or turn on additional lighting.
        </p>
        {result.reasoning ? (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300/80">
            {result.reasoning}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#101210] transition hover:bg-amber-400"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderManualReviewCard = (result: ScanResult) => (
    <div className="rounded-2xl border border-amber-500/30 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
          <svg className="h-3.5 w-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
          Manual Review Required
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-400">
        Confidence score is{' '}
        <span className="font-bold text-amber-300">{result.confidence}%</span> — below the 85% threshold.
      </p>

      {result.product_details ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/5 bg-[#161719] p-4">
          <div>
            <span className="text-xs text-slate-500">SKU</span>
            <p className="font-mono text-sm font-semibold text-white">{result.product_details.sku}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Name</span>
            <p className="text-sm font-semibold text-white">{result.product_details.name}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Base Price</span>
            <p className="text-sm font-semibold text-white">${result.product_details.base_price.toFixed(2)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          {result.matched_sku ? `Suggested SKU: ${result.matched_sku}` : 'No product details available.'}
        </p>
      )}

      {result.reasoning ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300/70">
          {result.reasoning}
        </p>
      ) : null}

      {/* Manual review actions */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setScanState({ status: 'success', result })}
          className="flex-1 rounded-xl bg-[#39FF14] px-4 py-2.5 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d]"
        >
          Accept & Submit
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Re-scan
        </button>
      </div>
    </div>
  );

  const renderSuccessCard = (result: ScanResult) => (
    <div className="rounded-2xl border border-[#39FF14]/30 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#39FF14]/20">
          <svg className="h-3.5 w-3.5 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#39FF14]">
          Match Found
        </span>
        <span className="ml-auto rounded-full bg-[#39FF14]/10 px-2.5 py-0.5 text-xs font-bold text-[#39FF14]">
          {result.confidence}%
        </span>
      </div>

      {result.product_details ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/5 bg-[#161719] p-4">
          <div>
            <span className="text-xs text-slate-500">SKU</span>
            <p className="font-mono text-sm font-semibold text-white">{result.product_details.sku}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Name</span>
            <p className="text-sm font-semibold text-white">{result.product_details.name}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Base Price</span>
            <p className="text-sm font-semibold text-white">${result.product_details.base_price.toFixed(2)}</p>
          </div>
        </div>
      ) : null}

      {result.reasoning ? (
        <p className="mt-3 rounded-lg bg-[#39FF14]/5 px-3 py-2 text-xs text-slate-400">{result.reasoning}</p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-5 w-full rounded-xl bg-[#39FF14] px-4 py-2.5 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d]"
      >
        Scan Another Item
      </button>
    </div>
  );

  const renderNoMatchCard = (result: ScanResult) => (
    <div className="rounded-2xl border border-slate-600/30 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-500/20">
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          No Match Found
        </span>
      </div>

      {result.reasoning ? (
        <p className="mt-3 text-sm text-slate-400">{result.reasoning}</p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
      >
        Try Again
      </button>
    </div>
  );

  const renderTimeoutCard = () => (
    <div className="rounded-2xl border border-slate-600/30 bg-[#1b1d20]/95 p-6 text-center shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/20">
        <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-200">Scan Timed Out</h3>
      <p className="mt-2 text-sm text-slate-400">
        The AI analysis took too long — likely due to poor network conditions on the course.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const renderOfflineCard = () => (
    <div className="rounded-2xl border border-amber-500/30 bg-[#1b1d20]/95 p-6 text-center shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
        <svg className="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414M3 3l18 18" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-amber-200">You Are Offline</h3>
      <p className="mt-2 text-sm text-slate-400">
        The photo has been queued locally. It will be automatically uploaded once your connection is restored.
      </p>
      {queuedCount > 0 ? (
        <div className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300/80">
          {queuedCount} photo{queuedCount > 1 ? 's' : ''} waiting in queue
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
        >
          Back to Camera
        </button>
        {!isOnline ? null : (
          <button
            type="button"
            onClick={retryQueuedItems}
            className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#101210] transition hover:bg-amber-400"
          >
            Retry Queue ({queuedCount})
          </button>
        )}
      </div>
    </div>
  );

  const renderErrorCard = (message: string) => (
    <div className="rounded-2xl border border-red-500/30 bg-[#1b1d20]/95 p-6 text-center shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
        <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-200">Scan Error</h3>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
      >
        Dismiss
      </button>
    </div>
  );

  // ── Main render ──
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#39FF14]">AI Product Scanner</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">Scan & Identify</h3>
        </div>
        {!isOnline ? (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Offline
          </div>
        ) : null}
      </div>

      {scanState.status === 'idle' ? (
        /* ── Start Screen ── */
        <div className="flex flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#39FF14]/30 bg-[#161719] px-4 py-16">
            <svg className="mb-4 h-16 w-16 text-[#39FF14]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-slate-400">
              Point your camera at a product barcode or label to auto-identify it.
            </p>
          </div>

          <button
            type="button"
            onClick={startCamera}
            className="w-full rounded-xl bg-[#39FF14] px-4 py-3 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d]"
          >
            Open Camera
          </button>

          {/* Queued items indicator */}
          {queuedCount > 0 ? (
            <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/80">
              {queuedCount} photo{queuedCount > 1 ? 's' : ''} queued for upload.
              {isOnline ? (
                <button
                  type="button"
                  onClick={retryQueuedItems}
                  className="ml-1 underline hover:text-amber-200"
                >
                  Retry now
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : scanState.status === 'streaming' || scanState.status === 'scanning' ? (
        /* ── Live Camera ── */
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Scanning frame guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-xl border-2 border-[#39FF14]/50 opacity-60" />
          </div>

          {scanState.status === 'scanning' ? renderScanningOverlay() : null}

          {/* Capture button — only show when streaming, not scanning */}
          {scanState.status === 'streaming' ? (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={captureAndScan}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/10 backdrop-blur transition hover:bg-white/20"
              >
                <div className="h-12 w-12 rounded-full bg-white" />
              </button>
            </div>
          ) : null}

          {/* Close camera button */}
          <button
            type="button"
            onClick={reset}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 transition hover:bg-black/70 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}

      {/* ── Result Cards ── */}
      {scanState.status === 'success' ? renderSuccessCard(scanState.result) : null}
      {scanState.status === 'low_light' ? renderLowLightOverlay(scanState.result) : null}
      {scanState.status === 'manual_review' ? renderManualReviewCard(scanState.result) : null}
      {scanState.status === 'no_match' ? renderNoMatchCard(scanState.result) : null}
      {scanState.status === 'timeout' ? renderTimeoutCard() : null}
      {scanState.status === 'offline' ? renderOfflineCard() : null}
      {scanState.status === 'error' ? renderErrorCard(scanState.message) : null}

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}