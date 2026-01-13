import React, { useEffect } from 'react';
import { useStore } from './store';
import { usePluginMessage } from './hooks/usePluginMessage';
import { ComponentList } from './components/ComponentList';
import { TextStyleManager } from './components/TextStyleManager';
import { SavedMappings } from './components/SavedMappings';
import { ComponentDetailView } from './components/ComponentDetailView';

export function App() {
  const activeTab = useStore(state => state.activeTab);
  const setActiveTab = useStore(state => state.setActiveTab);
  const isLoading = useStore(state => state.isLoading);
  const setLoading = useStore(state => state.setLoading);
  const viewMode = useStore(state => state.viewMode);
  const selectedInstanceId = useStore(state => state.selectedInstanceId);
  const components = useStore(state => state.components);
  const closeDetailView = useStore(state => state.closeDetailView);
  const navigateToNext = useStore(state => state.navigateToNext);
  const skipInstance = useStore(state => state.skipInstance);
  const markAsReplaced = useStore(state => state.markAsReplaced);
  const removeInstance = useStore(state => state.removeInstance);
  const { sendMessage } = usePluginMessage();

  useEffect(() => {
    // Load saved mappings on mount
    sendMessage({ type: 'load-mappings' });
  }, []);

  const handleDiscover = () => {
    setLoading(true);
    sendMessage({ type: 'discover-components', payload: { clearExisting: true } });
  };

  // Find current component and instance for detail view
  const currentComponentAndInstance = (() => {
    if (!selectedInstanceId) return null;

    for (const comp of components) {
      const instance = comp.instances.find(inst => inst.id === selectedInstanceId);
      if (instance) {
        return { component: comp, instance };
      }
    }
    return null;
  })();

  // Handle actions from detail view with auto-navigation
  const handleAction = (action: 'replace' | 'skip' | 'detach') => {
    if (!selectedInstanceId) return;

    if (action === 'replace') {
      markAsReplaced(selectedInstanceId);
    } else if (action === 'skip') {
      skipInstance(selectedInstanceId);
    } else if (action === 'detach') {
      removeInstance(selectedInstanceId);
    }

    // Navigate to next pending instance or close detail view if done
    navigateToNext();
  };

  // Render detail view or list view based on viewMode
  if (viewMode === 'detail' && currentComponentAndInstance) {
    return (
      <div className="app">
        <ComponentDetailView
          component={currentComponentAndInstance.component}
          instance={currentComponentAndInstance.instance}
          onBack={closeDetailView}
          onAction={handleAction}
        />
      </div>
    );
  }

  // List view (default)
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
