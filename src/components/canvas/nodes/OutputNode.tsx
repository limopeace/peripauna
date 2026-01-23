"use client";

import React, { useCallback, memo, useEffect } from "react";
import { NodeProps } from "@xyflow/react";
import { Download, Monitor, Image as ImageIcon, Video, Maximize2 } from "lucide-react";
import { BaseNode, NodeHeader } from "./BaseNode";
import { OutputNodeData, ImageNodeData, VideoNodeData, UpscaleNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { cn } from "@/lib/utils";

// ============================================
// Output Node Component
// ============================================
// Display and download generated content from connected nodes
// Auto-detects image/video content from upstream nodes

function OutputNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as OutputNodeData;
  const { deleteNode, getConnectedInputs, updateNodeData, edges, nodes } = useCanvasStore();

  // Auto-detect connected content when connections change
  useEffect(() => {
    // Find incoming edges to this node
    const incomingEdges = edges.filter((e) => e.target === id);
    const sourceNodeIds = incomingEdges.map((e) => e.source);
    const sourceNodes = nodes.filter((n) => sourceNodeIds.includes(n.id));

    // Check for completed outputs in priority order: upscale > image > video
    for (const node of sourceNodes) {
      if (node.type === "upscale") {
        const upscaleData = node.data as UpscaleNodeData;
        if (upscaleData.outputUrl) {
          updateNodeData<OutputNodeData>(id, {
            outputUrl: upscaleData.outputUrl,
            outputType: "image",
          });
          return;
        }
      }
    }

    for (const node of sourceNodes) {
      if (node.type === "image") {
        const imageData = node.data as ImageNodeData;
        if (imageData.outputUrl) {
          updateNodeData<OutputNodeData>(id, {
            outputUrl: imageData.outputUrl,
            outputType: "image",
          });
          return;
        }
      }
    }

    for (const node of sourceNodes) {
      if (node.type === "video") {
        const videoData = node.data as VideoNodeData;
        if (videoData.outputUrl) {
          updateNodeData<OutputNodeData>(id, {
            outputUrl: videoData.outputUrl,
            outputType: "video",
          });
          return;
        }
      }
    }
  }, [id, edges, nodes, updateNodeData]);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!nodeData.outputUrl) return;

    try {
      // Fetch the content as blob for proper download
      const response = await fetch(nodeData.outputUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const extension = nodeData.outputType === "video" ? "mp4" : "png";
      const filename = nodeData.filename || `flora-output-${Date.now()}.${extension}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(nodeData.outputUrl, "_blank");
    }
  }, [nodeData]);

  // Open in new tab (fullscreen)
  const handleFullscreen = useCallback(() => {
    if (nodeData.outputUrl) {
      window.open(nodeData.outputUrl, "_blank");
    }
  }, [nodeData.outputUrl]);

  // Toggle output type manually
  const handleTypeToggle = useCallback(
    (type: "image" | "video") => {
      updateNodeData<OutputNodeData>(id, { outputType: type });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  return (
    <BaseNode
      selected={selected}
      showSourceHandle={false}
      className="bg-gradient-to-b from-emerald-500/5 to-transparent"
    >
      <NodeHeader
        icon={<Monitor size={16} />}
        label={nodeData.label}
        onDelete={handleDelete}
      />

      {/* Output Type Toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => handleTypeToggle("image")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors",
            nodeData.outputType === "image"
              ? "bg-emerald-500/20 text-emerald-600 font-medium"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <ImageIcon size={12} />
          Image
        </button>
        <button
          onClick={() => handleTypeToggle("video")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors",
            nodeData.outputType === "video"
              ? "bg-emerald-500/20 text-emerald-600 font-medium"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <Video size={12} />
          Video
        </button>
      </div>

      {/* Preview Area */}
      <div className="relative mb-3">
        {nodeData.outputUrl ? (
          <div className="relative group">
            {nodeData.outputType === "video" ? (
              <video
                src={nodeData.outputUrl}
                className="w-full h-40 object-cover rounded-md bg-black"
                controls
                muted
                loop
              />
            ) : (
              <img
                src={nodeData.outputUrl}
                alt="Output preview"
                className="w-full h-40 object-cover rounded-md"
              />
            )}
            {/* Fullscreen button on hover */}
            <button
              onClick={handleFullscreen}
              className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Open in new tab"
            >
              <Maximize2 size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-muted-foreground/25 rounded-md bg-muted/30">
            {nodeData.outputType === "video" ? (
              <Video size={32} className="text-muted-foreground/50 mb-2" />
            ) : (
              <ImageIcon size={32} className="text-muted-foreground/50 mb-2" />
            )}
            <span className="text-xs text-muted-foreground text-center px-4">
              Connect an Image, Video, or Upscale node to preview output
            </span>
          </div>
        )}
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={!nodeData.outputUrl}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          nodeData.outputUrl
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        <Download size={14} />
        Download {nodeData.outputType === "video" ? "Video" : "Image"}
      </button>
    </BaseNode>
  );
}

export const OutputNode = memo(OutputNodeComponent);
