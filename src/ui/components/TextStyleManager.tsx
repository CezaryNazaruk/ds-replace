import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { usePluginMessage } from '../hooks/usePluginMessage';

export function TextStyleManager() {
  const textGroups = useStore(state => state.textGroups);
  const textStyles = useStore(state => state.textStyles);
  const { sendMessage } = usePluginMessage();
  const [selectedStyles, setSelectedStyles] = useState<Map<string, string>>(new Map());

  // Load text styles on mount
  useEffect(() => {
    sendMessage({ type: 'get-text-styles' });
  }, [sendMessage]);

  const handleApplyStyle = (groupId: string) => {
    const styleId = selectedStyles.get(groupId);
    if (!styleId) {
      alert('Please enter a style ID');
      return;
    }

    const group = textGroups.find(g => g.id === groupId);
    if (!group) return;

    sendMessage({
      type: 'apply-text-style',
      payload: {
        nodeIds: group.nodeIds,
        styleId
      }
    });

    alert(`Applied style to ${group.count} text nodes`);
  };

  const updateStyleId = (groupId: string, styleId: string) => {
    const newMap = new Map(selectedStyles);
    newMap.set(groupId, styleId);
    setSelectedStyles(newMap);
  };

  if (textGroups.length === 0) {
    return (
      <div className="empty-state">
        <p>No text nodes found outside of components.</p>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          Select layers and click "Discover Components" to find text.
        </p>
      </div>
    );
  }

  return (
    <div className="text-style-manager">
      <h2 style={{ fontSize: '14px', marginBottom: '12px' }}>Text Style Groups</h2>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
        Text nodes grouped by style and color. Apply new styles in bulk to each group.
      </p>

      <div className="text-groups-list">
        {textGroups.map(group => (
          <div key={group.id} className="component-item" style={{ marginBottom: '12px' }}>
            <div className="item-content">
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {group.styleName}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {group.count} text node{group.count !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
                  "{group.sampleText}"
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                  Color: rgba({Math.round(group.color.r * 255)}, {Math.round(group.color.g * 255)}, {Math.round(group.color.b * 255)}, {group.color.a})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={selectedStyles.get(group.id) || ''}
                  onChange={(e) => updateStyleId(group.id, e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select new text style...</option>
                  {textStyles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.name} {style.library !== 'Local' && `[${style.library}]`} ({style.fontFamily}{style.fontSize > 0 ? `, ${style.fontSize}px` : ''})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleApplyStyle(group.id)}
                  className="primary"
                  disabled={!selectedStyles.get(group.id)}
                >
                  Apply to {group.count} node{group.count !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
