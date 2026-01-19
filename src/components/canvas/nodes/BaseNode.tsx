"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

// ============================================
// Base Node Wrapper Component
// ============================================

interface BaseNodeProps {
  children: React.ReactNode;
  selected?: boolean;
  isGenerating?: boolean;
  hasError?: boolean;
  className?: string;
  // Handle configuration
  sourcePosition?: Position;
  targetPosition?: Position;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
}

export function BaseNode({
  children,
  selected = false,
  isGenerating = false,
  hasError = false,
  className,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  showSourceHandle = true,
  showTargetHandle = true,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card shadow-sm transition-all duration-200",
        "min-w-[280px] max-w-[320px]",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isGenerating && "animate-pulse border-blue-500",
        hasError && "border-red-500",
        className
      )}
    >
      {/* Target handle (input) */}
      {showTargetHandle && (
        <Handle
          type="target"
          position={targetPosition}
          className={cn(
            "!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background",
            "hover:!bg-primary transition-colors"
          )}
        />
      )}

      {/* Node content */}
      <div className="p-3">{children}</div>

      {/* Source handle (output) */}
      {showSourceHandle && (
        <Handle
          type="source"
          position={sourcePosition}
          className={cn(
            "!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background",
            "hover:!bg-primary transition-colors"
          )}
        />
      )}
    </div>
  );
}

// ============================================
// Node Header Component
// ============================================

interface NodeHeaderProps {
  icon: React.ReactNode;
  label: string;
  onDelete?: () => void;
  badge?: React.ReactNode;
}

export function NodeHeader({ icon, label, onDelete, badge }: NodeHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border mb-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium text-sm truncate max-w-[180px]">
          {label}
        </span>
        {badge}
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================
// Progress Bar Component
// ============================================

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  showLabel = true,
  className,
}: ProgressBarProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground text-right">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: "idle" | "generating" | "success" | "error";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    idle: "bg-muted text-muted-foreground",
    generating: "bg-blue-100 text-blue-700 animate-pulse",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  const labels = {
    idle: "Ready",
    generating: "Generating...",
    success: "Complete",
    error: "Failed",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded-full",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
