"use client";

import React, { useCallback, memo, useRef } from "react";
import { NodeProps } from "@xyflow/react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { BaseNode, NodeHeader } from "./BaseNode";
import { ReferenceNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { cn } from "@/lib/utils";

// ============================================
// Reference Node Component
// ============================================
// Provides reference images for style/character/composition
// Supports before/after pairing for video workflows

function ReferenceNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ReferenceNodeData;
  const { updateNodeData, deleteNode } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Create data URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        updateNodeData<ReferenceNodeData>(id, {
          imageUrl: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleImagePaste = useCallback(
    async (url: string) => {
      try {
        // Validate URL
        new URL(url);
        updateNodeData<ReferenceNodeData>(id, { imageUrl: url });
      } catch {
        // Invalid URL, ignore
      }
    },
    [id, updateNodeData]
  );

  const handleClearImage = useCallback(() => {
    updateNodeData<ReferenceNodeData>(id, { imageUrl: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleTypeChange = useCallback(
    (type: "style" | "character" | "composition") => {
      updateNodeData<ReferenceNodeData>(id, { referenceType: type });
    },
    [id, updateNodeData]
  );

  const handleStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<ReferenceNodeData>(id, {
        strength: parseFloat(e.target.value),
      });
    },
    [id, updateNodeData]
  );

  const handleRoleChange = useCallback(
    (role: "before" | "after" | "single") => {
      updateNodeData<ReferenceNodeData>(id, { role });
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode
      selected={selected}
      showTargetHandle={false} // Reference nodes are sources only
      className="bg-gradient-to-b from-cyan-500/5 to-transparent"
    >
      <NodeHeader
        icon={<ImageIcon size={16} />}
        label={nodeData.label}
        onDelete={handleDelete}
        badge={
          nodeData.role !== "single" && (
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium rounded",
                nodeData.role === "before"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              )}
            >
              {nodeData.role === "before" ? "Before" : "After"}
            </span>
          )
        }
      />

      {/* Image Upload Area */}
      <div className="relative">
        {nodeData.imageUrl ? (
          <div className="relative group">
            <img
              src={nodeData.imageUrl}
              alt="Reference"
              className="w-full h-32 object-cover rounded-md"
            />
            <button
              onClick={handleClearImage}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-md cursor-pointer hover:border-muted-foreground/50 transition-colors">
            <Upload size={24} className="text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">
              Click or drop image
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* URL Paste Input */}
      <input
        type="text"
        placeholder="Or paste image URL..."
        onPaste={(e) => {
          const url = e.clipboardData.getData("text");
          handleImagePaste(url);
        }}
        className="w-full mt-2 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {/* Reference Type */}
      <div className="mt-3">
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Reference Type
        </label>
        <div className="flex gap-1">
          {(["style", "character", "composition"] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={cn(
                "flex-1 px-2 py-1 text-xs rounded transition-colors capitalize",
                nodeData.referenceType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Strength Slider */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-medium text-muted-foreground">
            Strength
          </label>
          <span className="text-xs text-muted-foreground">
            {Math.round(nodeData.strength * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={nodeData.strength}
          onChange={handleStrengthChange}
          className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>

      {/* Before/After Role (for video workflows) */}
      <details className="mt-3">
        <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
          Video Workflow Role
        </summary>
        <div className="flex gap-1 mt-2">
          {(["single", "before", "after"] as const).map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              className={cn(
                "flex-1 px-2 py-1 text-xs rounded transition-colors capitalize",
                nodeData.role === role
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {role}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Set role for before/after video transitions
        </p>
      </details>
    </BaseNode>
  );
}

export const ReferenceNode = memo(ReferenceNodeComponent);
