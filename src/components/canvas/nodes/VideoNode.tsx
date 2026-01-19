"use client";

import React, { useCallback, memo, useState, useRef } from "react";
import { NodeProps } from "@xyflow/react";
import { Film, Play, Download, Settings2, Square } from "lucide-react";
import { BaseNode, NodeHeader, ProgressBar, StatusBadge } from "./BaseNode";
import { VideoNodeData, DEFAULT_VIDEO_SETTINGS } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { useHistoryStore } from "@/lib/stores/historyStore";
import { VIDEO_MODELS } from "@/lib/config/modelPricing";
import {
  startTracking,
  updateTrackingProcessing,
  completeTracking,
  failTracking,
  buildTrackingContext,
} from "@/lib/services/usageTracker";
import { downloadGeneration } from "@/lib/services/downloadManager";
import { calculateVideoGenerationCost, formatCost } from "@/lib/utils/costCalculator";
import { cn } from "@/lib/utils";

// ============================================
// Video Node Component
// ============================================
// Generates videos from connected prompts, references, and images
// Supports image-to-video and before/after workflows

function VideoNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as VideoNodeData;
  const { updateNodeData, deleteNode, getConnectedInputs } = useCanvasStore();
  const { records } = useHistoryStore();
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get node-specific history
  const nodeHistory = records.filter((r) => r.nodeId === id);

  // Calculate estimated cost
  const estimatedCost = calculateVideoGenerationCost(
    nodeData.settings.model,
    nodeData.settings.duration
  );

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleSettingChange = useCallback(
    <K extends keyof VideoNodeData["settings"]>(
      key: K,
      value: VideoNodeData["settings"][K]
    ) => {
      updateNodeData<VideoNodeData>(id, {
        settings: { ...nodeData.settings, [key]: value },
      });
    },
    [id, nodeData.settings, updateNodeData]
  );

  const handleGenerate = useCallback(async () => {
    // Get connected inputs
    const inputs = getConnectedInputs(id);

    // Build prompt from connected prompts or use default
    let prompt = inputs.prompts.map((p) => p.prompt).join(". ");
    if (!prompt.trim()) {
      // Default prompt for image-to-video
      if (inputs.references.length > 0 || inputs.images.length > 0) {
        prompt = "cinematic video, smooth motion";
      } else {
        updateNodeData<VideoNodeData>(id, {
          error: "Connect a Prompt, Reference, or Image node",
        });
        return;
      }
    }

    // Collect source images (references + generated images)
    const sourceImages: string[] = [];

    // Add reference images
    for (const ref of inputs.references) {
      if (ref.imageUrl) {
        sourceImages.push(ref.imageUrl);
      }
    }

    // Add generated image outputs (for I2V workflows)
    for (const img of inputs.images) {
      if (img.outputUrl) {
        sourceImages.push(img.outputUrl);
      }
    }

    // Handle before/after images for transitions
    const beforeImages = inputs.beforeImages?.filter((r) => r.imageUrl) || [];
    const afterImages = inputs.afterImages?.filter((r) => r.imageUrl) || [];

    // Start generation
    updateNodeData<VideoNodeData>(id, {
      isGenerating: true,
      progress: 0,
      error: undefined,
    });

    const startTime = Date.now();

    try {
      // Start tracking
      const trackingContext = buildTrackingContext(
        id,
        "video",
        inputs,
        nodeData.settings.model,
        nodeData.settings
      );
      const trackingRecord = await startTracking(trackingContext);

      // Make API request
      const response = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: inputs.prompts[0]?.negativePrompt,
          sourceImages,
          beforeImages: beforeImages.map((r) => r.imageUrl),
          afterImages: afterImages.map((r) => r.imageUrl),
          settings: nodeData.settings,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update to processing
      await updateTrackingProcessing(trackingRecord.id, result.taskId);
      updateNodeData<VideoNodeData>(id, {
        taskId: result.taskId,
        progress: 10,
      });

      // Poll for completion (videos take longer)
      let output = null;
      let pollCount = 0;
      const maxPolls = 300; // 5 minutes max for videos

      while (!output && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        pollCount++;

        const pollResponse = await fetch(
          `/api/poll?taskId=${result.taskId}&type=video`
        );
        const pollResult = await pollResponse.json();

        if (pollResult.status === "succeeded" || pollResult.status === "completed") {
          output = pollResult.output;
          break;
        } else if (pollResult.status === "failed") {
          throw new Error(pollResult.error || "Video generation failed");
        }

        // Update progress
        updateNodeData<VideoNodeData>(id, {
          progress: Math.min(90, 10 + pollCount * 0.5),
        });
      }

      if (!output) {
        throw new Error("Video generation timed out");
      }

      const generationTime = Date.now() - startTime;

      // Complete tracking
      await completeTracking(trackingRecord.id, output, generationTime);

      // Update node with output
      updateNodeData<VideoNodeData>(id, {
        isGenerating: false,
        progress: 100,
        outputUrl: output,
        error: undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const generationTime = Date.now() - startTime;

      await failTracking(id, errorMessage, generationTime);

      updateNodeData<VideoNodeData>(id, {
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
      const link = document.createElement("a");
      link.href = nodeData.outputUrl;
      link.download = `video_${Date.now()}.mp4`;
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
      className="bg-gradient-to-b from-violet-500/5 to-transparent"
    >
      <NodeHeader
        icon={<Film size={16} />}
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
          {VIDEO_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} (${model.costPerSecond}/s)
            </option>
          ))}
        </select>
      </div>

      {/* Output Preview */}
      {nodeData.outputUrl && (
        <div className="relative mb-3 group">
          <video
            ref={videoRef}
            src={nodeData.outputUrl}
            className="w-full h-40 object-cover rounded-md"
            controls
            loop
            muted
          />
          <button
            onClick={handleDownload}
            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Quick Settings */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Duration */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Duration
          </label>
          <select
            value={nodeData.settings.duration}
            onChange={(e) =>
              handleSettingChange("duration", parseInt(e.target.value))
            }
            disabled={nodeData.isGenerating}
            className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
          >
            <option value={3}>3 sec</option>
            <option value={5}>5 sec</option>
            <option value={10}>10 sec</option>
            <option value={15}>15 sec</option>
          </select>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Resolution
          </label>
          <select
            value={nodeData.settings.resolution}
            onChange={(e) =>
              handleSettingChange(
                "resolution",
                e.target.value as "720p" | "1080p" | "4k"
              )
            }
            disabled={nodeData.isGenerating}
            className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="4k">4K</option>
          </select>
        </div>
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
      >
        <Settings2 size={12} />
        {showSettings ? "Hide" : "Show"} more settings
      </button>

      {/* Detailed Settings */}
      {showSettings && (
        <div className="space-y-3 p-2 bg-muted/30 rounded-md mb-3">
          {/* Camera Movement */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Camera Movement
            </label>
            <select
              value={nodeData.settings.cameraMovement || "static"}
              onChange={(e) =>
                handleSettingChange(
                  "cameraMovement",
                  e.target.value as VideoNodeData["settings"]["cameraMovement"]
                )
              }
              disabled={nodeData.isGenerating}
              className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
            >
              <option value="static">Static</option>
              <option value="pan_left">Pan Left</option>
              <option value="pan_right">Pan Right</option>
              <option value="zoom_in">Zoom In</option>
              <option value="zoom_out">Zoom Out</option>
              <option value="tilt_up">Tilt Up</option>
              <option value="tilt_down">Tilt Down</option>
            </select>
          </div>

          {/* FPS */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              FPS
            </label>
            <select
              value={nodeData.settings.fps}
              onChange={(e) =>
                handleSettingChange("fps", parseInt(e.target.value))
              }
              disabled={nodeData.isGenerating}
              className="w-full mt-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none"
            >
              <option value={24}>24 fps (Film)</option>
              <option value={30}>30 fps (Standard)</option>
              <option value={60}>60 fps (Smooth)</option>
            </select>
          </div>

          {/* Seed */}
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

      {/* Cost Estimate */}
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
        <span>Est. cost:</span>
        <span className="font-medium">{formatCost(estimatedCost.cost)}</span>
      </div>

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
        {nodeData.isGenerating ? (
          <>
            <Square size={14} />
            Generating...
          </>
        ) : (
          <>
            <Play size={14} />
            Generate Video
          </>
        )}
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

export const VideoNode = memo(VideoNodeComponent);
