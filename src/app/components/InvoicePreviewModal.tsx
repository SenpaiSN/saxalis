import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, RefreshCw, Maximize } from 'lucide-react';

interface Props {
  urls: string[];
  initialIndex?: number;
  onClose: () => void;
}

const clamp = (v: number, a = 0.5, b = 4) => Math.max(a, Math.min(b, v));

export default function InvoicePreviewModal({ urls, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastPanRef = useRef<{ x: number; y: number } | null>(null);
  const touchPinchRef = useRef<{ initialDist: number; initialScale: number; initialCenter?: { x: number; y: number }; initialOffset?: { x: number; y: number } } | null>(null);

  useEffect(() => {
    setIndex(initialIndex);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, urls.length - 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
      if (e.key === '+') setScale(s => clamp(s * 1.2));
      if (e.key === '-') setScale(s => clamp(s / 1.2));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [initialIndex, urls.length, onClose]);

  useEffect(() => {
    const onFullChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullChange);
    return () => document.removeEventListener('fullscreenchange', onFullChange);
  }, []);

  if (!urls || urls.length === 0) return null;
  const url = urls[index];
  const name = url.split('/').pop() ?? '';
  const isPdf = /\.pdf(\?|$)/i.test(url);

  const zoomIn = () => setScale(s => clamp(s * 1.2));
  const zoomOut = () => setScale(s => clamp(s / 1.2));
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen failed', e);
    }
  };

  // wheel zoom (desktop)
  const onWheel: React.WheelEventHandler = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = 1 - e.deltaY * 0.001;
      setScale(s => clamp(s * factor));
    }
  };

  // Pointer-based panning (mouse)
  const onPointerDown: React.PointerEventHandler = (e) => {
    if (e.pointerType === 'mouse') {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
    }
  };
  const onPointerMove: React.PointerEventHandler = (e) => {
    if (!isPanning || !lastPanRef.current) return;
    const dx = e.clientX - lastPanRef.current.x;
    const dy = e.clientY - lastPanRef.current.y;
    lastPanRef.current = { x: e.clientX, y: e.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  };
  const onPointerUp: React.PointerEventHandler = (e) => {
    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch {};
    setIsPanning(false);
    lastPanRef.current = null;
  };

  // Touch pinch zoom
  const getDistance = (t1: any, t2: any) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const onTouchStart: React.TouchEventHandler = (e) => {
    if (e.touches.length === 2) {
      const d = getDistance(e.touches[0], e.touches[1]);
      // compute center relative to container
      const rect = containerRef.current?.getBoundingClientRect();
      const centerX = rect ? ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) : 0;
      const centerY = rect ? ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) : 0;
      touchPinchRef.current = { initialDist: d, initialScale: scale, initialCenter: { x: centerX, y: centerY }, initialOffset: { ...offset } } as any;
    } else if (e.touches.length === 1) {
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsPanning(true);
    }
  };

  const onTouchMove: React.TouchEventHandler = (e) => {
    if (e.touches.length === 2 && touchPinchRef.current) {
      const d = getDistance(e.touches[0], e.touches[1]);
      const newScale = clamp(touchPinchRef.current.initialScale * (d / touchPinchRef.current.initialDist));
      setScale(newScale);

      // adjust offset so the pinch center remains fixed relative to the content
      const initCenter = touchPinchRef.current.initialCenter;
      const initScale = touchPinchRef.current.initialScale;
      const initOffset = touchPinchRef.current.initialOffset;
      if (initCenter && initOffset) {
        const factor = newScale / initScale;
        const newOffsetX = initOffset.x + (1 - factor) * (initCenter.x - initOffset.x);
        const newOffsetY = initOffset.y + (1 - factor) * (initCenter.y - initOffset.y);
        setOffset({ x: newOffsetX, y: newOffsetY });
      }

      e.preventDefault();
    } else if (e.touches.length === 1 && isPanning && lastPanRef.current) {
      const dx = e.touches[0].clientX - lastPanRef.current.x;
      const dy = e.touches[0].clientY - lastPanRef.current.y;
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    }
  };

  const onTouchEnd: React.TouchEventHandler = (e) => {
    // double-tap detection (single-finger)
    if (e.changedTouches && e.changedTouches.length === 1 && e.touches.length === 0) {
      const t = e.changedTouches[0];
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && (now - last.time) < 350) {
        const dx = t.clientX - last.x;
        const dy = t.clientY - last.y;
        if (Math.hypot(dx, dy) < 30) {
          // double tap -> toggle zoom
          const rect = containerRef.current?.getBoundingClientRect();
          const px = rect ? t.clientX - rect.left : t.clientX;
          const py = rect ? t.clientY - rect.top : t.clientY;
          const targetScale = scale > 1.2 ? 1 : 2;
          // adjust offset to focus on tap point
          setOffset(prev => ({ x: prev.x + (1 - targetScale / scale) * (px - prev.x), y: prev.y + (1 - targetScale / scale) * (py - prev.y) }));
          setScale(targetScale);
          lastTapRef.current = null;
          return;
        }
      }
      lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };
    }

    if (e.touches.length < 2) touchPinchRef.current = null;
    if (e.touches.length === 0) { setIsPanning(false); lastPanRef.current = null; }
  };

  const contentStyle: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transition: isPanning ? 'none' : 'transform 0.08s ease-out',
    touchAction: 'none',
    maxWidth: '100%',
    maxHeight: '100%'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div ref={containerRef} className="relative z-10 w-[90%] max-w-4xl h-[80%] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <button onClick={() => setIndex(i => Math.max(i - 1, 0))} disabled={index === 0} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setIndex(i => Math.min(i + 1, urls.length - 1))} disabled={index === urls.length - 1} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100">
              <ChevronRight size={18} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-200">{name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100" title="Zoom -">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <button onClick={zoomIn} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100" title="Zoom +"><ZoomIn size={18} /></button>
            <button onClick={reset} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100" title="Réinitialiser"><RefreshCw size={18} /></button>
            <a href={url} target="_blank" rel="noreferrer" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100" title="Télécharger">
              <Download size={18} />
            </a>
            <button onClick={toggleFullscreen} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100" title="Plein écran"><Maximize size={18} /></button>
            <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 overflow-hidden">
          <div
            ref={contentRef}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isPdf ? (
              <iframe src={url} title={name} style={{ width: '100%', height: '100%', border: 0, ...contentStyle } as React.CSSProperties} />
            ) : (
              <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', ...contentStyle }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
