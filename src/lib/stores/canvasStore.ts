import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
  Viewport,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import {
  AppNode,
  AppEdge,
  PromptNodeData,
  ReferenceNodeData,
  ImageNodeData,
  VideoNodeData,
  UpscaleNodeData,
  ConnectedInputs,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  DEFAULT_UPSCALE_SETTINGS,
} from "@/types/nodes";
import { WorkflowExecution } from "@/types/history";

// ============================================
// Canvas Store State
// ============================================

interface CanvasState {
  // Core canvas state
  nodes: AppNode[];
  edges: AppEdge[];
  viewport: Viewport;

  // Selection
  selectedNodeId: string | null;

  // Workflow execution
  currentExecution: WorkflowExecution | null;
  isExecuting: boolean;

  // Actions - Core
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  setViewport: (viewport: Viewport) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions - Node Management
  addNode: (
    type: "prompt" | "reference" | "image" | "video" | "upscale",
    position: { x: number; y: number }
  ) => string;
  updateNodeData: <T>(nodeId: string, data: Partial<T>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

  // Actions - Selection
  setSelectedNodeId: (nodeId: string | null) => void;

  // Actions - Workflow
  startExecution: (execution: WorkflowExecution) => void;
  updateExecution: (updates: Partial<WorkflowExecution>) => void;
  stopExecution: () => void;

  // Helpers
  getNode: (nodeId: string) => AppNode | undefined;
  getConnectedInputs: (nodeId: string) => ConnectedInputs;

  // Import/Export
  importCanvas: (data: { nodes: AppNode[]; edges: AppEdge[] }) => void;
  clearCanvas: () => void;
}

// ============================================
// Default Node Data Factories
// ============================================

function createPromptNodeData(): PromptNodeData {
  return {
    label: "Prompt",
    prompt: "",
    negativePrompt: "",
  };
}

function createReferenceNodeData(): ReferenceNodeData {
  return {
    label: "Reference",
    imageUrl: null,
    referenceType: "style",
    strength: 0.75,
    role: "single",
  };
}

function createImageNodeData(): ImageNodeData {
  return {
    label: "Image Generation",
    settings: { ...DEFAULT_IMAGE_SETTINGS },
    isGenerating: false,
    progress: 0,
    outputUrl: null,
  };
}

function createVideoNodeData(): VideoNodeData {
  return {
    label: "Video Generation",
    settings: { ...DEFAULT_VIDEO_SETTINGS },
    isGenerating: false,
    progress: 0,
    outputUrl: null,
  };
}

function createUpscaleNodeData(): UpscaleNodeData {
  return {
    label: "Upscale Image",
    settings: { ...DEFAULT_UPSCALE_SETTINGS },
    isGenerating: false,
    outputUrl: null,
  };
}

// ============================================
// Canvas Store Implementation
// ============================================

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeId: null,
      currentExecution: null,
      isExecuting: false,

      // Core Actions
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setViewport: (viewport) => set({ viewport }),

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes) as AppNode[],
        });
      },

      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges) as AppEdge[],
        });
      },

      onConnect: (connection) => {
        set({
          edges: addEdge(
            { ...connection, id: uuidv4() },
            get().edges
          ) as AppEdge[],
        });
      },

      // Node Management
      addNode: (type, position) => {
        const id = uuidv4();
        let data: PromptNodeData | ReferenceNodeData | ImageNodeData | VideoNodeData | UpscaleNodeData;

        switch (type) {
          case "prompt":
            data = createPromptNodeData();
            break;
          case "reference":
            data = createReferenceNodeData();
            break;
          case "image":
            data = createImageNodeData();
            break;
          case "video":
            data = createVideoNodeData();
            break;
          case "upscale":
            data = createUpscaleNodeData();
            break;
        }

        const newNode: AppNode = {
          id,
          type,
          position,
          data,
        } as AppNode;

        set({ nodes: [...get().nodes, newNode] });
        return id;
      },

      updateNodeData: <T>(nodeId: string, updates: Partial<T>) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...updates } }
              : node
          ) as AppNode[],
        });
      },

      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId:
            get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        });
      },

      duplicateNode: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const newId = uuidv4();
        const newNode: AppNode = {
          ...node,
          id: newId,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          data: { ...node.data, label: `${node.data.label} (copy)` },
        } as AppNode;

        set({ nodes: [...get().nodes, newNode] });
      },

      // Selection
      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

      // Workflow Execution
      startExecution: (execution) =>
        set({ currentExecution: execution, isExecuting: true }),

      updateExecution: (updates) => {
        const current = get().currentExecution;
        if (current) {
          set({ currentExecution: { ...current, ...updates } });
        }
      },

      stopExecution: () =>
        set({
          currentExecution: null,
          isExecuting: false,
        }),

      // Helpers
      getNode: (nodeId) => get().nodes.find((n) => n.id === nodeId),

      getConnectedInputs: (nodeId) => {
        const { nodes, edges } = get();
        const incomingEdges = edges.filter((e) => e.target === nodeId);
        const sourceNodeIds = incomingEdges.map((e) => e.source);
        const sourceNodes = nodes.filter((n) => sourceNodeIds.includes(n.id));

        const inputs: ConnectedInputs = {
          prompts: [],
          references: [],
          images: [],
          beforeImages: [],
          afterImages: [],
        };

        for (const node of sourceNodes) {
          switch (node.type) {
            case "prompt":
              inputs.prompts.push(node.data as PromptNodeData);
              break;
            case "reference": {
              const refData = node.data as ReferenceNodeData;
              inputs.references.push(refData);
              // Group by role for before/after workflows
              if (refData.role === "before") {
                inputs.beforeImages?.push(refData);
              } else if (refData.role === "after") {
                inputs.afterImages?.push(refData);
              }
              break;
            }
            case "image":
              inputs.images.push(node.data as ImageNodeData);
              break;
          }
        }

        return inputs;
      },

      // Import/Export
      importCanvas: (data) => {
        set({
          nodes: data.nodes,
          edges: data.edges,
          selectedNodeId: null,
        });
      },

      clearCanvas: () => {
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          currentExecution: null,
          isExecuting: false,
        });
      },
    }),
    {
      name: "flora-canvas-storage",
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const selectSelectedNode = (state: CanvasState) =>
  state.nodes.find((n) => n.id === state.selectedNodeId);

export const selectNodesByType = (type: string) => (state: CanvasState) =>
  state.nodes.filter((n) => n.type === type);

export const selectIsGenerating = (state: CanvasState) =>
  state.nodes.some(
    (n) =>
      (n.type === "image" || n.type === "video") &&
      (n.data as ImageNodeData | VideoNodeData).isGenerating
  );
