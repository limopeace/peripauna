"use client";

import React, { useCallback, memo, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Sparkles, Play, Download, Settings2 } from "lucide-react";
import { BaseNode, NodeHeader, ProgressBar, StatusBadge } from "./BaseNode";
import { ImageNodeData, DEFAULT_IMAGE_SETTINGS } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { useHistoryStore } from "@/lib/stores/historyStore";
import { IMAGE_MODELS } from "@/lib/config/modelPricing";
import {
  startTracking,
  updateTrackingProcessing,
  completeTracking,
  failTracking,
  buildTrackingContext,
} from "@/lib/services/usageTracker";
import { downloadGeneration } from "@/lib/services/downloadManager";
import { cn } from "@/lib/utils";

// ============================================
// Image Node Component
// ============================================
// Generates images from connected prompts and references
// Includes generation tracking and cost calculation

function ImageNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ImageNodeData;
  const { updateNodeData, deleteNode, getConnectedInputs } = useCanvasStore();
  const { records } = useHistoryStore();
  const [showSettings, setShowSettings] = useState(false);

  // Get node-specific history
  const nodeHistory = records.filter((r) => r.nodeId === id);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleSettingChange = useCallback(
    <K extends keyof ImageNodeData["settings"]>(
      key: K,
      value: ImageNodeData["settings"][K]
    ) => {
      updateNodeData<ImageNodeData>(id, {
        settings: { ...nodeData.settings, [key]: value },
      });
    },
    [id, nodeData.settings, updateNodeData]
  );

  const handleGenerate = useCallback(async () => {
    // Get connected inputs
    const inputs = getConnectedInputs(id);

    // Validate inputs
    if (inputs.prompts.length === 0) {
      updateNodeData<ImageNodeData>(id, {
        error: "Connect a Prompt node to generate",
      });
      return;
    }

    const prompt = inputs.prompts.map((p) => p.prompt).join(". ");
    if (!prompt.trim()) {
      updateNodeData<ImageNodeData>(id, {
        error: "Prompt cannot be empty",
      });
      return;
    }

    // Start generation
    updateNodeData<ImageNodeData>(id, {
      isGenerating: true,
      progress: 0,
      error: undefined,
    });

    const startTime = Date.now();

    try {
      // Start tracking
      const trackingContext = buildTrackingContext(
        id,
        "image",
        inputs,
        nodeData.settings.model,
        nodeData.settings
      );
      const trackingRecord = await startTracking(trackingContext);

      // Make API request
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: inputs.prompts[0]?.negativePrompt,
          referenceUrl: inputs.references[0]?.imageUrl,
          settings: nodeData.settings,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update to processing
      await updateTrackingProcessing(trackingRecord.id, result.predictionId);
      updateNodeData<ImageNodeData>(id, {
        predictionId: result.predictionId,
        progress: 10,
      });

      // Poll for completion
      let output = null;
      let pollCount = 0;
      const maxPolls = 120; // 2 minutes max

      while (!output && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        pollCount++;

        const pollResponse = await fetch(
          `/api/poll?predictionId=${result.predictionId}`
        );
        const pollResult = await pollResponse.json();

        if (pollResult.status === "succeeded") {
          output = pollResult.output;
          break;
        } else if (pollResult.status === "failed") {
          throw new Error(pollResult.error || "Generation failed");
        }

        // Update progress (estimate based on typical generation time)
        updateNodeData<ImageNodeData>(id, {
          progress: Math.min(90, 10 + pollCount * 2),
        });
      }

      if (!output) {
        throw new Error("Generation timed out");
      }

      const generationTime = Date.now() - startTime;

      // Complete tracking
      await completeTracking(trackingRecord.id, output, generationTime);

      // Update node with output
      updateNodeData<ImageNodeData>(id, {
        isGenerating: false,
        progress: 100,
        outputUrl: output,
        error: undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const generationTime = Date.now() - startTime;

      // Fail tracking (if we have the record)
      await failTracking(id, errorMessage, generationTime);

      updateNodeData<ImageNodeData>(id, {
        isGenerating: false,
        progress: 0,
        error: errorMessage,
      });
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
      link.download = `image_${Date.now()}.png`;
      link.click();
    }
  }, [nodeData.outputUrl, nodeHistory]);

  const status = nodeData.isGenerating
    ? "generating"
    : nodeData.error
      ? "error"
      : nodeData.outputUrl
        ? "success"
        : "idle";

  return (
    <BaseNode
      selected={selected}
      isGenerating={nodeData.isGenerating}
      hasError={!!nodeData.error}
      className="bg-gradient-to-b from-pink-500/5 to-transparent"
    >
      <NodeHeader
        icon={<Sparkles size={16} />}
        label={nodeData.label}
        onDelete={handleDelete}
        badge={<StatusBadge status={status} />}
      />

      {/* Model Selection */}
      <div className="mb-3">
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Model
        </label>
        <select
          value={nodeData.settings.model}
          onChange={(e) => handleSettingChange("model", e.target.value)}
          disabled={nodeData.isGenerating}
          className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        >
          {IMAGE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} (${model.cost.toFixed(3)})
            </option>
          ))}
        </select>
      </div>

      {/* Resolution Selection (Gemini 3 Pro only) */}
      {nodeData.settings.model.startsWith("gemini-3-pro-image") && (
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Resolution
          </label>
          <select
            value={nodeData.settings.resolution || "1K"}
            onChange={(e) =>
              handleSettingChange("resolution", e.target.value as "1K" | "2K" | "4K")
            }
            disabled={nodeData.isGenerating}
            className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="1K">1K (1024x1024) - $0.039</option>
            <option value="2K">2K (2048x2048) - $0.134</option>
            <option value="4K">4K (4096x4096) - $0.240</option>
          </select>
        </div>
      )}

      {/* Output Preview */}
      {nodeData.outputUrl && (
        <div className="relative mb-3 group">
          <img
            src={nodeData.outputUrl}
            alt="Generated output"
            className="w-full h-40 object-cover rounded-md"
          />
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
        <ProgressBar progress={nodeData.progress} className="mb-3" />
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
          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Aspect Ratio
            </label>
            <select
              value={nodeData.settings.aspectRatio}
              onChange={(e) => handleSettingChange("aspectRatio", e.target.value)}
              disabled={nodeData.isGenerating}
              className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="4:3">4:3 (Classic)</option>
              <option value="3:4">3:4 (Portrait Classic)</option>
            </select>
          </div>

          {/* Guidance Scale */}
          <div>
            <div className="flex justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Guidance Scale
              </label>
              <span className="text-xs text-muted-foreground">
                {nodeData.settings.guidanceScale}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={nodeData.settings.guidanceScale}
              onChange={(e) =>
                handleSettingChange("guidanceScale", parseFloat(e.target.value))
              }
              disabled={nodeData.isGenerating}
              className="w-full mt-1"
            />
          </div>

          {/* Inference Steps */}
          <div>
            <div className="flex justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Steps
              </label>
              <span className="text-xs text-muted-foreground">
                {nodeData.settings.numInferenceSteps}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={nodeData.settings.numInferenceSteps}
              onChange={(e) =>
                handleSettingChange("numInferenceSteps", parseInt(e.target.value))
              }
              disabled={nodeData.isGenerating}
              className="w-full mt-1"
            />
          </div>

          {/* Seed (optional) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Seed (optional)
            </label>
            <input
              type="number"
              value={nodeData.settings.seed || ""}
              onChange={(e) =>
                handleSettingChange(
                  "seed",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder="Random"
              disabled={nodeData.isGenerating}
              className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={nodeData.isGenerating}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
          nodeData.isGenerating
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        <Play size={14} />
        {nodeData.isGenerating ? "Generating..." : "Generate"}
      </button>

      {/* History count */}
      {nodeHistory.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {nodeHistory.length} generation{nodeHistory.length !== 1 ? "s" : ""} in
          history
        </p>
      )}
    </BaseNode>
  );
}

export const ImageNode = memo(ImageNodeComponent);
