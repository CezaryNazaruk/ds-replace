import React from 'react';
import { useStore } from '../store';

export function SavedMappings() {
  const savedMappings = useStore(state => state.savedMappings);

  if (savedMappings.length === 0) {
    return (
      <div className="empty-state">
        <p>No saved mappings yet.</p>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          Create a property mapping and save it for reuse.
        </p>
      </div>
    );
  }

  return (
    <div className="saved-mappings">
      <h2 style={{ fontSize: '14px', marginBottom: '12px' }}>Saved Mappings Library</h2>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
        Reuse these mappings for similar component replacements.
      </p>

      <div className="mappings-list">
        {savedMappings.map(mapping => (
          <div key={mapping.id} className="component-item" style={{ marginBottom: '12px' }}>
            <div className="item-content">
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                {mapping.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {mapping.oldComponentKey} → {mapping.newComponentKey}
              </div>
              <div style={{ fontSize: '11px', color: '#999' }}>
                {Object.keys(mapping.propMapping).length} property mapping{Object.keys(mapping.propMapping).length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                Created: {new Date(mapping.createdAt).toLocaleDateString()}
              </div>

              <div style={{ marginTop: '12px' }}>
                <button className="primary" disabled>
                  Use Mapping (Coming soon)
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
