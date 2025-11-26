import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FILTERS, FilterType } from './types';
import { generateCreativeCaption } from './services/geminiService';

// --- Icons Components ---
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>
);

// --- Constants ---
const POLAROID_WIDTH = 800; // High res canvas width
const POLAROID_HEIGHT = 980; // Total height including bottom area
const IMAGE_SIZE = 720; // The square photo size
const PADDING = 40; // White border padding
const BOTTOM_PADDING = 220; // Space for text

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>(FilterType.FUJI); // Default to Fuji for that nice aesthetic
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [caption, setCaption] = useState<string>('');
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Camera based on visibility (Auto-stop/start)
  useEffect(() => {
    let localStream: MediaStream | null = null;

    const startCamera = async () => {
      // If we are looking at a photo, don't start the camera
      if (capturedImage) return;

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user"
          },
          audio: false
        });
        
        localStream = mediaStream;
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError(null);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera. Please check permissions.");
      }
    };

    startCamera();

    // Cleanup: Stop camera when component unmounts or when we switch to "Photo Taken" mode
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [capturedImage]); // Re-run effect when capturedImage toggles (null <-> string)

  // Draw the base polaroid (bg + image)
  const drawPolaroid = useCallback((imgData: CanvasImageSource, text: string = '') => {
    const canvas = document.createElement('canvas');
    canvas.width = POLAROID_WIDTH;
    canvas.height = POLAROID_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw Paper Background (White with slight texture noise if we wanted, but stick to clean white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, POLAROID_WIDTH, POLAROID_HEIGHT);

    // 2. Draw Image
    // We already passed the pre-filtered, pre-cropped square image as imgData
    ctx.drawImage(imgData, PADDING, PADDING, IMAGE_SIZE, IMAGE_SIZE);

    // 3. Draw Shadow/Inner border for realism (optional)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING, PADDING, IMAGE_SIZE, IMAGE_SIZE);

    // 4. Draw Text
    if (text) {
      ctx.fillStyle = '#222222'; // Dark gray ink
      ctx.font = '48px "Gochi Hand"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Handle word wrap roughly if needed, but we asked AI for short text.
      // Let's just draw it centered in the bottom area.
      const textX = POLAROID_WIDTH / 2;
      const textY = PADDING + IMAGE_SIZE + (BOTTOM_PADDING / 2);
      ctx.fillText(text, textX, textY);
    } else {
        // Draw loading dots if processing
        if (isProcessing) {
             ctx.fillStyle = '#999999';
             ctx.font = '32px "Inter"';
             ctx.textAlign = 'center';
             const textX = POLAROID_WIDTH / 2;
             const textY = PADDING + IMAGE_SIZE + (BOTTOM_PADDING / 2);
             ctx.fillText("Developing...", textX, textY);
        }
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isProcessing]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Trigger Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setIsProcessing(true);
    setCaption('');
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Setup Canvas for Capture
    // We want a square crop from the center of the video
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - minDim) / 2;
    const sy = (video.videoHeight - minDim) / 2;
    
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;

    // 2. Apply Filter & Mirror Flip via Context
    ctx.save();
    
    // Move to right edge and scale -1 to flip horizontally (mirror effect)
    ctx.translate(IMAGE_SIZE, 0);
    ctx.scale(-1, 1);
    
    // Apply the filter
    ctx.filter = FILTERS[currentFilter].ctxFilter;

    // Draw cropped image
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    
    ctx.restore();

    // Reset filter for future (though save/restore handles it, good practice)
    ctx.filter = 'none';

    // 4. Create initial Polaroid (no text)
    const rawPolaroid = drawPolaroid(canvas);
    setCapturedImage(rawPolaroid);

    // 5. Get Caption from Gemini
    try {
      // Pass the *filtered* image to Gemini so it comments on the vibe
      const imageBase64 = canvas.toDataURL('image/png');
      const generatedCaption = await generateCreativeCaption(imageBase64);
      setCaption(generatedCaption);
      
      // 6. Re-draw Polaroid with text
      // We need to create an image element to redraw the canvas content onto the new polaroid
      const img = new Image();
      img.onload = () => {
        const finalPolaroid = drawPolaroid(img, generatedCaption);
        setCapturedImage(finalPolaroid);
        setIsProcessing(false);
      };
      img.src = imageBase64; // The square filtered image

    } catch (err) {
      console.error(err);
      // Even if AI fails, allow the user to keep the photo
      setIsProcessing(false);
      setCaption('');
    }
  };

  const handleDownload = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `retro-snap-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setCapturedImage(null);
    setCaption('');
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col md:flex-row overflow-hidden relative font-sans">
      
      {/* Flash Overlay */}
      <div 
        className={`absolute inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200 ${flash ? 'opacity-100' : 'opacity-0'}`} 
      />

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* LEFT: Camera Stage */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 bg-black">
        {error ? (
          <div className="text-red-400 text-center max-w-md p-6 border border-red-900 rounded-lg bg-red-900/20">
            <p className="text-xl mb-2">Camera Error</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="relative w-full max-w-2xl aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group bg-gray-900">
            {/* Camera Viewport */}
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 transition-all duration-300 ${FILTERS[currentFilter].class} ${!stream ? 'opacity-0' : 'opacity-100'}`}
            />
            
            {/* Loading Indicator for Camera */}
            {!stream && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 text-gray-500">
                 <div className="w-8 h-8 border-4 border-gray-600 border-t-yellow-400 rounded-full animate-spin"></div>
                 <p className="text-sm tracking-widest uppercase">Initializing Camera...</p>
              </div>
            )}

            {/* Guidelines for Square Crop */}
            {!capturedImage && stream && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50">
                <div className="border border-white/40 w-[min(80%,80vh)] aspect-square shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-sm"></div>
              </div>
            )}
            
            {/* Live Status */}
            {stream && (
                <div className="absolute top-4 left-4 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                LIVE
                </div>
            )}

            {/* Shutter Button (Overlay on Display) */}
            {stream && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                    <button 
                        onClick={capturePhoto}
                        disabled={!!capturedImage}
                        className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="w-16 h-16 bg-white rounded-full group-hover:bg-yellow-400 transition-colors shadow-lg"></div>
                    </button>
                </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Sidebar (Filters only now) */}
      <div className="w-full md:w-80 bg-[#18181b] border-l border-white/10 flex flex-col z-10 shadow-xl h-[30vh] md:h-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1f1f22] sticky top-0 z-20">
            <div>
                <h1 className="text-xl font-bold font-handwriting text-yellow-400 tracking-wider">RetroSnap AI</h1>
                <p className="text-xs text-gray-400 mt-1">Select Film Stock</p>
            </div>
            <SparklesIcon />
        </div>

        {/* Filters Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3 pb-20 md:pb-0">
            {Object.values(FILTERS).map((filter) => (
              <button
                key={filter.name}
                onClick={() => setCurrentFilter(filter.name as FilterType)}
                className={`relative group overflow-hidden rounded-lg aspect-video border-2 transition-all ${
                  currentFilter === filter.name 
                    ? 'border-yellow-400 ring-2 ring-yellow-400/20' 
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {/* Preview color swatch/gradient as fallback or stylized div */}
                <div className={`absolute inset-0 bg-gray-800 ${filter.class}`}>
                    <div className="w-full h-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=200&q=80')] bg-cover bg-center opacity-70">
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 text-xs font-medium text-center truncate">
                  {filter.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: Captured Result */}
      {capturedImage && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-8 md:gap-12">
            
            {/* The Physical Photo */}
            <div className="relative group perspective-1000">
              <div className={`relative bg-white p-4 shadow-2xl transform transition-transform duration-500 hover:rotate-1 hover:scale-105 ${isProcessing ? 'animate-pulse' : ''}`} style={{ width: '320px', minHeight: '380px' }}>
                <img 
                  src={capturedImage} 
                  alt="Polaroid" 
                  className="w-full h-auto shadow-sm"
                />
                {/* Grain Texture Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
              </div>
              
              {isProcessing && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-md">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-150" />
                    Developing...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 min-w-[200px]">
              <div className="text-white mb-4">
                <h2 className="text-2xl font-bold mb-1">Developed!</h2>
                <p className="text-gray-400 text-sm">{isProcessing ? "AI is writing a caption..." : caption || "Photo ready."}</p>
              </div>

              {!isProcessing && (
                <>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
                  >
                    <DownloadIcon /> Download
                  </button>
                  <button 
                    onClick={reset}
                    className="flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
                  >
                    <RefreshIcon /> New Photo
                  </button>
                </>
              )}
            </div>
          </div>

          <button 
            onClick={reset}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <XIcon />
          </button>
        </div>
      )}

    </div>
  );
}