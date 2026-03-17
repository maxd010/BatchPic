import { useEffect } from "react";
import { ImageFile, ProcessingParams } from "../../main/types";

interface FullScreenPreviewProps {
  image: ImageFile;
  outputPath?: string;
  params: ProcessingParams;
  onClose: () => void;
}

// Opens a separate Electron window for preview instead of rendering in-page modal.
// This avoids the main window size constraint (460px).
export function FullScreenPreview({
  image,
  outputPath,
  onClose,
}: FullScreenPreviewProps) {
  useEffect(() => {
    window.electronAPI.openPreviewWindow?.({
      originalPath: image.path,
      outputPath,
      filename: image.relativePath,
    });
    // Close the "placeholder" immediately — the real UI is in the new window
    onClose();
  }, []);

  return null;
}
