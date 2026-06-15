import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Check, ZoomIn, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageCropperModalProps {
  playerName: string;
  playerId: string;
  onClose: () => void;
  onSaveAvatar: (avatarUrl: string) => void;
  darkMode?: boolean;
}

export function ImageCropperModal({
  playerName,
  playerId,
  onClose,
  onSaveAvatar,
  darkMode = false,
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Reset states when image changes
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setUploadError(null);
    setDimensions(null);
  }, [imageSrc]);

  // Handle image load to configure proper display size
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (nw > 0 && nh > 0) {
      const viewScale = Math.max(200 / nw, 200 / nh);
      setDimensions({
        width: nw * viewScale,
        height: nh * viewScale,
      });
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle panning math for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageSrc) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch triggers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc || e.touches.length === 0) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !imageSrc || e.touches.length === 0) return;
    const touch = e.touches[0];
    setPanX(touch.clientX - dragStart.x);
    setPanY(touch.clientY - dragStart.y);
  };

  // Generate cropped image using Canvas
  const handleSave = async () => {
    if (!imgRef.current || !imageSrc) return;
    setLoading(true);
    setUploadError(null);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const size = 1024; // Increase size to 1024x1024 to preserve pristine high-quality details on upload
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas drawing context');

      // Clear the canvas with transparent or white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // We crop a circle area. Let's calculate drawing positions
      // 1. Find the natural scale aspect
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (naturalWidth === 0 || naturalHeight === 0) {
        throw new Error('Image not loaded completely');
      }

      // Render bounds in container representation
      const containerWidth = 200; // Fixed crop viewport box (width = 200, height = 200)
      const containerHeight = 200;

      // Scaling factor between real image coordinates and view coordinates
      const scaleX = naturalWidth / containerWidth;
      const scaleY = naturalHeight / containerHeight;

      // Calculate where to draw
      // Draw zoomed crop area
      // Offset values with zoom scaling factored in
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // We want to draw a portion of image to fit our crop size.
      // Crop viewport is 200x200 inside our dialog modal
      // Zoom centers from middle of container
      // Map panning values to canvas
      
      const viewScale = Math.max(containerWidth / naturalWidth, containerHeight / naturalHeight);
      const displayWidth = naturalWidth * viewScale;
      const displayHeight = naturalHeight * viewScale;

      const scaleFactor = (size / containerWidth);

      // Draw onto canvas factoring pan, zoom and crop
      ctx.save();
      
      // Let's create a simplified circle path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw the image
      // Simple canvas transform mapping view-to-source coordinates
      const destX = (size / 2) + (panX * scaleFactor);
      const destY = (size / 2) + (panY * scaleFactor);
      const destW = displayWidth * zoom * scaleFactor;
      const destH = displayHeight * zoom * scaleFactor;

      ctx.drawImage(
        image,
        destX - (destW / 2),
        destY - (destH / 2),
        destW,
        destH
      );

      ctx.restore();

      // Convert Canvas representation to Base64 String with high quality settings
      const base64Image = canvas.toDataURL('image/jpeg', 0.95);

      // Now attempt to upload this to Supabase Storage if bucket is available
      let finalAvatarUrl = base64Image;

      try {
        // Base64 to blob conversion
        const base64Data = base64Image.split(',')[1];
        const binary = atob(base64Data);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
          array.push(binary.charCodeAt(i));
        }
        const blob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
        const fileName = `${playerId}-${Date.now()}.jpg`;

        // Try uploading to 'Photos' bucket inside 'Children Photos' folder first
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('Photos')
          .upload(`Children Photos/${fileName}`, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadErr) {
          console.warn('Supabase storage Photos bucket upload failed, trying lower-case photos bucket:', uploadErr.message);
          
          // Try lowercase photos bucket
          const { data: uploadData2, error: uploadErr2 } = await supabase.storage
            .from('photos')
            .upload(`Children Photos/${fileName}`, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });
            
          if (uploadErr2) {
            console.warn('Lowercase photos bucket upload failed, trying fallback avatars bucket:', uploadErr2.message);
            
            // Try fallback avatars bucket
            const { data: uploadData3, error: uploadErr3 } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (uploadErr3) {
              console.warn('All bucket configurations failed. Utilizing direct database Base64 storage:', uploadErr3.message);
            } else if (uploadData3) {
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);
              if (publicUrl) {
                finalAvatarUrl = publicUrl;
              }
            }
          } else if (uploadData2) {
            const { data: { publicUrl } } = supabase.storage
              .from('photos')
              .getPublicUrl(`Children Photos/${fileName}`);
            if (publicUrl) {
              finalAvatarUrl = publicUrl;
            }
          }
        } else if (uploadData) {
          // Get public URL from Photos bucket
          const { data: { publicUrl } } = supabase.storage
            .from('Photos')
            .getPublicUrl(`Children Photos/${fileName}`);
          
          if (publicUrl) {
            finalAvatarUrl = publicUrl;
          }
        }
      } catch (storageErr: any) {
        console.warn('Storage bucket setup not completed yet. Falling back to direct database Base64 string:', storageErr.message || storageErr);
      }

      // Save using state
      onSaveAvatar(finalAvatarUrl);
      onClose();

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error processing cropped image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div 
        className={cn(
          "w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
          darkMode ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-950/25 border-slate-150 dark:border-white/5">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-500">
              📸 Adjust Profile Photo
            </h3>
            <p className={cn("text-xs mt-0.5 font-medium", darkMode ? "text-slate-405" : "text-slate-500")}>
              For player: {playerName}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer text-slate-400 hover:text-red-500 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-5">
          {!imageSrc ? (
            /* Choose file drop area */
            <label className={cn(
              "w-full aspect-square max-w-[240px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition hover:bg-amber-400/[0.04] group",
              darkMode 
                ? "border-white/10 bg-slate-950/40 text-slate-400 hover:border-amber-400/40" 
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-amber-400"
            )}>
              <Upload className="w-10 h-10 mb-2.5 text-slate-400 group-hover:text-amber-500 transition duration-200 animate-bounce" />
              <span className="text-xs font-bold leading-normal text-slate-700 dark:text-white">
                Select or Drop Image
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Supports JPG, PNG, WEBP files
              </span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          ) : (
            /* Interactive Cropper Area */
            <div className="w-full flex flex-col items-center gap-5">
              
              {/* Crop box container with circle outline */}
              <div 
                ref={containerRef}
                className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-4 border-amber-400 shadow-xl bg-slate-950/20 flex items-center justify-center cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Source"
                  onLoad={handleImageLoad}
                  className="max-w-none origin-center pointer-events-none transition-transform duration-75 select-none"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    width: dimensions ? `${dimensions.width}px` : '100%',
                    height: dimensions ? `${dimensions.height}px` : 'auto',
                  }}
                />

                {/* Shading overlay for circular cropping context */}
                <div className="absolute inset-0 border-[16px] border-black/30 pointer-events-none rounded-full" />
                <div className="absolute inset-2 border border-dashed border-white/60 pointer-events-none rounded-full" />
                <div className="absolute bottom-2.5 bg-black/60 px-2 py-0.5 rounded-full text-[8.5px] font-black tracking-widest text-[#FFDF00] uppercase flex items-center gap-1 leading-none shadow-md">
                  <Eye size={9} /> drag to center
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="w-full max-w-[240px] px-2">
                <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-slate-405">
                  <span className="flex items-center gap-1"><ZoomIn size={12} /> Adjust Zoom Scale</span>
                  <span className="font-mono text-amber-550">{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1 appearance-none cursor-pointer bg-slate-200 dark:bg-white/10 rounded-lg accent-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setImageSrc(null)}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-xl border select-none transition focus:outline-none",
                    darkMode 
                      ? "border-white/5 hover:bg-white/5 text-slate-300" 
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  Change Image
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 py-2 rounded-xl text-xs font-extrabold transition select-none flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      Apply & Save
                    </>
                  )}
                </button>
              </div>

              {uploadError && (
                <p className="text-[10px] text-red-500 font-semibold bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10 text-center">
                  ⚠️ {uploadError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
