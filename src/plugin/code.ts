import { ComponentDiscoveryService } from './services/ComponentDiscoveryService';
import { ComponentReplacementService } from './services/ComponentReplacementService';
import { TextNodeService } from './services/TextNodeService';
import { StorageService } from './services/StorageService';
import { PreviewService } from './services/PreviewService';

// Initialize services
const discoveryService = new ComponentDiscoveryService();
const replacementService = new ComponentReplacementService();
const textService = new TextNodeService();
const storageService = new StorageService();
const previewService = new PreviewService();

// Show UI
figma.showUI(__html__, { width: 800, height: 800 });

// Auto-discover if selection exists
(async () => {
  if (figma.currentPage.selection.length > 0) {
    const selection = figma.currentPage.selection;

    // Run discovery automatically (same as 'discover-components' handler)
    const components = await discoveryService.discoverComponents(selection, false);
    const textGroups = textService.discoverTextNodes(selection);

    figma.ui.postMessage({
      type: 'components-discovered',
      payload: { components, clearExisting: true }
    });
    figma.ui.postMessage({
      type: 'text-nodes-grouped',
      payload: { groups: textGroups, clearExisting: true }
    });
  }
})();

// Message handler
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'discover-components': {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
          figma.ui.postMessage({
            type: 'error',
            payload: { message: 'Please select at least one layer' }
          });
          return;
        }

        // Clear existing by default (true), unless explicitly set to false
        const clearExisting = msg.payload?.clearExisting ?? true;

        // Initial discovery: ONLY top-level components (includeNested=false)
        const components = await discoveryService.discoverComponents(selection, false);
        const textGroups = textService.discoverTextNodes(selection);

        figma.ui.postMessage({
          type: 'components-discovered',
          payload: { components, clearExisting }
        });
        figma.ui.postMessage({
          type: 'text-nodes-grouped',
          payload: { groups: textGroups, clearExisting }
        });
        break;
      }

      case 'replace-component': {
        const { instanceId, newComponentKey, propMapping } = msg.payload;
        await replacementService.replaceComponent(instanceId, newComponentKey, propMapping);
        figma.ui.postMessage({
          type: 'component-replaced',
          payload: { instanceId }
        });
        break;
      }

      case 'detach-instance': {
        const { instanceId } = msg.payload;

        // Detach the instance
        const detachedNode = replacementService.detachInstance(instanceId);

        // Automatically re-scan the detached node for components and text
        // After detach: Include ALL components (nested or not, includeNested=true)
        const components = await discoveryService.discoverComponents([detachedNode], true);
        const textGroups = textService.discoverTextNodes([detachedNode]);

        // Send all updates to UI (clearExisting=false to ADD to existing data)
        figma.ui.postMessage({
          type: 'instance-detached',
          payload: { instanceId }
        });
        figma.ui.postMessage({
          type: 'components-discovered',
          payload: { components, clearExisting: false }
        });
        figma.ui.postMessage({
          type: 'text-nodes-grouped',
          payload: { groups: textGroups, clearExisting: false }
        });
        break;
      }

      case 'save-mapping': {
        const { mapping } = msg.payload;
        await storageService.saveMapping(mapping);
        break;
      }

      case 'load-mappings': {
        const mappings = await storageService.loadMappings();
        figma.ui.postMessage({
          type: 'mappings-loaded',
          payload: { mappings }
        });
        break;
      }

      case 'apply-text-style': {
        const { nodeIds, styleId } = msg.payload;
        await textService.applyTextStyle(nodeIds, styleId);
        break;
      }

      case 'preview-component': {
        const { instanceId, newComponentKey, propMapping } = msg.payload;
        const preview = await previewService.generatePreview(
          instanceId,
          newComponentKey,
          propMapping
        );
        figma.ui.postMessage({
          type: 'preview-ready',
          payload: { preview }
        });
        break;
      }

      case 'search-components': {
        const { query } = msg.payload;
        const queryLower = query.toLowerCase();
        const results = [];

        // Search local components
        const localComponents = figma.root.findAllWithCriteria({
          types: ['COMPONENT', 'COMPONENT_SET']
        }) as (ComponentNode | ComponentSetNode)[];

        for (const comp of localComponents) {
          if (!comp.name.toLowerCase().includes(queryLower)) continue;

          let displayName = comp.name;
          let componentKey = comp.key;

          // For variants, use ComponentSet name
          if (comp.type === 'COMPONENT' && comp.parent?.type === 'COMPONENT_SET') {
            displayName = comp.parent.name;
          }

          results.push({
            id: comp.id,
            name: displayName,
            key: componentKey,
            library: 'Local',
            thumbnail: await comp.exportAsync({
              format: 'PNG',
              constraint: { type: 'SCALE', value: 0.3 }
            })
          });
        }

        // Search library components
        const libraryComponents = await figma.teamLibrary.getAvailableLibraryComponentsAsync();

        for (const libComp of libraryComponents) {
          if (!libComp.name.toLowerCase().includes(queryLower)) continue;

          // Import temporarily to get thumbnail
          const imported = await figma.importComponentByKeyAsync(libComp.key);
          const thumbnail = await imported.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 0.3 }
          });
          imported.remove(); // Clean up the temporary import

          results.push({
            id: libComp.key,
            name: libComp.name,
            key: libComp.key,
            library: libComp.libraryName,
            thumbnail
          });
        }

        // Limit to 20 results
        const limitedResults = results.slice(0, 20);

        figma.ui.postMessage({
          type: 'components-search-results',
          payload: { results: limitedResults }
        });
        break;
      }

      case 'get-component-properties': {
        const { componentKey } = msg.payload;

        // Try to find locally first (check both COMPONENT and COMPONENT_SET)
        let component = figma.root.findOne(
          node => (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
                  ('key' in node) && node.key === componentKey
        ) as ComponentNode | ComponentSetNode | null;

        // If not found locally, try to import from library
        if (!component) {
          try {
            component = await figma.importComponentByKeyAsync(componentKey);
          } catch (e) {
            figma.ui.postMessage({ type: 'error', payload: { message: 'Component not found' } });
            return;
          }
        }

        // Get properties
        let properties = [];
        if (component.type === 'COMPONENT') {
          properties = Object.entries(component.componentPropertyDefinitions || {}).map(([name, def]) => ({
            name,
            type: def.type,
            defaultValue: def.defaultValue,
            variantOptions: def.type === 'VARIANT' ? def.variantOptions : undefined
          }));
        } else if (component.type === 'COMPONENT_SET') {
          // For component sets, get properties from the first variant
          const firstVariant = component.children[0] as ComponentNode;
          if (firstVariant && firstVariant.type === 'COMPONENT') {
            properties = Object.entries(firstVariant.componentPropertyDefinitions || {}).map(([name, def]) => ({
              name,
              type: def.type,
              defaultValue: def.defaultValue,
              variantOptions: def.type === 'VARIANT' ? def.variantOptions : undefined
            }));
          }
        }

        figma.ui.postMessage({
          type: 'component-properties-fetched',
          payload: { properties }
        });
        break;
      }

      case 'get-text-styles': {
        // Get both local and library text styles
        const localStyles = figma.getLocalTextStyles();
        const teamLibraryStyles = await figma.teamLibrary.getAvailableLibraryTextStylesAsync();

        // Map local styles
        const localStylesData = localStyles.map(style => ({
          id: style.id,
          name: style.name,
          fontFamily: style.fontName.family,
          fontSize: style.fontSize as number,
          library: 'Local'
        }));

        // Map library styles
        const libraryStylesData = teamLibraryStyles.map(libStyle => ({
          id: libStyle.key,
          name: libStyle.name,
          fontFamily: 'Library Style',
          fontSize: 0,
          library: libStyle.libraryName
        }));

        const styles = [...localStylesData, ...libraryStylesData];

        figma.ui.postMessage({
          type: 'text-styles-fetched',
          payload: { styles }
        });
        break;
      }
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'An unknown error occurred' }
    });
  }
};
