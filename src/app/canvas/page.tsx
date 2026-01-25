"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  Type,
  ImageIcon,
  Film,
  Palette,
  Play,
  Square,
  History,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Workflow,
  ArrowUpFromLine,
} from "lucide-react";

import { useCanvasStore } from "@/lib/stores/canvasStore";
import { nodeTypes } from "@/components/canvas/nodes";
import { HistoryPanel } from "@/components/panels/HistoryPanel";
import { UsageDashboard } from "@/components/panels/UsageDashboard";
import { WorkflowsPanel } from "@/components/panels/WorkflowsPanel";
import { executeWorkflow, cancelWorkflow } from "@/lib/services/workflowExecutor";
import { downloadProjectExport } from "@/lib/services/projectExporter";
import { importProjectFromFile, validateImportFile, ImportResult } from "@/lib/services/projectImporter";
import { WorkflowExecution } from "@/types/history";
import { cn } from "@/lib/utils";

// ============================================
// Canvas Page Component
// ============================================

function CanvasContent() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    clearCanvas,
    currentExecution,
  } = useCanvasStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // UI State
  const [rightPanel, setRightPanel] = useState<"history" | "usage" | "workflows" | null>("history");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ progress: number; message: string } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Add node at center or mouse position
  const handleAddNode = useCallback(
    (type: "prompt" | "reference" | "image" | "video" | "upscale") => {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      // Slight random offset to prevent stacking
      const offset = { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 };

      addNode(type, {
        x: center.x + offset.x,
        y: center.y + offset.y,
      });
    },
    [screenToFlowPosition, addNode]
  );

  // Workflow execution
  const handleRunWorkflow = useCallback(async () => {
    try {
      const result = await executeWorkflow({
        parallel: true,
        stopOnError: true,
        onProgress: (execution: WorkflowExecution) => {
          console.log("Workflow progress:", execution.status, execution.completedNodes.length);
        },
      });
      console.log("Workflow completed:", result);
    } catch (error) {
      console.error("Workflow failed:", error);
    }
  }, []);

  const handleStopWorkflow = useCallback(() => {
    cancelWorkflow();
  }, []);

  // Export
  const handleExport = useCallback(async (format: "json" | "zip") => {
    setIsExporting(true);
    setExportProgress({ progress: 0, message: "Starting export..." });

    try {
      await downloadProjectExport(format, true, (progress, message) => {
        setExportProgress({ progress, message });
      });
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, []);

  // Import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate first
    const validation = await validateImportFile(file);
    if (!validation.valid) {
      setImportResult({
        success: false,
        nodesImported: 0,
        historyImported: 0,
        assetsRestored: 0,
        warnings: [],
        error: validation.error,
      });
      return;
    }

    // Confirm before replacing
    const nodeCount = validation.preview?.canvas?.nodes?.length || 0;
    if (!confirm(`Import ${nodeCount} nodes? This will replace your current canvas.`)) {
      return;
    }

    const result = await importProjectFromFile(file, {
      replaceExisting: true,
      importHistory: true,
      restoreAssets: true,
    });

    setImportResult(result);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Clear canvas confirmation
  const handleClearCanvas = useCallback(() => {
    if (confirm("Clear all nodes and edges? This cannot be undone.")) {
      clearCanvas();
    }
  }, [clearCanvas]);

  return (
    <div className="flex h-screen w-screen bg-background">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-14 border-b bg-card flex items-center justify-between px-4">
          {/* Left: Logo & Add Nodes */}
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Palette className="text-primary" size={22} />
              Flora Fauna
            </h1>

            <div className="h-6 w-px bg-border" />

            {/* Add Node Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAddNode("prompt")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                title="Add Prompt Node"
              >
                <Type size={14} />
                Prompt
              </button>
              <button
                onClick={() => handleAddNode("reference")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                title="Add Reference Node"
              >
                <ImageIcon size={14} />
                Reference
              </button>
              <button
                onClick={() => handleAddNode("image")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 rounded-md transition-colors"
                title="Add Image Generator"
              >
                <Plus size={14} />
                Image
              </button>
              <button
                onClick={() => handleAddNode("video")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 rounded-md transition-colors"
                title="Add Video Generator"
              >
                <Plus size={14} />
                Video
              </button>
              <button
                onClick={() => handleAddNode("upscale")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 rounded-md transition-colors"
                title="Add Upscale Node"
              >
                <ArrowUpFromLine size={14} />
                Upscale
              </button>
            </div>
          </div>

          {/* Center: Workflow Controls */}
          <div className="flex items-center gap-2">
            {currentExecution?.status === "running" ? (
              <button
                onClick={handleStopWorkflow}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <Square size={14} />
                Stop Workflow
              </button>
            ) : (
              <button
                onClick={handleRunWorkflow}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Play size={14} />
                Run Workflow
              </button>
            )}
            {currentExecution && (
              <span className="text-xs text-muted-foreground">
                {currentExecution.completedNodes.length}/{currentExecution.executionOrder.length} completed
              </span>
            )}
          </div>

          {/* Right: Export/Import & Panels */}
          <div className="flex items-center gap-2">
            {/* Export/Import */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExport("zip")}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                title="Export Project"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={handleImportClick}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors"
                title="Import Project"
              >
                <Upload size={14} />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="h-6 w-px bg-border" />

            <button
              onClick={handleClearCanvas}
              className="p-2 text-muted-foreground hover:text-red-500 rounded-md transition-colors"
              title="Clear Canvas"
            >
              <Trash2 size={16} />
            </button>

            <div className="h-6 w-px bg-border" />

            {/* Panel Toggles */}
            <button
              onClick={() => setRightPanel(rightPanel === "workflows" ? null : "workflows")}
              className={cn(
                "p-2 rounded-md transition-colors",
                rightPanel === "workflows"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title="Saved Workflows & Templates"
            >
              <Workflow size={16} />
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === "history" ? null : "history")}
              className={cn(
                "p-2 rounded-md transition-colors",
                rightPanel === "history"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title="Generation History"
            >
              <History size={16} />
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === "usage" ? null : "usage")}
              className={cn(
                "p-2 rounded-md transition-colors",
                rightPanel === "usage"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title="Usage Dashboard"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultViewport={viewport}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            connectionLineStyle={{ stroke: "#9ca3af", strokeWidth: 2 }}
            defaultEdgeOptions={{
              style: { stroke: "#9ca3af", strokeWidth: 2 },
              type: "smoothstep",
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case "prompt":
                    return "#3b82f6";
                  case "reference":
                    return "#10b981";
                  case "image":
                    return "#ec4899";
                  case "video":
                    return "#8b5cf6";
                  default:
                    return "#6b7280";
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />

            {/* Export Progress Overlay */}
            {exportProgress && (
              <Panel position="top-center" className="bg-card border rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  <div>
                    <p className="text-sm font-medium">{exportProgress.message}</p>
                    <div className="w-48 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${exportProgress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {/* Import Result Toast */}
            {importResult && (
              <Panel position="bottom-center" className="bg-card border rounded-lg p-4 shadow-lg mb-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      importResult.success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}
                  >
                    {importResult.success ? "✓" : "✕"}
                  </div>
                  <div>
                    {importResult.success ? (
                      <>
                        <p className="text-sm font-medium">Import Successful</p>
                        <p className="text-xs text-muted-foreground">
                          {importResult.nodesImported} nodes, {importResult.historyImported} history records
                          {importResult.assetsRestored > 0 && `, ${importResult.assetsRestored} assets`}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-red-600">Import Failed</p>
                        <p className="text-xs text-muted-foreground">{importResult.error}</p>
                      </>
                    )}
                    <button
                      onClick={() => setImportResult(null)}
                      className="text-xs text-primary mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar */}
      {rightPanel && (
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              {rightPanel === "workflows" ? (
                <>
                  <Workflow size={16} />
                  Workflows
                </>
              ) : rightPanel === "history" ? (
                <>
                  <History size={16} />
                  History
                </>
              ) : (
                <>
                  <BarChart3 size={16} />
                  Usage
                </>
              )}
            </h2>
            <button
              onClick={() => setRightPanel(null)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel === "workflows" ? (
              <WorkflowsPanel />
            ) : rightPanel === "history" ? (
              <HistoryPanel />
            ) : (
              <UsageDashboard />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
