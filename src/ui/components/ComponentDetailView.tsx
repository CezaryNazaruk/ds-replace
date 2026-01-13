import React, { useState, useEffect, useMemo } from 'react';
import { ComponentData, InstanceData, SavedMapping } from '../../shared/types/component.types';
import { usePluginMessage } from '../hooks/usePluginMessage';
import { useStore } from '../store';
import { PropMapper } from './PropMapper';
import { LivePreviewPanel } from './LivePreviewPanel';

interface Props {
  component: ComponentData;
  instance: InstanceData;
  onBack: () => void;
  onAction: (action: 'replace' | 'skip' | 'detach') => void;
  onNext: () => void;
}

// Helper to extract variant value from instance
const getVariantValue = (instance: InstanceData): string | undefined => {
  const variantProp = instance.properties.find(p => p.type === 'VARIANT');
  return variantProp?.value;
};

// Create composite key for matching
const getComponentVariantKey = (componentName: string, variant?: string): string => {
  return variant ? `${componentName}/${variant}` : componentName;
};

export function ComponentDetailView({ component, instance, onBack, onAction, onNext }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const { sendMessage } = usePluginMessage();
  const currentMapping = useStore(state => state.currentMappings.get(instance.id));
  const setMapping = useStore(state => state.setMapping);
  const previewData = useStore(state => state.previewData);
  const allAvailableComponents = useStore(state => state.allAvailableComponents);
  const components = useStore(state => state.components);
  const replacedInstances = useStore(state => state.replacedInstances);
  const skippedInstances = useStore(state => state.skippedInstances);
  const setSelectedComponentKey = useStore(state => state.setSelectedComponentKey);
  const getSelectedComponentKey = useStore(state => state.getSelectedComponentKey);
  const savedMappings = useStore(state => state.savedMappings);

  // Initialize from store
  const [newComponentKey, setNewComponentKey] = useState(() =>
    getSelectedComponentKey(instance.id) || ''
  );
  const [previewTrigger, setPreviewTrigger] = useState(0); // Force preview regeneration

  // Load all available components on mount (only once, cached in store)
  useEffect(() => {
    if (allAvailableComponents.length === 0) {
      sendMessage({ type: 'get-all-components' });
    }
  }, []);

  // Filter components locally
  const componentSearchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return allAvailableComponents.filter(comp =>
      comp.name.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [searchQuery, allAvailableComponents]);

  // Initialize mapping when navigating to instance with persisted key
  useEffect(() => {
    if (newComponentKey && !currentMapping) {
      setMapping(instance.id, {});
    }
  }, [newComponentKey, currentMapping, instance.id, setMapping]);

  // Auto-suggest mapping based on component name + variant
  useEffect(() => {
    // Only auto-suggest if no component selected yet
    if (!newComponentKey && savedMappings.length > 0) {
      const variantValue = getVariantValue(instance);
      const compositeKey = getComponentVariantKey(component.name, variantValue);

      // Find previous mapping for this component+variant combo
      const previousMapping = savedMappings.find(m => {
        const prevCompositeKey = getComponentVariantKey(
          m.oldComponentName,
          m.oldComponentVariant
        );
        return prevCompositeKey === compositeKey;
      });

      if (previousMapping) {
        // Auto-populate
        setNewComponentKey(previousMapping.newComponentKey);
        setSelectedComponentKey(instance.id, previousMapping.newComponentKey);
        setMapping(instance.id, previousMapping.propMapping);

        // Also set search query to show the component name
        const newCompName = allAvailableComponents.find(
          c => c.key === previousMapping.newComponentKey
        )?.name;
        if (newCompName) {
          setSearchQuery(newCompName);
        }

        // IMPORTANT: Fetch properties for the auto-suggested component
        sendMessage({ type: 'get-component-properties', payload: { componentKey: previousMapping.newComponentKey } });

        console.log(`[AUTO-SUGGEST] ${compositeKey} → ${previousMapping.newComponentName}`);
      }
    }
  }, [component.name, instance.properties, savedMappings, newComponentKey, instance.id, allAvailableComponents]);

  // Calculate progress - directly subscribe to store state for reactivity
  const pendingInstances = useMemo(() => {
    const allInstances: string[] = [];
    components.forEach(comp => {
      comp.instances.forEach(inst => {
        allInstances.push(inst.id);
      });
    });
    return allInstances.filter(id =>
      !replacedInstances.has(id) && !skippedInstances.has(id)
    );
  }, [components, replacedInstances, skippedInstances]);

  const currentIndex = pendingInstances.indexOf(instance.id);
  const totalPending = pendingInstances.length;

  // Convert thumbnail to base64 for display
  const thumbnailBase64 = useMemo(() => {
    if (!component.thumbnail) return null;
    return `data:image/png;base64,${btoa(String.fromCharCode(...component.thumbnail))}`;
  }, [component.thumbnail]);

  // Show/hide search results based on query
  useEffect(() => {
    setShowSearchResults(searchQuery.length >= 2 && componentSearchResults.length > 0);
  }, [searchQuery, componentSearchResults]);

  // Debounced preview generation (300ms) - trigger on key or previewTrigger change
  useEffect(() => {
    if (!newComponentKey) return;

    const timer = setTimeout(() => {
      setIsGeneratingPreview(true);
      sendMessage({
        type: 'preview-component',
        payload: {
          instanceId: instance.id,
          newComponentKey,
          propMapping: currentMapping || {}
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [newComponentKey, currentMapping, instance.id, sendMessage, previewTrigger]);

  // Clear loading state when preview data arrives
  useEffect(() => {
    if (previewData) {
      setIsGeneratingPreview(false);
    }
  }, [previewData]);

  const handleSelectComponent = (key: string, name: string) => {
    setNewComponentKey(key);
    setSelectedComponentKey(instance.id, key); // Save to store
    setSearchQuery(name);
    setShowSearchResults(false);
    setPreviewTrigger(prev => prev + 1); // Force preview regeneration

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

  const handleReplaceOnly = () => {
    if (!newComponentKey) {
      alert('Please select a new component first');
      return;
    }

    // Auto-save mapping with variant context
    const variantValue = getVariantValue(instance);
    const newCompName = allAvailableComponents.find(
      c => c.key === newComponentKey
    )?.name || 'Unknown';

    const mapping: SavedMapping = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${component.name}${variantValue ? `/${variantValue}` : ''} → ${newCompName}`,
      oldComponentKey: component.key,
      oldComponentName: component.name,
      oldComponentVariant: variantValue,
      newComponentKey,
      newComponentName: newCompName,
      propMapping: currentMapping || {},
      createdAt: Date.now()
    };

    // Save to plugin data
    sendMessage({
      type: 'save-mapping',
      payload: { mapping }
    });

    // Continue with replacement
    sendMessage({
      type: 'replace-component',
      payload: {
        instanceId: instance.id,
        newComponentKey,
        propMapping: currentMapping || {}
      }
    });

    // Don't navigate, just mark as replaced
    const markAsReplaced = useStore.getState().markAsReplaced;
    markAsReplaced(instance.id);
  };

  const handleNext = () => {
    onNext();
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
        <button onClick={handleReplaceOnly} className="primary">
          Replace
        </button>
        <button onClick={handleNext} className="secondary">
          Next
        </button>
      </div>
    </div>
  );
}
