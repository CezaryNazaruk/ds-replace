import React from 'react';
import { useStore } from '../store';
import { ComponentItem } from './ComponentItem';

export function ComponentList() {
  const components = useStore(state => state.components);

  if (components.length === 0) {
    return (
      <div className="empty-state">
        <p>No components found. Select layers and click "Discover Components".</p>
      </div>
    );
  }

  return (
    <div className="component-list">
      {components.map(component => (
        <div key={component.key} className="component-group">
          <h3>{component.name}</h3>
          <p className="instance-count">{component.instances.length} instance{component.instances.length !== 1 ? 's' : ''}</p>

          {component.instances.map(instance => (
            <ComponentItem
              key={instance.id}
              component={component}
              instance={instance}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
