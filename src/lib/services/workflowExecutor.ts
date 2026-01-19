import { v4 as uuidv4 } from "uuid";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { WorkflowExecution } from "@/types/history";
import { AppNode, ImageNodeData, VideoNodeData, ConnectedInputs, PromptNodeData, ReferenceNodeData } from "@/types/nodes";
import { topologicalSort, getExecutionLayers } from "@/lib/utils/topologicalSort";

// ============================================
// Workflow Executor Service
// ============================================
// Automatically executes workflow nodes in dependency order

export interface ExecutionOptions {
  startNodeId?: string; // Start from specific node (and downstream)
  parallel?: boolean; // Execute independent nodes in parallel
  stopOnError?: boolean; // Stop workflow on first error
  onProgress?: (execution: WorkflowExecution) => void;
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  options: ExecutionOptions = {}
): Promise<WorkflowExecution> {
  const { nodes, edges, startExecution, updateExecution, stopExecution, updateNodeData } =
    useCanvasStore.getState();

  const { startNodeId, parallel = true, stopOnError = true, onProgress } = options;

  // Get execution order
  const { order, hasCycle, cyclePath } = topologicalSort(nodes, edges);

  if (hasCycle) {
    throw new Error(
      `Circular dependency detected: ${cyclePath?.join(" → ") || "unknown cycle"}`
    );
  }

  // Filter to generator nodes only (image, video)
  let executionOrder = order.filter((nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node?.type === "image" || node?.type === "video";
  });

  // If starting from a specific node, filter to that node and downstream
  if (startNodeId) {
    const startIdx = executionOrder.indexOf(startNodeId);
    if (startIdx === -1) {
      throw new Error("Start node not found in execution order");
    }
    executionOrder = executionOrder.slice(startIdx);
  }

  if (executionOrder.length === 0) {
    throw new Error("No generator nodes to execute");
  }

  // Create execution record
  const execution: WorkflowExecution = {
    id: uuidv4(),
    startedAt: new Date(),
    status: "running",
    executionOrder,
    completedNodes: [],
    nodeResults: {},
    totalCost: 0,
  };

  // Initialize node results
  for (const nodeId of executionOrder) {
    execution.nodeResults[nodeId] = { status: "pending" };
  }

  startExecution(execution);
  onProgress?.(execution);

  try {
    if (parallel) {
      // Execute in layers (parallel where possible)
      const layers = getExecutionLayers(nodes, edges);
      const generatorLayers = layers.map((layer) =>
        layer.filter((nodeId) => executionOrder.includes(nodeId))
      ).filter((layer) => layer.length > 0);

      for (const layer of generatorLayers) {
        // Execute all nodes in this layer in parallel
        const results = await Promise.allSettled(
          layer.map((nodeId) => executeNode(nodeId, execution, onProgress))
        );

        // Check for errors
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const nodeId = layer[i];

          if (result.status === "rejected" && stopOnError) {
            execution.status = "failed";
            execution.failedNode = nodeId;
            execution.error = result.reason?.message || "Unknown error";
            execution.completedAt = new Date();
            updateExecution(execution);
            onProgress?.(execution);
            return execution;
          }
        }
      }
    } else {
      // Execute sequentially
      for (const nodeId of executionOrder) {
        try {
          await executeNode(nodeId, execution, onProgress);
        } catch (error) {
          if (stopOnError) {
            execution.status = "failed";
            execution.failedNode = nodeId;
            execution.error = error instanceof Error ? error.message : "Unknown error";
            execution.completedAt = new Date();
            updateExecution(execution);
            onProgress?.(execution);
            return execution;
          }
        }
      }
    }

    // Mark as completed
    execution.status = "completed";
    execution.completedAt = new Date();
    updateExecution(execution);
    onProgress?.(execution);

    return execution;
  } catch (error) {
    execution.status = "failed";
    execution.error = error instanceof Error ? error.message : "Unknown error";
    execution.completedAt = new Date();
    stopExecution();
    throw error;
  }
}

/**
 * Execute a single node
 */
