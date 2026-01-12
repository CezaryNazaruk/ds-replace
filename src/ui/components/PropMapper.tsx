import React, { useState } from 'react';
import { ComponentProperty, PropMapping } from '../../shared/types/component.types';
import { useStore } from '../store';

interface Props {
  oldProps: ComponentProperty[];
  onMappingChange: (mapping: PropMapping) => void;
}

export function PropMapper({ oldProps, onMappingChange }: Props) {
  const [mapping, setMapping] = useState<PropMapping>({});
  const componentProperties = useStore(state => state.componentProperties);

  const handlePropMap = (oldPropName: string, newPropName: string, value: any) => {
    const newMapping = {
      ...mapping,
      [oldPropName]: { newPropName, value }
    };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  // Get the property definition for the selected new property
  const getPropertyDefinition = (newPropName: string) => {
    return componentProperties.find(prop => prop.name === newPropName);
  };

  if (oldProps.length === 0) {
    return (
      <div className="prop-mapper">
        <p style={{ fontSize: '13px', color: '#666' }}>No properties to map</p>
      </div>
    );
  }

  return (
    <div className="prop-mapper">
      <h4>Property Mapping</h4>
      <div className="prop-mapping-table">
        <div className="table-header">
          <span>Old Property</span>
          <span>New Property</span>
          <span>Value</span>
        </div>
        {oldProps.map(prop => (
          <div key={prop.name} className="prop-row">
            <div>{prop.name} ({prop.type})</div>
            {componentProperties.length > 0 ? (
              <select
                value={mapping[prop.name]?.newPropName || ''}
                onChange={(e) => handlePropMap(prop.name, e.target.value, mapping[prop.name]?.value || prop.value)}
              >
                <option value="">Select property...</option>
                {componentProperties.map(newProp => (
                  <option key={newProp.name} value={newProp.name}>
                    {newProp.name} ({newProp.type})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Select component first"
                value={mapping[prop.name]?.newPropName || ''}
                onChange={(e) => handlePropMap(prop.name, e.target.value, mapping[prop.name]?.value || prop.value)}
                disabled
              />
            )}
            {(() => {
              const newPropName = mapping[prop.name]?.newPropName || '';
              const propDef = getPropertyDefinition(newPropName);
              const currentValue = mapping[prop.name]?.value !== undefined ? mapping[prop.name].value : prop.value;

              if (!newPropName) {
                return (
                  <input
                    type="text"
                    placeholder="Select property first"
                    value={String(currentValue)}
                    disabled
                  />
                );
              }

              // Variant property - use dropdown
              if (propDef?.type === 'VARIANT' && propDef.variantOptions) {
                return (
                  <select
                    value={String(currentValue)}
                    onChange={(e) => handlePropMap(prop.name, newPropName, e.target.value)}
                  >
                    <option value="">Select variant...</option>
                    {propDef.variantOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                );
              }

              // Boolean property - use toggle
              if (propDef?.type === 'BOOLEAN') {
                return (
                  <select
                    value={String(currentValue)}
                    onChange={(e) => handlePropMap(prop.name, newPropName, e.target.value === 'true')}
                  >
                    <option value="true">On</option>
                    <option value="false">Off</option>
                  </select>
                );
              }

              // Instance swap - use text input (component key)
              if (propDef?.type === 'INSTANCE_SWAP') {
                return (
                  <input
                    type="text"
                    placeholder="Component key to swap"
                    value={String(currentValue)}
                    onChange={(e) => handlePropMap(prop.name, newPropName, e.target.value)}
                  />
                );
              }

              // Text property - use text input
              return (
                <input
                  type="text"
                  placeholder="Value"
                  value={String(currentValue)}
                  onChange={(e) => handlePropMap(prop.name, newPropName, e.target.value)}
                />
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
