"use client";

import React, { useCallback, memo, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { ArrowUpFromLine, Play, Download, Settings2 } from "lucide-react";
import { BaseNode, NodeHeader, ProgressBar, StatusBadge } from "./BaseNode";
import { UpscaleNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { useHistoryStore } from "@/lib/stores/historyStore";
import { calculateUpscaleCost } from "@/lib/config/modelPricing";
import { downloadGeneration } from "@/lib/services/downloadManager";
import { cn } from "@/lib/utils";

// ============================================
// Upscale Node Component
// ============================================
// Upscales images from connected image/reference nodes
// Uses Stability AI Conservative Upscale (up to 4K output)

function UpscaleNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as UpscaleNodeData;
  const { updateNodeData, deleteNode, getConnectedInputs } = useCanvasStore();
  const { records } = useHistoryStore();
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get node-specific history
  const nodeHistory = records.filter((r) => r.nodeId === id);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleSettingChange = useCallback(
    <K extends keyof UpscaleNodeData["settings"]>(
      key: K,
      value: UpscaleNodeData["settings"][K]
    ) => {
      updateNodeData<UpscaleNodeData>(id, {
        settings: { ...nodeData.settings, [key]: value },
      });
    },
    [id, nodeData.settings, updateNodeData]
  );

  const handleUpscale = useCallback(async () => {
    // Get connected inputs - look for images from image nodes or reference nodes
    const inputs = getConnectedInputs(id);

    // Find input image URL
    let inputImageUrl: string | null = null;

    // First check for generated images from connected image nodes
    if (inputs.images.length > 0) {
      inputImageUrl = inputs.images[0].outputUrl;
    }
    // Then check for reference nodes
    else if (inputs.references.length > 0) {
      inputImageUrl = inputs.references[0].imageUrl;
    }

    if (!inputImageUrl) {
      updateNodeData<UpscaleNodeData>(id, {
        error: "Connect an Image or Reference node with an image to upscale",
      });
      return;
    }

    // Start upscaling
    updateNodeData<UpscaleNodeData>(id, {
      isGenerating: true,
      error: undefined,
    });
    setProgress(0);

    try {
      // Make API request
      const response = await fetch("/api/generate/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: inputImageUrl,
          settings: nodeData.settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upscale failed: ${response.statusText}`);
      }

      const result = await response.json();

      updateNodeData<UpscaleNodeData>(id, {
        upscaleId: result.id,
      });
      setProgress(10);

      // Poll for completion
      let output = null;
      let pollCount = 0;
      const maxPolls = 60; // 1 minute max (upscaling is fast)

      while (!output && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        pollCount++;

        const pollResponse = await fetch(
          `/api/poll?upscaleId=${result.id}`
        );
        const pollResult = await pollResponse.json();

        if (pollResult.status === "succeeded") {
          output = pollResult.output;
          break;
        } else if (pollResult.status === "failed") {
          throw new Error(pollResult.error || "Upscaling failed");
        }

        // Update progress
        setProgress(Math.min(90, 10 + pollCount * 3));
      }

      if (!output) {
        throw new Error("Upscaling timed out");
      }

      // Update node with output
      updateNodeData<UpscaleNodeData>(id, {
        isGenerating: false,
        outputUrl: output,
        error: undefined,
      });
      setProgress(100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      updateNodeData<UpscaleNodeData>(id, {
        isGenerating: false,
        error: errorMessage,
      });
      setProgress(0);
    }
  }, [id, nodeData.settings, getConnectedInputs, updateNodeData]);

  const handleDownload = useCallback(async () => {
    const record = nodeHistory.find((r) => r.outputUrl === nodeData.outputUrl);
    if (record) {
      await downloadGeneration(record);
    } else if (nodeData.outputUrl) {
      // Direct download if no tracking record
      const link = document.createElement("a");
      link.href = nodeData.outputUrl;
      const ext = nodeData.settings.outputFormat || "png";
      link.download = `upscaled_${Date.now()}.${ext}`;
      link.click();
    }
  }, [nodeData.outputUrl, nodeData.settings.outputFormat, nodeHistory]);

  const status = nodeData.isGenerating
    ? "generating"
    : nodeData.error
      ? "error"
      : nodeData.outputUrl
        ? "success"
        : "idle";

  const cost = calculateUpscaleCost(nodeData.settings.model);

  return (
    <BaseNode
      selected={selected}
      isGenerating={nodeData.isGenerating}
      hasError={!!nodeData.error}
      className="bg-gradient-to-b from-cyan-500/5 to-transparent"
    >
      <NodeHeader
        icon={<ArrowUpFromLine size={16} />}
        label={nodeData.label}
        onDelete={handleDelete}
        badge={<StatusBadge status={status} />}
      />

      {/* Model info */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground">
          Stability AI • ${cost.toFixed(2)}/image
        </p>
      </div>

      {/* Output Preview */}
      {nodeData.outputUrl && (
        <div className="relative mb-3 group">
          <img
            src={nodeData.outputUrl}
            alt="Upscaled output"
            className="w-full h-40 object-cover rounded-md"
          />
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 rounded text-xs text-white">
            Up to 4K
          </div>
          <button
            onClick={handleDownload}
            className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download size={14} className="text-white" />
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {nodeData.isGenerating && (
        <ProgressBar progress={progress} className="mb-3" />
      )}

      {/* Error Message */}
      {nodeData.error && (
        <p className="text-xs text-red-500 mb-3 bg-red-50 p-2 rounded">
          {nodeData.error}
        </p>
      )}

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
      >
        <Settings2 size={12} />
        {showSettings ? "Hide" : "Show"} settings
      </button>

      {/* Detailed Settings */}
      {showSettings && (
        <div className="space-y-3 p-2 bg-muted/30 rounded-md mb-3">
          {/* Output Format */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Output Format
            </label>
            <select
              value={nodeData.settings.outputFormat}
              onChange={(e) => handleSettingChange("outputFormat", e.target.value as "png" | "webp" | "jpeg")}
              disabled={nodeData.isGenerating}
              className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
            >
              <option value="png">PNG (Best quality)</option>
              <option value="webp">WebP (Smaller size)</option>
              <option value="jpeg">JPEG (Widely compatible)</option>
            </select>
          </div>

          <p className="text-xs text-muted-foreground">
            Conservative upscale preserves original content with minimal changes.
            Automatically scales up to 4K resolution.
          </p>
        </div>
      )}

      {/* Upscale Button */}
      <button
        onClick={handleUpscale}
        disabled={nodeData.isGenerating}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
          nodeData.isGenerating
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-cyan-600 text-white hover:bg-cyan-700"
        )}
      >
        <Play size={14} />
        {nodeData.isGenerating ? "Upscaling..." : "Upscale"}
      </button>

      {/* History count */}
      {nodeHistory.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {nodeHistory.length} upscale{nodeHistory.length !== 1 ? "s" : ""} in
          history
        </p>
      )}
    </BaseNode>
  );
}

export const UpscaleNode = memo(UpscaleNodeComponent);
