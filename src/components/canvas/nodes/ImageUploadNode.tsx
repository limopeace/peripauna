"use client";

import React, { useCallback, memo, useRef, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Upload, X, Download, Maximize2, FileImage } from "lucide-react";
import { BaseNode, NodeHeader } from "./BaseNode";
import { ImageUploadNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { cn } from "@/lib/utils";

// ============================================
// Image Upload Node Component
// ============================================
// Dedicated node for uploading local images to the canvas
// Images are stored as data URLs and can be used with video generation

function ImageUploadNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ImageUploadNodeData;
  const { updateNodeData, deleteNode } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return;
      }

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        // Get image dimensions
        const img = new window.Image();
        img.onload = () => {
          updateNodeData<ImageUploadNodeData>(id, {
            imageUrl: dataUrl,
            fileName: file.name,
            fileSize: file.size,
            dimensions: {
              width: img.width,
              height: img.height,
            },
            uploadedAt: new Date().toISOString(),
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      // Check for pasted image
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            return;
          }
        }
      }

      // Check for pasted URL
      const text = e.clipboardData.getData("text");
      if (text) {
        try {
          new URL(text);
          // It's a valid URL
          updateNodeData<ImageUploadNodeData>(id, {
            imageUrl: text,
            fileName: text.split("/").pop() || "remote-image",
            uploadedAt: new Date().toISOString(),
          });
        } catch {
          // Not a URL, ignore
        }
      }
    },
    [id, processFile, updateNodeData]
  );

  const handleClearImage = useCallback(() => {
    updateNodeData<ImageUploadNodeData>(id, {
      imageUrl: null,
      thumbnailUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
      dimensions: undefined,
      uploadedAt: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleDownload = useCallback(() => {
    if (!nodeData.imageUrl) return;

    const link = document.createElement("a");
    link.href = nodeData.imageUrl;
    link.download = nodeData.fileName || `image_${Date.now()}.png`;
    link.click();
  }, [nodeData.imageUrl, nodeData.fileName]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <BaseNode
        selected={selected}
        showTargetHandle={false}
        className="bg-gradient-to-b from-teal-500/5 to-transparent"
      >
        <NodeHeader
          icon={<FileImage size={16} />}
          label={nodeData.label}
          onDelete={handleDelete}
          badge={
            nodeData.imageUrl && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-teal-100 text-teal-700">
                Uploaded
              </span>
            )
          }
        />

        {/* Image Upload Area */}
        <div
          className="relative"
          onPaste={handlePaste}
          tabIndex={0}
        >
          {nodeData.imageUrl ? (
            <div className="relative group">
              <img
                src={nodeData.imageUrl}
                alt={nodeData.fileName || "Uploaded image"}
                className="w-full h-40 object-cover rounded-md cursor-pointer"
                onClick={() => setIsEnlarged(true)}
              />
              {/* Overlay buttons */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsEnlarged(true)}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Enlarge"
                >
                  <Maximize2 size={16} className="text-white" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Download"
                >
                  <Download size={16} className="text-white" />
                </button>
                <button
                  onClick={handleClearImage}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Remove"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>
          ) : (
            <label
              className={cn(
                "flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-md cursor-pointer transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload
                size={28}
                className={cn(
                  "mb-2",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="text-xs text-muted-foreground text-center px-2">
                Drop image here, click to browse,
                <br />
                or paste from clipboard
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* File Info */}
        {nodeData.imageUrl && (
          <div className="mt-2 space-y-1">
            {nodeData.fileName && (
              <p className="text-xs text-muted-foreground truncate" title={nodeData.fileName}>
                {nodeData.fileName}
              </p>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {nodeData.dimensions && (
                <span>
                  {nodeData.dimensions.width} × {nodeData.dimensions.height}
                </span>
              )}
              {nodeData.fileSize && <span>{formatFileSize(nodeData.fileSize)}</span>}
            </div>
          </div>
        )}

        {/* Usage hint */}
        <p className="text-[10px] text-muted-foreground mt-3">
          Connect to Video or Image nodes as input source
        </p>
      </BaseNode>

      {/* Enlarged Image Modal */}
      {isEnlarged && nodeData.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsEnlarged(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={nodeData.imageUrl}
              alt={nodeData.fileName || "Uploaded image"}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setIsEnlarged(false)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
              <p className="text-white text-sm">{nodeData.fileName}</p>
              {nodeData.dimensions && (
                <p className="text-white/70 text-xs">
                  {nodeData.dimensions.width} × {nodeData.dimensions.height}
                  {nodeData.fileSize && ` • ${formatFileSize(nodeData.fileSize)}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const ImageUploadNode = memo(ImageUploadNodeComponent);
