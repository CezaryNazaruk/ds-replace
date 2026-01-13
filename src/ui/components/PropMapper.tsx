import React, { useState, useEffect } from 'react';
import { ComponentProperty, PropMapping } from '../../shared/types/component.types';
import { useStore } from '../store';

interface Props {
  oldProps: ComponentProperty[];
  initialMapping?: PropMapping;
  onMappingChange: (mapping: PropMapping) => void;
}

export function PropMapper({ oldProps, initialMapping, onMappingChange }: Props) {
  const [mapping, setMapping] = useState<PropMapping>(initialMapping || {});
  const componentProperties = useStore(state => state.componentProperties);
  const [lastPropertiesLength, setLastPropertiesLength] = useState(0);

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

  const renderInputForProperty = (prop: any) => {
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

    // BOOLEAN type - dropdown On/Off
    if (prop.type === 'BOOLEAN') {
      return (
        <select
          value={String(currentValue)}
          onChange={(e) => updateMapping(prop.name, e.target.value === 'true')}
        >
          <option value="true">On</option>
          <option value="false">Off</option>
        </select>
      );
    }

    // INSTANCE_SWAP - text input for component key
    if (prop.type === 'INSTANCE_SWAP') {
      return (
        <input
          type="text"
          value={String(currentValue)}
          onChange={(e) => updateMapping(prop.name, e.target.value)}
          placeholder="Component key"
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
      {/* Old properties - Read-only reference */}
      {oldProps.length > 0 && (
        <div className="old-props-reference">
          <h4>Current Instance Properties (Reference)</h4>
          <div className="prop-list">
            {oldProps.map(prop => (
              <div key={prop.name} className="prop-reference-item">
                <span className="prop-name">{prop.name}:</span>
                <span className="prop-value">{String(prop.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New properties - Configurable */}
      <div className="new-props-config">
        <h4>New Component Properties</h4>
        {componentProperties.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#666' }}>Select a component to see its properties...</p>
        ) : (
          <div className="prop-inputs">
            {componentProperties.map(newProp => (
              <div key={newProp.name} className="prop-input-row">
                <label>{newProp.name} ({newProp.type})</label>
                {renderInputForProperty(newProp)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
