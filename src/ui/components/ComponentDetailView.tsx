import React, { useState, useEffect, useMemo } from 'react';
import { ComponentData, InstanceData, SavedMapping } from '../../shared/types/component.types';
import { usePluginMessage } from '../hooks/usePluginMessage';
import { useStore } from '../store';
import { PropMapper } from './PropMapper';
import { LivePreviewPanel } from './LivePreviewPanel';
import { convertThumbnailToBase64 } from '../utils/imageUtils';
import { getVariantValue, getComponentVariantKey } from '../../shared/utils/variantUtils';
import { SEARCH_CONFIG } from '../../shared/constants/config';
import { generateUniqueId } from '../../shared/utils/idUtils';

interface Props {
  component: ComponentData;
  instance: InstanceData;
  onBack: () => void;
  onAction: (action: 'replace' | 'skip' | 'detach') => void;
  onNext: () => void;
}

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
  const [isReplaced, setIsReplaced] = useState(false); // Track if instance was replaced

  // Reset component selection when navigating to a different instance
  useEffect(() => {
    const storedKey = getSelectedComponentKey(instance.id);
    setNewComponentKey(storedKey || '');
    setSearchQuery('');
    setIsReplaced(false); // Reset replaced state for new instance
  }, [instance.id, getSelectedComponentKey]);

  // Reset replaced state when mapping changes (user edits settings)
  useEffect(() => {
    if (isReplaced && currentMapping) {
      setIsReplaced(false);
    }
  }, [currentMapping]);

  // Load all available components on mount (only once, cached in store)
  useEffect(() => {
    if (allAvailableComponents.length === 0) {
      sendMessage({ type: 'get-all-components' });
    }
  }, []);

  // Filter components locally
  const componentSearchResults = useMemo(() => {
    if (searchQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return [];
    const query = searchQuery.toLowerCase();

    return allAvailableComponents
      .filter(comp => {
        // Exclude individual variants (keep only ComponentSets and standalone components)
        if (comp.isVariant) return false;

        // Match search query
        return comp.name.toLowerCase().includes(query);
      })
      .slice(0, SEARCH_CONFIG.MAX_RESULTS);
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
        const componentKey = previousMapping.newComponentKey;
        const propMapping = previousMapping.propMapping;

        // IMPORTANT: Fetch properties FIRST before state updates
        sendMessage({ type: 'get-component-properties', payload: { componentKey } });

        // Then update all state
        setNewComponentKey(componentKey);
        setSelectedComponentKey(instance.id, componentKey);
        setMapping(instance.id, propMapping);

        // Update search query to show the component name
        const newCompName = allAvailableComponents.find(c => c.key === componentKey)?.name;
        if (newCompName) {
          setSearchQuery(newCompName);
        }

        // CRITICAL: Trigger preview refresh
        setPreviewTrigger(prev => prev + 1);
      }
    }
  }, [component.name, instance.properties, savedMappings, newComponentKey, instance.id, allAvailableComponents]);

  // Calculate progress - show position among all instances
  const { allInstanceIds, currentPosition, totalCount } = useMemo(() => {
    const allIds: string[] = [];
    components.forEach(comp => {
      comp.instances.forEach(inst => {
        allIds.push(inst.id);
      });
    });
    const position = allIds.indexOf(instance.id);
    return {
      allInstanceIds: allIds,
      currentPosition: position >= 0 ? position + 1 : 1, // 1-based indexing
      totalCount: allIds.length
    };
  }, [components, instance.id]);

  // Convert thumbnail to base64 for display
  const thumbnailBase64 = useMemo(() => {
    return convertThumbnailToBase64(component.thumbnail);
  }, [component.thumbnail]);

  // Show/hide search results based on query
  useEffect(() => {
    setShowSearchResults(searchQuery.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH && componentSearchResults.length > 0);
  }, [searchQuery, componentSearchResults]);

  // Debounced preview generation - trigger on key or previewTrigger change
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
    }, SEARCH_CONFIG.DEBOUNCE_DELAY_MS);

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
      id: generateUniqueId(),
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

    // Show checkmark on button
    setIsReplaced(true);
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
            {currentPosition} of {totalCount}
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
              onFocus={() => searchQuery.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH && setShowSearchResults(true)}
            />
            {showSearchResults && componentSearchResults.length > 0 && (
              <div className="search-results">
                {componentSearchResults.map(result => {
                  const resultThumbnail = convertThumbnailToBase64(result.thumbnail);

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
        <button onClick={handleReplaceOnly} className={`primary ${isReplaced ? 'replaced-success' : ''}`}>
          {isReplaced ? '✓ Replaced' : 'Replace'}
        </button>
        <button onClick={handleNext} className="secondary">
          Next
        </button>
      </div>
    </div>
  );
}
