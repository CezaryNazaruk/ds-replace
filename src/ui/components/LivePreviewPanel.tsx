import React from 'react';
import { PreviewData } from '../../../shared/types/messages.types';
import { convertThumbnailToBase64 } from '../utils/imageUtils';

interface Props {
  previewData: PreviewData | null;
  isLoading: boolean;
}

export function LivePreviewPanel({ previewData, isLoading }: Props) {
  // Loading state - show spinner
  if (isLoading) {
    return (
      <div className="preview-panel loading">
        <div className="spinner">
          <div className="spinner-icon"></div>
          <p>Generating preview...</p>
        </div>
      </div>
    );
  }

  // Empty state - no component selected yet
  if (!previewData) {
    return (
      <div className="preview-panel empty">
        <p>Select a component to see preview</p>
      </div>
    );
  }

  // Convert Uint8Array to base64 for image display
  const oldImageBase64 = convertThumbnailToBase64(previewData.oldImage) || '';
  const newImageBase64 = convertThumbnailToBase64(previewData.newImage) || '';

  return (
    <div className="preview-panel">
      <h3>Preview</h3>
      <div className="preview-comparison">
        <div className="preview-side">
          <h4>Current</h4>
          <div className="preview-image-container">
            <img src={oldImageBase64} alt="Current component" />
          </div>
        </div>
        <div className="preview-divider">→</div>
        <div className="preview-side">
          <h4>After Replacement</h4>
          <div className="preview-image-container">
            <img src={newImageBase64} alt="New component" />
          </div>
        </div>
      </div>
    </div>
  );
}
