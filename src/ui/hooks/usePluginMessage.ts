import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

export function usePluginMessage() {
  const setComponents = useStore(state => state.setComponents);
  const addComponents = useStore(state => state.addComponents);
  const removeInstance = useStore(state => state.removeInstance);
  const setTextGroups = useStore(state => state.setTextGroups);
  const addTextGroups = useStore(state => state.addTextGroups);
  const setSavedMappings = useStore(state => state.setSavedMappings);
  const setPreviewData = useStore(state => state.setPreviewData);
  const setLoading = useStore(state => state.setLoading);
  const markAsReplaced = useStore(state => state.markAsReplaced);
  const setComponentSearchResults = useStore(state => state.setComponentSearchResults);
  const setComponentProperties = useStore(state => state.setComponentProperties);
  const setTextStyles = useStore(state => state.setTextStyles);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;

      switch (msg.type) {
        case 'components-discovered':
          // Check clearExisting flag: true = replace all, false = add to existing
          if (msg.payload.clearExisting) {
            setComponents(msg.payload.components);
          } else {
            addComponents(msg.payload.components);
          }
          setLoading(false);
          break;

        case 'text-nodes-grouped':
          // Check clearExisting flag: true = replace all, false = add to existing
          if (msg.payload.clearExisting) {
            setTextGroups(msg.payload.groups);
          } else {
            addTextGroups(msg.payload.groups);
          }
          break;

        case 'component-replaced':
          markAsReplaced(msg.payload.instanceId);
          break;

        case 'instance-detached':
          // Remove the detached instance from the component list
          removeInstance(msg.payload.instanceId);
          break;

        case 'mappings-loaded':
          setSavedMappings(msg.payload.mappings);
          break;

        case 'preview-ready':
          setPreviewData(msg.payload.preview);
          break;

        case 'components-search-results':
          setComponentSearchResults(msg.payload.results);
          break;

        case 'component-properties-fetched':
          setComponentProperties(msg.payload.properties);
          break;

        case 'text-styles-fetched':
          setTextStyles(msg.payload.styles);
          break;

        case 'error':
          console.error('Plugin error:', msg.payload.message);
          alert(msg.payload.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    setComponents,
    addComponents,
    removeInstance,
    setTextGroups,
    addTextGroups,
    setSavedMappings,
    setPreviewData,
    setLoading,
    markAsReplaced,
    setComponentSearchResults,
    setComponentProperties,
    setTextStyles
  ]);

  const sendMessage = useCallback((message: any) => {
    parent.postMessage({ pluginMessage: message }, '*');
  }, []);

  return { sendMessage };
}
