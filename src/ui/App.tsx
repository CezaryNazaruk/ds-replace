import React, { useEffect } from 'react';
import { useStore } from './store';
import { usePluginMessage } from './hooks/usePluginMessage';
import { ComponentList } from './components/ComponentList';
import { TextStyleManager } from './components/TextStyleManager';
import { SavedMappings } from './components/SavedMappings';

export function App() {
  const activeTab = useStore(state => state.activeTab);
  const setActiveTab = useStore(state => state.setActiveTab);
  const isLoading = useStore(state => state.isLoading);
  const setLoading = useStore(state => state.setLoading);
  const { sendMessage } = usePluginMessage();

  useEffect(() => {
    // Load saved mappings on mount
    sendMessage({ type: 'load-mappings' });
  }, []);

  const handleDiscover = () => {
    setLoading(true);
    sendMessage({ type: 'discover-components', payload: { clearExisting: true } });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>DS Component Replacer</h1>
        <button onClick={handleDiscover} disabled={isLoading}>
          {isLoading ? 'Discovering...' : 'Discover Components'}
        </button>
      </header>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          Components
        </div>
        <div
          className={`tab ${activeTab === 'text-styles' ? 'active' : ''}`}
          onClick={() => setActiveTab('text-styles')}
        >
          Text Styles
        </div>
        <div
          className={`tab ${activeTab === 'saved-mappings' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved-mappings')}
        >
          Saved Mappings
        </div>
      </div>

      <main className="main-content">
        {activeTab === 'components' && <ComponentList />}
        {activeTab === 'text-styles' && <TextStyleManager />}
        {activeTab === 'saved-mappings' && <SavedMappings />}
      </main>
    </div>
  );
}
