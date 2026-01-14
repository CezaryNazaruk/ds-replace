import React, { useState, useEffect } from 'react';
import { usePluginMessage } from '../hooks/usePluginMessage';
import { ComponentSearchResult } from '../../shared/types/messages.types';
import { convertThumbnailToBase64 } from '../utils/imageUtils';

interface Props {
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
}

export function ComponentSearchInput({ value, onChange, placeholder = 'Search for component...' }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [localResults, setLocalResults] = useState<ComponentSearchResult[]>([]);
  const { sendMessage } = usePluginMessage();

  // Load all available components on mount (cached in parent)
  useEffect(() => {
    // Listen for all-components response
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (msg?.type === 'all-components-loaded') {
        setLocalResults(msg.payload.components);
      }
    };

    window.addEventListener('message', handleMessage);
    // Request all components once
    sendMessage({ type: 'get-all-components' });

    return () => window.removeEventListener('message', handleMessage);
  }, [sendMessage]);

  // Initialize search query from current value (resolve key to name)
  useEffect(() => {
    if (value && localResults.length > 0) {
      // Try to find the component name for this key
      const component = localResults.find(c => c.key === value);
      if (component && searchQuery !== component.name) {
        setSearchQuery(component.name);
      }
    }
  }, [value, localResults]); // Removed searchQuery from deps to allow re-initialization

  // Filter results locally
  const filteredResults = searchQuery.length >= 2
    ? localResults.filter(comp =>
        comp.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectComponent = (key: string, name: string) => {
    onChange(key);
    setSearchQuery(name);
    setShowResults(false);
  };

  return (
    <div className="component-search-input">
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowResults(e.target.value.length >= 2);
        }}
        onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
      />
      {showResults && filteredResults.length > 0 && (
        <div className="search-results">
          {filteredResults.map(result => {
            const thumbnail = convertThumbnailToBase64(result.thumbnail);

            return (
              <div
                key={result.key}
                onClick={() => handleSelectComponent(result.key, result.name)}
                className="search-result-item"
              >
                {thumbnail && (
                  <img src={thumbnail} alt={result.name} className="result-thumbnail" />
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
  );
}