async function executeNode(
  nodeId: string,
  execution: WorkflowExecution,
  onProgress?: (execution: WorkflowExecution) => void
): Promise<void> {
  const { nodes, updateNodeData, getConnectedInputs, updateExecution } =
    useCanvasStore.getState();

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  // Update execution state
  execution.currentNode = nodeId;
  execution.nodeResults[nodeId] = {
    status: "running",
    startedAt: new Date(),
  };
  updateExecution(execution);
  onProgress?.(execution);

  const startTime = Date.now();

  try {
    // Get connected inputs
    const inputs = getConnectedInputs(nodeId);

    if (node.type === "image") {
      await executeImageNode(node, inputs, updateNodeData);
    } else if (node.type === "video") {
      await executeVideoNode(node, inputs, updateNodeData);
    }

    // Mark as successful
    const duration = Date.now() - startTime;
    const nodeData = useCanvasStore.getState().getNode(nodeId)?.data as
      | ImageNodeData
      | VideoNodeData;

    execution.nodeResults[nodeId] = {
      status: "success",
      outputUrl: nodeData?.outputUrl || undefined,
      completedAt: new Date(),
      duration,
    };
    execution.completedNodes.push(nodeId);

    updateExecution(execution);
    onProgress?.(execution);
  } catch (error) {
    const duration = Date.now() - startTime;
    execution.nodeResults[nodeId] = {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
      duration,
    };
    updateExecution(execution);
    onProgress?.(execution);
    throw error;
  }
}

/**
 * Execute an image generation node
 */
async function executeImageNode(
  node: AppNode,
  inputs: ConnectedInputs,
  updateNodeData: <T>(nodeId: string, data: Partial<T>) => void
): Promise<void> {
  const data = node.data as ImageNodeData;

  // Validate inputs
  const prompt = inputs.prompts.map((p: PromptNodeData) => p.prompt).join(". ");
  if (!prompt.trim() && inputs.references.length === 0) {
    throw new Error("Image node requires a prompt or reference");
  }

  // Start generation
  updateNodeData<ImageNodeData>(node.id, {
    isGenerating: true,
    progress: 0,
    error: undefined,
  });

  try {
    // Make API request
    const response = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt || "artistic image",
        negativePrompt: inputs.prompts[0]?.negativePrompt,
        referenceUrl: inputs.references[0]?.imageUrl,
        settings: data.settings,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Poll for completion
    let output = null;
    let pollCount = 0;
    const maxPolls = 120;

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

      updateNodeData<ImageNodeData>(node.id, {
        progress: Math.min(90, 10 + pollCount * 2),
      });
    }

    if (!output) {
      throw new Error("Generation timed out");
    }

    updateNodeData<ImageNodeData>(node.id, {
      isGenerating: false,
      progress: 100,
      outputUrl: output,
      error: undefined,
    });
  } catch (error) {
    updateNodeData<ImageNodeData>(node.id, {
      isGenerating: false,
      progress: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Execute a video generation node
 */
async function executeVideoNode(
  node: AppNode,
  inputs: ConnectedInputs,
  updateNodeData: <T>(nodeId: string, data: Partial<T>) => void
): Promise<void> {
  const data = node.data as VideoNodeData;

  // Build prompt
  let prompt = inputs.prompts.map((p: PromptNodeData) => p.prompt).join(". ");
  if (!prompt.trim()) {
    prompt = "cinematic video, smooth motion";
  }

  // Collect source images
  const sourceImages: string[] = [];
  for (const ref of inputs.references) {
    if (ref.imageUrl) sourceImages.push(ref.imageUrl);
  }
  for (const img of inputs.images) {
    if (img.outputUrl) sourceImages.push(img.outputUrl);
  }

  // Start generation
  updateNodeData<VideoNodeData>(node.id, {
    isGenerating: true,
    progress: 0,
    error: undefined,
  });

  try {
    const response = await fetch("/api/generate/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negativePrompt: inputs.prompts[0]?.negativePrompt,
        sourceImages,
        beforeImages: inputs.beforeImages?.map((r: ReferenceNodeData) => r.imageUrl).filter(Boolean),
        afterImages: inputs.afterImages?.map((r: ReferenceNodeData) => r.imageUrl).filter(Boolean),
        settings: data.settings,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Poll for completion
    let output = null;
    let pollCount = 0;
    const maxPolls = 300;

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
        throw new Error(pollResult.error || "Generation failed");
      }

      updateNodeData<VideoNodeData>(node.id, {
        progress: Math.min(90, 10 + pollCount * 0.5),
      });
    }

    if (!output) {
      throw new Error("Generation timed out");
    }

    updateNodeData<VideoNodeData>(node.id, {
      isGenerating: false,
      progress: 100,
      outputUrl: output,
      error: undefined,
    });
  } catch (error) {
    updateNodeData<VideoNodeData>(node.id, {
      isGenerating: false,
      progress: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Cancel current workflow execution
 */
export function cancelWorkflow(): void {
  const { stopExecution, updateExecution, currentExecution } =
    useCanvasStore.getState();

  if (currentExecution) {
    updateExecution({
      status: "cancelled",
      completedAt: new Date(),
    });
    stopExecution();
  }
}
