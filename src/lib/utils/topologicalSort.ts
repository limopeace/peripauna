import { AppNode, AppEdge } from "@/types/nodes";

// ============================================
// Topological Sort for Workflow Execution
// ============================================
// Uses Kahn's algorithm to determine execution order
// Ensures all dependencies complete before a node runs

export interface SortResult {
  order: string[]; // Node IDs in execution order
  hasCycle: boolean; // True if circular dependency detected
  cyclePath?: string[]; // Path showing the cycle if found
}

/**
 * Topologically sort nodes based on edge dependencies
 * Returns execution order (nodes with no inputs first)
 */
export function topologicalSort(
  nodes: AppNode[],
  edges: AppEdge[]
): SortResult {
  // Build adjacency list and calculate in-degrees
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize all nodes
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build graph from edges (source -> target)
  for (const edge of edges) {
    const neighbors = adjacencyList.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find all nodes with no incoming edges (starting nodes)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process nodes in topological order
  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    // Reduce in-degree for all neighbors
    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles (if not all nodes are in order)
  const hasCycle = order.length !== nodes.length;

  if (hasCycle) {
    // Find the cycle for error reporting
    const cyclePath = findCycle(nodes, edges);
    return { order, hasCycle, cyclePath };
  }

  return { order, hasCycle: false };
}

/**
 * Find a cycle in the graph using DFS
 */
function findCycle(nodes: AppNode[], edges: AppEdge[]): string[] {
  const adjacencyList = new Map<string, string[]>();
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
  }
  for (const edge of edges) {
    adjacencyList.get(edge.source)?.push(edge.target);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        path.push(neighbor);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        // Trim path to show only the cycle
        const cycleStart = path.indexOf(path[path.length - 1]);
        return path.slice(cycleStart);
      }
    }
  }

  return [];
}

/**
 * Get all nodes that are upstream (dependencies) of a given node
 */
export function getUpstreamNodes(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): string[] {
  const upstream = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const incomingEdges = edges.filter((e) => e.target === current);
    for (const edge of incomingEdges) {
      if (!upstream.has(edge.source)) {
        upstream.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return Array.from(upstream);
}

/**
 * Get all nodes that are downstream (dependents) of a given node
 */
export function getDownstreamNodes(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): string[] {
  const downstream = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outgoingEdges = edges.filter((e) => e.source === current);
    for (const edge of outgoingEdges) {
      if (!downstream.has(edge.target)) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return Array.from(downstream);
}

/**
 * Get execution order starting from a specific node
 * Only includes the node and its downstream dependencies
 */
export function getExecutionOrderFromNode(
  startNodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): SortResult {
  // Get all downstream nodes including the start node
  const downstream = getDownstreamNodes(startNodeId, nodes, edges);
  downstream.unshift(startNodeId); // Add start node at beginning

  // Filter nodes and edges to only include relevant ones
  const relevantNodes = nodes.filter((n) => downstream.includes(n.id));
  const relevantEdges = edges.filter(
    (e) => downstream.includes(e.source) && downstream.includes(e.target)
  );

  return topologicalSort(relevantNodes, relevantEdges);
}

/**
 * Get the execution layers (nodes that can run in parallel)
 */
export function getExecutionLayers(
  nodes: AppNode[],
  edges: AppEdge[]
): string[][] {
  const { order, hasCycle } = topologicalSort(nodes, edges);
  if (hasCycle) return [];

  const layers: string[][] = [];
  const nodeLayer = new Map<string, number>();

  // Calculate layer for each node
  for (const nodeId of order) {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length === 0) {
      nodeLayer.set(nodeId, 0);
    } else {
      const maxParentLayer = Math.max(
        ...incomingEdges.map((e) => nodeLayer.get(e.source) || 0)
      );
      nodeLayer.set(nodeId, maxParentLayer + 1);
    }
  }

  // Group nodes by layer
  for (const [nodeId, layer] of nodeLayer) {
    while (layers.length <= layer) {
      layers.push([]);
    }
    layers[layer].push(nodeId);
  }

  return layers;
}
