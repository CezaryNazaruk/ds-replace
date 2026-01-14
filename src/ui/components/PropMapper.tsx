import React, { useState, useEffect, useMemo } from 'react';
import { ComponentProperty, PropMapping } from '../../shared/types/component.types';
import { ComponentPropertyDefinition } from '../../shared/types/messages.types';
import { useStore } from '../store';
import { Toggle } from './Toggle';
import { ComponentSearchInput } from './ComponentSearchInput';
import { sortPropertiesByVariant } from '../../shared/utils/variantUtils';

interface Props {
  oldProps: ComponentProperty[];
  initialMapping?: PropMapping;
  onMappingChange: (mapping: PropMapping) => void;
}

export function PropMapper({ oldProps, initialMapping, onMappingChange }: Props) {
  const [mapping, setMapping] = useState<PropMapping>(initialMapping || {});
  const componentProperties = useStore(state => state.componentProperties);
  const [lastPropertiesLength, setLastPropertiesLength] = useState(0);

  // Sort properties to put VARIANT at the top
  const sortedOldProps = useMemo(() => sortPropertiesByVariant(oldProps), [oldProps]);
  const sortedComponentProperties = useMemo(() => sortPropertiesByVariant(componentProperties), [componentProperties]);

  // Initialize mapping with default values when component properties first load
  useEffect(() => {
    if (componentProperties.length > 0 && componentProperties.length !== lastPropertiesLength) {
      const defaultMapping: PropMapping = {};
      componentProperties.forEach(prop => {
        defaultMapping[prop.name] = prop.defaultValue;
      });
      setMapping(defaultMapping);
      onMappingChange(defaultMapping);
      setLastPropertiesLength(componentProperties.length);
    }
  }, [componentProperties]);

  // Sync with initialMapping when it changes
  useEffect(() => {
    if (initialMapping && Object.keys(initialMapping).length > 0) {
      setMapping(initialMapping);
    }
  }, [initialMapping]);

  const updateMapping = (propName: string, value: any) => {
    const newMapping = {
      ...mapping,
      [propName]: value
    };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const renderInputForProperty = (prop: ComponentPropertyDefinition) => {
    const currentValue = mapping[prop.name] !== undefined ? mapping[prop.name] : prop.defaultValue;

    // VARIANT type - dropdown with options
    if (prop.type === 'VARIANT' && prop.variantOptions) {
      return (
        <select
          value={String(currentValue)}
          onChange={(e) => updateMapping(prop.name, e.target.value)}
        >
          <option value="">Select variant...</option>
          {prop.variantOptions.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    // BOOLEAN type - toggle switch
    if (prop.type === 'BOOLEAN') {
      return (
        <Toggle
          checked={currentValue === true}
          onChange={(checked) => updateMapping(prop.name, checked)}
        />
      );
    }

    // INSTANCE_SWAP - component search
    if (prop.type === 'INSTANCE_SWAP') {
      return (
        <ComponentSearchInput
          value={String(currentValue)}
          onChange={(key) => updateMapping(prop.name, key)}
          placeholder="Search for component..."
        />
      );
    }

    // TEXT property - text input
    return (
      <input
        type="text"
        value={String(currentValue)}
        onChange={(e) => updateMapping(prop.name, e.target.value)}
        placeholder="Value"
      />
    );
  };

  return (
    <div className="prop-configuration">
      <div className="prop-columns">
        {/* Old properties - Read-only reference */}
        <div className="prop-column old-props-column">
          <h4>Current properties</h4>
          {sortedOldProps.length > 0 ? (
            <div className="prop-list">
              {sortedOldProps.map(prop => (
                <div key={prop.name} className="prop-item">
                  <div className="prop-header">
                    <span className="prop-name">{prop.name}</span>
                    <span className="prop-type">{prop.type}</span>
                  </div>
                  <div className="prop-value">{String(prop.value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No properties</p>
          )}
        </div>

        {/* New properties - Configurable */}
        <div className="prop-column new-props-column">
          <h4>New properties</h4>
          {sortedComponentProperties.length === 0 ? (
            <p className="empty-state">Select a component to see its properties...</p>
          ) : (
            <div className="prop-list">
              {sortedComponentProperties.map(newProp => {
                // Detect nested property by dot in name
                const isNested = newProp.name.includes('.');
                const displayName = isNested ? newProp.name.split('.').pop() : newProp.name;

                return (
                  <div
                    key={newProp.name}
                    className={`prop-item ${isNested ? 'nested-prop' : ''}`}
                  >
                    <div className="prop-header">
                      {isNested && <span className="nested-indicator">↳ </span>}
                      <span className="prop-name">{displayName}</span>
                      <span className="prop-type">{newProp.type}</span>
                    </div>
                    <div className="prop-input">
                      {renderInputForProperty(newProp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
