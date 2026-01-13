import React, { useState, useEffect, useMemo } from 'react';
import { ComponentData, InstanceData } from '../../shared/types/component.types';
import { usePluginMessage } from '../hooks/usePluginMessage';
import { useStore } from '../store';
import { PropMapper } from './PropMapper';
import { LivePreviewPanel } from './LivePreviewPanel';

interface Props {
  component: ComponentData;
  instance: InstanceData;
  onBack: () => void;
  onAction: (action: 'replace' | 'skip' | 'detach') => void;
}

export function ComponentDetailView({ component, instance, onBack, onAction }: Props) {
  const [newComponentKey, setNewComponentKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const { sendMessage } = usePluginMessage();
  const currentMapping = useStore(state => state.currentMappings.get(instance.id));
  const setMapping = useStore(state => state.setMapping);
  const previewData = useStore(state => state.previewData);
  const componentSearchResults = useStore(state => state.componentSearchResults);
  const getPendingInstances = useStore(state => state.getPendingInstances);

  // Calculate progress
  const pendingInstances = useMemo(() => getPendingInstances(), [getPendingInstances]);
  const currentIndex = pendingInstances.indexOf(instance.id);
  const totalPending = pendingInstances.length;

  // Convert thumbnail to base64 for display
  const thumbnailBase64 = useMemo(() => {
    if (!component.thumbnail) return null;
    return `data:image/png;base64,${btoa(String.fromCharCode(...component.thumbnail))}`;
  }, [component.thumbnail]);

  // Real-time component search
  useEffect(() => {
    if (searchQuery.length === 0) {
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(() => {
      sendMessage({ type: 'search-components', payload: { query: searchQuery } });
      setShowSearchResults(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, sendMessage]);

  // Debounced preview generation (300ms)
  useEffect(() => {
    if (!newComponentKey || !currentMapping) return;

    const timer = setTimeout(() => {
      setIsGeneratingPreview(true);
      sendMessage({
        type: 'preview-component',
        payload: {
          instanceId: instance.id,
          newComponentKey,
          propMapping: currentMapping
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [newComponentKey, currentMapping, instance.id, sendMessage]);

  // Clear loading state when preview data arrives
  useEffect(() => {
    if (previewData) {
      setIsGeneratingPreview(false);
    }
  }, [previewData]);

  const handleSelectComponent = (key: string, name: string) => {
    setNewComponentKey(key);
    setSearchQuery(name);
    setShowSearchResults(false);

    // Fetch properties for the selected component
    sendMessage({ type: 'get-component-properties', payload: { componentKey: key } });
  };

  const handleReplace = () => {
    if (!newComponentKey) {
      alert('Please select a new component first');
      return;
    }

    sendMessage({
      type: 'replace-component',
      payload: {
        instanceId: instance.id,
        newComponentKey,
        propMapping: currentMapping || {}
      }
    });

    onAction('replace');
  };

  const handleSkip = () => {
    onAction('skip');
  };

  const handleDetach = () => {
    if (confirm('Detaching this instance will convert it to a frame. The plugin will automatically re-scan for components inside. Continue?')) {
      sendMessage({
        type: 'detach-instance',
        payload: { instanceId: instance.id }
      });
      onAction('detach');
    }
  };

  return (
    <div className="detail-view">
      {/* Header with back button and progress */}
      <div className="detail-header">
        <button onClick={onBack} className="back-button">
          ← Back to List
        </button>
        <div className="progress-indicator">
          <span className="progress-text">
            {currentIndex + 1} of {totalPending}
          </span>
        </div>
      </div>

      {/* Body - Scrollable content */}
      <div className="detail-body">
        {/* Component info */}
        <div className="component-info">
          {thumbnailBase64 && (
            <img src={thumbnailBase64} alt={component.name} className="component-thumbnail-large" />
          )}
          <div className="component-details">
            <h2>{component.name}</h2>
            <p className="instance-name">{instance.name}</p>
          </div>
        </div>

        {/* Component search */}
        <div className="new-component-selector">
          <label>Replace with component:</label>
          <div className="component-search">
            <input
              type="text"
              placeholder="Search for component..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            />
            {showSearchResults && componentSearchResults.length > 0 && (
              <div className="search-results">
                {componentSearchResults.map(result => {
                  const resultThumbnail = result.thumbnail
                    ? `data:image/png;base64,${btoa(String.fromCharCode(...result.thumbnail))}`
                    : null;

                  return (
                    <div
                      key={result.key}
                      onClick={() => handleSelectComponent(result.key, result.name)}
                      className="search-result-item"
                    >
                      {resultThumbnail && (
                        <img src={resultThumbnail} alt={result.name} className="result-thumbnail" />
                      )}
                      <div className="result-info">
                        <span className="result-name">{result.name}</span>
                        <span className="result-library">{result.library}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <LivePreviewPanel
          previewData={previewData}
          isLoading={isGeneratingPreview}
        />

        {/* Property mapper */}
        <PropMapper
          oldProps={instance.properties}
          initialMapping={currentMapping}
          onMappingChange={(mapping) => setMapping(instance.id, mapping)}
        />
      </div>

      {/* Footer - Action buttons */}
      <div className="detail-footer">
        <button onClick={handleSkip} className="secondary">
          Skip
        </button>
        <button onClick={handleDetach} className="danger">
          Detach
        </button>
        <button onClick={handleReplace} className="primary">
          Replace & Next
        </button>
      </div>
    </div>
  );
}
