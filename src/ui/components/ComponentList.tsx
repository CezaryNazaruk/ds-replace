import React, { useMemo } from 'react';
import { useStore } from '../store';
import { usePluginMessage } from '../hooks/usePluginMessage';

export function ComponentList() {
  const components = useStore(state => state.components);
  const openDetailView = useStore(state => state.openDetailView);
  const replacedInstances = useStore(state => state.replacedInstances);
  const skippedInstances = useStore(state => state.skippedInstances);
  const { sendMessage } = usePluginMessage();

  // Convert thumbnails to base64
  const componentThumbnails = useMemo(() => {
    const map = new Map<string, string>();
    components.forEach(comp => {
      if (comp.thumbnail) {
        const base64 = `data:image/png;base64,${btoa(String.fromCharCode(...comp.thumbnail))}`;
        map.set(comp.key, base64);
      }
    });
    return map;
  }, [components]);

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
          <div className="component-group-header">
            {componentThumbnails.has(component.key) && (
              <img
                src={componentThumbnails.get(component.key)}
                alt={component.name}
                className="component-group-thumbnail"
              />
            )}
            <div className="component-group-info">
              <h3>{component.name}</h3>
              <p className="instance-count">
                {component.instances.length} instance{component.instances.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="instance-cards">
            {component.instances.map(instance => {
              const isReplaced = replacedInstances.has(instance.id);
              const isSkipped = skippedInstances.has(instance.id);

              return (
                <div
                  key={instance.id}
                  className={`instance-card ${isReplaced ? 'replaced' : ''} ${isSkipped ? 'skipped' : ''}`}
                  onClick={() => {
                    if (!isReplaced && !isSkipped) {
                      // Open detail view for pending instances
                      openDetailView(instance.id);
                    } else {
                      // Just navigate for processed instances (don't open detail view)
                      sendMessage({
                        type: 'focus-on-node',
                        payload: { nodeId: instance.id }
                      });
                    }
                  }}
                >
                  <div className="instance-name">{instance.name}</div>
                  {isReplaced && <span className="status-badge replaced">✓ Replaced</span>}
                  {isSkipped && <span className="status-badge skipped">Skipped</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
