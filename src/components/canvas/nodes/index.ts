export { PromptNode } from "./PromptNode";
export { ReferenceNode } from "./ReferenceNode";
export { ImageNode } from "./ImageNode";
export { VideoNode } from "./VideoNode";
export { UpscaleNode } from "./UpscaleNode";
export { ImageUploadNode } from "./ImageUploadNode";
export { BaseNode, NodeHeader, ProgressBar, StatusBadge } from "./BaseNode";

// Node types map for React Flow
import { PromptNode } from "./PromptNode";
import { ReferenceNode } from "./ReferenceNode";
import { ImageNode } from "./ImageNode";
import { VideoNode } from "./VideoNode";
import { UpscaleNode } from "./UpscaleNode";
import { ImageUploadNode } from "./ImageUploadNode";

export const nodeTypes = {
  prompt: PromptNode,
  reference: ReferenceNode,
  image: ImageNode,
  video: VideoNode,
  upscale: UpscaleNode,
  imageUpload: ImageUploadNode,
};
