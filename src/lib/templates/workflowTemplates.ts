import { WorkflowTemplate } from "@/types/history";
import { v4 as uuidv4 } from "uuid";
import { AppNode, AppEdge } from "@/types/nodes";

// ============================================
// Workflow Templates
// ============================================
// Pre-built workflow configurations for common use cases

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "ref-to-video",
    name: "Reference to Video",
    description: "Upload a reference image, generate a transformed version, then create a before/after video",
    category: "image-to-video",
    nodes: [
      {
        type: "reference",
        position: { x: 100, y: 100 },
        data: {
          label: "Before (Reference)",
          imageUrl: null,
          referenceType: "style",
          strength: 0.75,
          role: "before",
        },
      },
      {
        type: "prompt",
        position: { x: 100, y: 350 },
        data: {
          label: "Transform Prompt",
          prompt: "",
          negativePrompt: "",
        },
      },
      {
        type: "image",
        position: { x: 400, y: 100 },
        data: {
          label: "Generated (After)",
          settings: {
            model: "flux-schnell",
            aspectRatio: "1:1",
            guidanceScale: 3.5,
            numInferenceSteps: 4,
            outputFormat: "png",
            outputQuality: 90,
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
      {
        type: "video",
        position: { x: 700, y: 200 },
        data: {
          label: "Before/After Video",
          settings: {
            model: "seedance-1.0-lite",
            duration: 5,
            resolution: "720p",
            fps: 24,
            cameraMovement: "static",
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 2 }, // Reference -> Image Gen
      { sourceIndex: 1, targetIndex: 2 }, // Prompt -> Image Gen
      { sourceIndex: 0, targetIndex: 3 }, // Reference (before) -> Video
      { sourceIndex: 2, targetIndex: 3 }, // Generated (after) -> Video
      { sourceIndex: 1, targetIndex: 3 }, // Prompt -> Video
    ],
    defaults: {
      imageModel: "flux-schnell",
      videoModel: "seedance-1.0-lite",
      videoResolution: "720p",
      videoDuration: 5,
    },
  },
  {
    id: "dual-ref-video",
    name: "Dual Reference Video",
    description: "Upload two images as before/after references, generate a transition video",
    category: "image-to-video",
    nodes: [
      {
        type: "reference",
        position: { x: 100, y: 100 },
        data: {
          label: "Before Image",
          imageUrl: null,
          referenceType: "style",
          strength: 1.0,
          role: "before",
        },
      },
      {
        type: "reference",
        position: { x: 100, y: 350 },
        data: {
          label: "After Image",
          imageUrl: null,
          referenceType: "style",
          strength: 1.0,
          role: "after",
        },
      },
      {
        type: "prompt",
        position: { x: 400, y: 100 },
        data: {
          label: "Transition Prompt",
          prompt: "smooth morphing transition",
          negativePrompt: "",
        },
      },
      {
        type: "video",
        position: { x: 400, y: 300 },
        data: {
          label: "Transition Video",
          settings: {
            model: "seedance-1.0-lite",
            duration: 5,
            resolution: "720p",
            fps: 24,
            cameraMovement: "static",
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 3 }, // Before -> Video
      { sourceIndex: 1, targetIndex: 3 }, // After -> Video
      { sourceIndex: 2, targetIndex: 3 }, // Prompt -> Video
    ],
    defaults: {
      videoModel: "seedance-1.0-lite",
      videoResolution: "720p",
      videoDuration: 5,
    },
  },
  {
    id: "florafauna-workflow",
    name: "FloraFauna Scene Generator",
    description: "Generate two scene variations with Gemini 3 Pro and create a video with Seedance Pro 1.5",
    category: "image-to-video",
    nodes: [
      {
        type: "prompt",
        position: { x: 100, y: 100 },
        data: {
          label: "Scene Prompt 1",
          prompt: "",
          negativePrompt: "",
          enhancementModel: "sonnet",
        },
      },
      {
        type: "prompt",
        position: { x: 100, y: 380 },
        data: {
          label: "Scene Prompt 2",
          prompt: "",
          negativePrompt: "",
          enhancementModel: "sonnet",
        },
      },
      {
        type: "image",
        position: { x: 450, y: 100 },
        data: {
          label: "Scene Image 1",
          settings: {
            model: "flux-schnell",
            aspectRatio: "1:1",
            guidanceScale: 3.5,
            numInferenceSteps: 4,
            outputFormat: "png",
            outputQuality: 90,
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
      {
        type: "image",
        position: { x: 450, y: 380 },
        data: {
          label: "Scene Image 2",
          settings: {
            model: "flux-schnell",
            aspectRatio: "1:1",
            guidanceScale: 3.5,
            numInferenceSteps: 4,
            outputFormat: "png",
            outputQuality: 90,
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
      {
        type: "video",
        position: { x: 800, y: 240 },
        data: {
          label: "Scene Video",
          settings: {
            model: "seedance-1.5-pro",
            duration: 5,
            resolution: "1080p",
            fps: 24,
            cameraMovement: "static",
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 2 }, // Prompt 1 -> Image 1
      { sourceIndex: 1, targetIndex: 3 }, // Prompt 2 -> Image 2
      { sourceIndex: 2, targetIndex: 4 }, // Image 1 -> Video
      { sourceIndex: 3, targetIndex: 4 }, // Image 2 -> Video
      { sourceIndex: 0, targetIndex: 4 }, // Prompt 1 -> Video
      { sourceIndex: 1, targetIndex: 4 }, // Prompt 2 -> Video
    ],
    defaults: {
      imageModel: "flux-schnell",
      videoModel: "seedance-1.5-pro",
      videoResolution: "1080p",
      videoDuration: 5,
    },
  },
  {
    id: "florafauna-with-character",
    name: "FloraFauna with Character Reference",
    description: "Use a character reference image to generate scene variations with Seedance Pro 1.5 video",
    category: "image-to-video",
    nodes: [
      {
        type: "imageUpload",
        position: { x: 50, y: 240 },
        data: {
          label: "Character Reference",
          imageUrl: null,
        },
      },
      {
        type: "prompt",
        position: { x: 250, y: 100 },
        data: {
          label: "Scene Prompt 1",
          prompt: "",
          negativePrompt: "",
          enhancementModel: "sonnet",
        },
      },
      {
        type: "prompt",
        position: { x: 250, y: 380 },
        data: {
          label: "Scene Prompt 2",
          prompt: "",
          negativePrompt: "",
          enhancementModel: "sonnet",
        },
      },
      {
        type: "image",
        position: { x: 550, y: 100 },
        data: {
          label: "Scene Image 1",
          settings: {
            model: "flux-schnell",
            aspectRatio: "1:1",
            guidanceScale: 3.5,
            numInferenceSteps: 4,
            outputFormat: "png",
            outputQuality: 90,
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
      {
        type: "image",
        position: { x: 550, y: 380 },
        data: {
          label: "Scene Image 2",
          settings: {
            model: "flux-schnell",
            aspectRatio: "1:1",
            guidanceScale: 3.5,
            numInferenceSteps: 4,
            outputFormat: "png",
            outputQuality: 90,
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
      {
        type: "video",
        position: { x: 900, y: 240 },
        data: {
          label: "Scene Video",
          settings: {
            model: "seedance-1.5-pro",
            duration: 5,
            resolution: "1080p",
            fps: 24,
            cameraMovement: "static",
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 3 }, // Character -> Image 1
      { sourceIndex: 0, targetIndex: 4 }, // Character -> Image 2
      { sourceIndex: 1, targetIndex: 3 }, // Prompt 1 -> Image 1
      { sourceIndex: 2, targetIndex: 4 }, // Prompt 2 -> Image 2
      { sourceIndex: 3, targetIndex: 5 }, // Image 1 -> Video
      { sourceIndex: 4, targetIndex: 5 }, // Image 2 -> Video
      { sourceIndex: 0, targetIndex: 5 }, // Character -> Video
      { sourceIndex: 1, targetIndex: 5 }, // Prompt 1 -> Video
      { sourceIndex: 2, targetIndex: 5 }, // Prompt 2 -> Video
    ],
    defaults: {
      imageModel: "flux-schnell",
      videoModel: "seedance-1.5-pro",
      videoResolution: "1080p",
      videoDuration: 5,
    },
  },
  {
    id: "image-gen-upscale",
    name: "Generate & Upscale",
    description: "Generate an image from prompt and upscale it to higher resolution",
    category: "enhancement",
    nodes: [
      {
        type: "prompt",
        position: { x: 100, y: 200 },
        data: {
          label: "Image Prompt",
          prompt: "",
          negativePrompt: "",
        },
      },
      {
        type: "image",
        position: { x: 400, y: 150 },
        data: {
          label: "Generated Image",
          settings: {
            model: "flux-schnell",
            aspectRatio: "1:1",
            guidanceScale: 3.5,
            numInferenceSteps: 4,
            outputFormat: "png",
            outputQuality: 90,
          },
          isGenerating: false,
          progress: 0,
          outputUrl: null,
        },
      },
      {
        type: "upscale",
        position: { x: 700, y: 150 },
        data: {
          label: "Upscaled Image",
          settings: {
            model: "stability-conservative",
            outputFormat: "png",
          },
          isGenerating: false,
          outputUrl: null,
        },
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 }, // Prompt -> Image
      { sourceIndex: 1, targetIndex: 2 }, // Image -> Upscale
    ],
    defaults: {
      imageModel: "flux-schnell",
    },
  },
];

/**
 * Create nodes and edges from a workflow template
 */
export function instantiateTemplate(
  template: WorkflowTemplate
): { nodes: AppNode[]; edges: AppEdge[] } {
  const nodeIdMap = new Map<number, string>();

  // Create nodes with unique IDs
  const nodes: AppNode[] = template.nodes.map((nodeDef, index) => {
    const id = uuidv4();
    nodeIdMap.set(index, id);

    return {
      id,
      type: nodeDef.type,
      position: nodeDef.position,
      data: { ...nodeDef.data },
    } as AppNode;
  });

  // Create edges using the ID map
  const edges: AppEdge[] = template.edges.map((edgeDef) => ({
    id: uuidv4(),
    source: nodeIdMap.get(edgeDef.sourceIndex)!,
    target: nodeIdMap.get(edgeDef.targetIndex)!,
    sourceHandle: edgeDef.sourceHandle,
    targetHandle: edgeDef.targetHandle,
  }));

  return { nodes, edges };
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: WorkflowTemplate["category"]
): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
}
