import React, { useState, useMemo, useEffect } from 'react';
import { ComponentData, InstanceData } from '../../shared/types/component.types';
import { usePluginMessage } from '../hooks/usePluginMessage';
import { useStore } from '../store';
import { PropMapper } from './PropMapper';

interface Props {
  component: ComponentData;
  instance: InstanceData;
}

export function ComponentItem({ component, instance }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComponentKey, setNewComponentKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { sendMessage } = usePluginMessage();
  const currentMapping = useStore(state => state.currentMappings.get(instance.id));
  const setMapping = useStore(state => state.setMapping);
  const skipInstance = useStore(state => state.skipInstance);
  const skippedInstances = useStore(state => state.skippedInstances);
  const replacedInstances = useStore(state => state.replacedInstances);
  const componentSearchResults = useStore(state => state.componentSearchResults);

  const isSkipped = skippedInstances.has(instance.id);
  const isReplaced = replacedInstances.has(instance.id);

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
  };

  const handleSkip = () => {
    skipInstance(instance.id);
  };

  const handleDetach = () => {
    if (confirm('Detaching this instance will convert it to a frame. The plugin will automatically re-scan for components inside. Continue?')) {
      sendMessage({
        type: 'detach-instance',
        payload: { instanceId: instance.id }
      });
    }
  };

  const handlePreview = () => {
    if (!newComponentKey) {
      alert('Please select a new component first');
      return;
    }

    sendMessage({
      type: 'preview-component',
      payload: {
        instanceId: instance.id,
        newComponentKey,
        propMapping: currentMapping || {}
      }
    });
  };

  if (isSkipped) {
    return (
      <div className="component-item skipped">
        <div className="item-header">
          <span>{component.name} - Skipped</span>
        </div>
      </div>
    );
  }

  if (isReplaced) {
    return (
      <div className="component-item replaced">
        <div className="item-header">
          <span>{component.name} - Replaced ✓</span>
        </div>
      </div>
    );
  }

  return (
    <div className="component-item">
      <div className="item-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-content">
          {thumbnailBase64 && (
            <img src={thumbnailBase64} alt={component.name} className="component-thumbnail" />
          )}
          <span>{component.name}</span>
        </div>
        <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>

      {isExpanded && (
        <div className="item-content">
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

          <PropMapper
            oldProps={instance.properties}
            initialMapping={currentMapping}
            onMappingChange={(mapping) => setMapping(instance.id, mapping)}
          />

          <div className="action-buttons">
            <button onClick={handlePreview}>Preview</button>
            <button onClick={handleReplace} className="primary">Replace</button>
            <button onClick={handleSkip} className="secondary">Skip</button>
            <button onClick={handleDetach} className="danger">Detach</button>
          </div>
        </div>
      )}
    </div>
  );
}
