"use client";

import React, { useCallback, memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import { BaseNode, NodeHeader } from "./BaseNode";
import { PromptNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";

// ============================================
// Prompt Node Component
// ============================================
// Provides text input for image/video generation
// Connects to generator nodes via edges

function PromptNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as PromptNodeData;
  const { updateNodeData, deleteNode } = useCanvasStore();

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

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

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

      {/* Character count */}
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {nodeData.prompt.length} chars
      </div>
    </BaseNode>
  );
}

export const PromptNode = memo(PromptNodeComponent);
