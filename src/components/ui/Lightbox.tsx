"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Lightbox Component
// ============================================
// Full-screen modal for viewing images and videos
// Supports zoom, navigation, and downloads

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  type: "image" | "video";
  url: string;
  title?: string;
  subtitle?: string;
  onDownload?: () => void;
  // For gallery navigation
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function Lightbox({
  isOpen,
  onClose,
  type,
  url,
  title,
  subtitle,
  onDownload,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentUrl, setCurrentUrl] = useState(url);

  // Reset zoom when URL changes - using derived state pattern
  // This is the recommended React pattern for resetting state based on props
  if (url !== currentUrl) {
    setCurrentUrl(url);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) onPrevious();
          break;
        case "ArrowRight":
          if (hasNext && onNext) onNext();
          break;
        case "+":
        case "=":
          setZoom((z) => Math.min(z + 0.5, 4));
          break;
        case "-":
          setZoom((z) => Math.max(z - 0.5, 0.5));
          break;
        case "0":
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.5, 0.5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white">
          {title && <h3 className="font-medium">{title}</h3>}
          {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls (only for images) */}
          {type === "image" && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Zoom out (-)"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-white/70 text-sm min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Zoom in (+)"
              >
                <ZoomIn size={20} />
              </button>
            </>
          )}
          {/* Download button */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Download"
            >
              <Download size={20} />
            </button>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close (Esc)"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Navigation arrows */}
        {hasPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-4 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Previous (Left arrow)"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Next (Right arrow)"
          >
            <ChevronRight size={32} />
          </button>
        )}

        {/* Media content */}
        <div
          className={cn(
            "max-w-[90vw] max-h-[80vh]",
            type === "image" && zoom > 1 && "cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          style={
            type === "image"
              ? {
                  transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                }
              : undefined
          }
          onMouseDown={type === "image" && zoom > 1 ? handleMouseDown : undefined}
        >
          {type === "image" ? (
            <img
              src={url}
              alt={title || "Preview"}
              className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
              draggable={false}
            />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              loop
              className="max-w-full max-h-[80vh] rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>

      {/* Footer with keyboard hints */}
      <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex justify-center gap-4 text-xs text-white/50">
          <span>Esc to close</span>
          {(hasPrevious || hasNext) && <span>Arrow keys to navigate</span>}
          {type === "image" && <span>+/- to zoom, 0 to reset</span>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// useLightbox Hook
// ============================================
// Helper hook for managing lightbox state

interface LightboxState {
  isOpen: boolean;
  type: "image" | "video";
  url: string;
  title?: string;
  subtitle?: string;
  index?: number;
}

export function useLightbox() {
  const [state, setState] = useState<LightboxState>({
    isOpen: false,
    type: "image",
    url: "",
  });

  const open = useCallback(
    (options: Omit<LightboxState, "isOpen">) => {
      setState({ ...options, isOpen: true });
    },
    []
  );

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, index }));
  }, []);

  return {
    ...state,
    open,
    close,
    setIndex,
  };
}
