"use client";

import React, { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Save,
  FolderOpen,
  Trash2,
  Star,
  StarOff,
  Clock,
  Layers,
  FileText,
  Sparkles,
  Film,
  ChevronRight,
} from "lucide-react";
import { SavedWorkflow, WorkflowTemplate } from "@/types/history";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import {
  getAllWorkflows,
  saveWorkflow,
  deleteWorkflow,
  toggleWorkflowFavorite,
} from "@/lib/db/historyDB";
import {
  WORKFLOW_TEMPLATES,
  instantiateTemplate,
} from "@/lib/templates/workflowTemplates";
import { cn } from "@/lib/utils";

// ============================================
// Workflows Panel Component
// ============================================

export function WorkflowsPanel() {
  const { nodes, edges, viewport, setNodes, setEdges, clearCanvas } =
    useCanvasStore();

  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"saved" | "templates">("saved");

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const all = await getAllWorkflows();
      setWorkflows(all);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save current workflow
  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;

    const workflow: SavedWorkflow = {
      id: uuidv4(),
      name: saveName.trim(),
      description: saveDescription.trim() || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      canvas: {
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        viewport,
      },
      executionCount: 0,
      favorite: false,
    };

    try {
      await saveWorkflow(workflow);
      await loadWorkflows();
      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
    } catch (error) {
      console.error("Failed to save workflow:", error);
    }
  }, [saveName, saveDescription, nodes, edges, viewport]);

  // Load a saved workflow
  const handleLoad = useCallback(
    async (workflow: SavedWorkflow) => {
      if (
        nodes.length > 0 &&
        !confirm("Load this workflow? Current canvas will be replaced.")
      ) {
        return;
      }

      try {
        const { nodes: savedNodes, edges: savedEdges } = workflow.canvas;
        setNodes(savedNodes as typeof nodes);
        setEdges(savedEdges as typeof edges);
      } catch (error) {
        console.error("Failed to load workflow:", error);
      }
    },
    [nodes.length, setNodes, setEdges]
  );

  // Load a template
  const handleLoadTemplate = useCallback(
    (template: WorkflowTemplate) => {
      if (
        nodes.length > 0 &&
        !confirm("Load this template? Current canvas will be replaced.")
      ) {
        return;
      }

      try {
        const { nodes: templateNodes, edges: templateEdges } =
          instantiateTemplate(template);
        clearCanvas();
        setNodes(templateNodes);
        setEdges(templateEdges);
      } catch (error) {
        console.error("Failed to load template:", error);
      }
    },
    [nodes.length, clearCanvas, setNodes, setEdges]
  );

  // Delete a workflow
  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Delete this workflow?")) return;

      try {
        await deleteWorkflow(id);
        await loadWorkflows();
      } catch (error) {
        console.error("Failed to delete workflow:", error);
      }
    },
    []
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await toggleWorkflowFavorite(id);
        await loadWorkflows();
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
      }
    },
    []
  );

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryIcon = (category: WorkflowTemplate["category"]) => {
    switch (category) {
      case "image-to-video":
        return <Film size={14} className="text-violet-500" />;
      case "text-to-video":
        return <FileText size={14} className="text-blue-500" />;
      case "enhancement":
        return <Sparkles size={14} className="text-amber-500" />;
      default:
        return <Layers size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("saved")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "saved"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Save size={14} className="inline mr-1.5" />
          Saved
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "templates"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers size={14} className="inline mr-1.5" />
          Templates
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "saved" ? (
          <>
            {/* Save Button */}
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Save size={16} />
              Save Current Workflow
            </button>

            {/* Save Dialog */}
            {showSaveDialog && (
              <div className="mb-4 p-3 bg-muted rounded-md space-y-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Workflow name..."
                  className="w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Description (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="flex-1 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1 py-1.5 text-sm bg-muted-foreground/10 rounded-md hover:bg-muted-foreground/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Workflow List */}
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading...
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No saved workflows yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save your current canvas to reuse it later
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    onClick={() => handleLoad(workflow)}
                    className="p-3 bg-muted/50 hover:bg-muted rounded-md cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate flex items-center gap-1.5">
                          {workflow.favorite && (
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                          )}
                          {workflow.name}
                        </h3>
                        {workflow.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {workflow.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(workflow.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers size={10} />
                            {(workflow.canvas.nodes as unknown[]).length} nodes
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleToggleFavorite(workflow.id, e)}
                          className="p-1 hover:bg-background rounded"
                          title={workflow.favorite ? "Unfavorite" : "Favorite"}
                        >
                          {workflow.favorite ? (
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                          ) : (
                            <StarOff size={14} className="text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDelete(workflow.id, e)}
                          className="p-1 hover:bg-red-100 hover:text-red-500 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Templates Tab */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-3">
              Quick-start templates for common workflows
            </p>
            {WORKFLOW_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => handleLoadTemplate(template)}
                className="p-3 bg-muted/50 hover:bg-muted rounded-md cursor-pointer transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center">
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers size={10} />
                        {template.nodes.length} nodes
                      </span>
                      <span className="capitalize px-1.5 py-0.5 bg-background rounded text-[10px]">
                        {template.category.replace("-", " ")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
