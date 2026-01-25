"use client";

import React, { useCallback, memo, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Type, Wand2 } from "lucide-react";
import { BaseNode, NodeHeader } from "./BaseNode";
import { PromptNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { ENHANCEMENT_MODELS } from "@/lib/config/modelPricing";

// ============================================
// Prompt Node Component
// ============================================
// Provides text input for image/video generation
// Connects to generator nodes via edges

function PromptNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as PromptNodeData;
  const { updateNodeData, deleteNode } = useCanvasStore();
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<PromptNodeData>(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleNegativePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<PromptNodeData>(id, { negativePrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<PromptNodeData>(id, {
        enhancementModel: e.target.value as PromptNodeData["enhancementModel"],
      });
    },
    [id, updateNodeData]
  );

  const handleEnhance = useCallback(async () => {
    if (!nodeData.prompt.trim() || nodeData.enhancementModel === "none" || !nodeData.enhancementModel) {
      return;
    }

    setIsEnhancing(true);

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nodeData.prompt,
          type: "image",
          model: nodeData.enhancementModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Enhancement failed");
      }

      const result = await response.json();
      updateNodeData<PromptNodeData>(id, {
        prompt: result.enhancedPrompt,
      });
    } catch (error) {
      console.error("Enhancement error:", error);
    } finally {
      setIsEnhancing(false);
    }
  }, [id, nodeData.prompt, nodeData.enhancementModel, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const selectedModel = nodeData.enhancementModel || "haiku";
  const modelConfig = ENHANCEMENT_MODELS[selectedModel];
  const showEnhanceButton = selectedModel !== "none";

  return (
    <BaseNode
      selected={selected}
      showTargetHandle={false} // Prompt nodes are sources only
      className="bg-gradient-to-b from-purple-500/5 to-transparent"
    >
      <NodeHeader
        icon={<Type size={16} />}
        label={nodeData.label}
        onDelete={handleDelete}
      />

      {/* Model Selection */}
      <div className="mb-3">
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Enhancement Model
        </label>
        <select
          value={selectedModel}
          onChange={handleModelChange}
          disabled={isEnhancing}
          className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        >
          <option value="none">{ENHANCEMENT_MODELS.none.name}</option>
          <option value="haiku">
            {ENHANCEMENT_MODELS.haiku.name} (${ENHANCEMENT_MODELS.haiku.cost.toFixed(4)})
          </option>
          <option value="sonnet">
            {ENHANCEMENT_MODELS.sonnet.name} (${ENHANCEMENT_MODELS.sonnet.cost.toFixed(3)})
          </option>
          <option value="opus">
            {ENHANCEMENT_MODELS.opus.name} (${ENHANCEMENT_MODELS.opus.cost.toFixed(3)})
          </option>
        </select>
        {modelConfig.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {modelConfig.description}
          </p>
        )}
      </div>

      {/* Main Prompt */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Prompt
        </label>
        <textarea
          value={nodeData.prompt}
          onChange={handlePromptChange}
          placeholder="Describe what you want to generate..."
          className="w-full h-20 px-2 py-1.5 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Negative Prompt (Collapsible) */}
      <details className="mt-3">
        <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
          Negative Prompt (optional)
        </summary>
        <textarea
          value={nodeData.negativePrompt || ""}
          onChange={handleNegativePromptChange}
          placeholder="What to avoid..."
          className="w-full h-14 mt-2 px-2 py-1.5 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </details>

      {/* Enhance Button */}
      {showEnhanceButton && (
        <button
          onClick={handleEnhance}
          disabled={isEnhancing || !nodeData.prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-2 mt-3 rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 size={14} />
          {isEnhancing ? "Enhancing..." : "Enhance Prompt"}
        </button>
      )}

      {/* Character count */}
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {nodeData.prompt.length} chars
      </div>
    </BaseNode>
  );
}

export const PromptNode = memo(PromptNodeComponent);
