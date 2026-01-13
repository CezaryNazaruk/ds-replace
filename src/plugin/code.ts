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
figma.showUI(__html__, { width: 800, height: 900 });

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

      case 'get-all-components': {
        // Fetch all components once for client-side filtering
        const allResults = [];
        const processedKeys = new Set<string>();

        const localComponents = figma.root.findAllWithCriteria({
          types: ['COMPONENT', 'COMPONENT_SET']
        }) as (ComponentNode | ComponentSetNode)[];

        for (const comp of localComponents) {
          let targetComponent = comp;
          let displayName = comp.name;
          let componentKey = comp.key;

          // For variants, use the parent ComponentSet instead
          if (comp.type === 'COMPONENT' && comp.parent?.type === 'COMPONENT_SET') {
            targetComponent = comp.parent;
            displayName = comp.parent.name;
            componentKey = comp.parent.key;
          }

          // Skip if we already processed this ComponentSet
          if (processedKeys.has(componentKey)) continue;
          processedKeys.add(componentKey);

          allResults.push({
            id: targetComponent.id,
            name: displayName,
            key: componentKey,
            library: 'Local',
            thumbnail: await targetComponent.exportAsync({
              format: 'PNG',
              constraint: { type: 'SCALE', value: 0.3 }
            })
          });
        }

        figma.ui.postMessage({
          type: 'all-components-loaded',
          payload: { components: allResults }
        });
        break;
      }

      case 'search-components': {
        const { query } = msg.payload;
        const queryLower = query.toLowerCase();
        const results = [];
        const processedKeys = new Set<string>();

        // Search local components
        const localComponents = figma.root.findAllWithCriteria({
          types: ['COMPONENT', 'COMPONENT_SET']
        }) as (ComponentNode | ComponentSetNode)[];

        for (const comp of localComponents) {
          let targetComponent = comp;
          let displayName = comp.name;
          let componentKey = comp.key;

          // For variants, use the parent ComponentSet instead
          if (comp.type === 'COMPONENT' && comp.parent?.type === 'COMPONENT_SET') {
            targetComponent = comp.parent;
            displayName = comp.parent.name;
            componentKey = comp.parent.key;
          }

          // Skip if we already processed this ComponentSet
          if (processedKeys.has(componentKey)) continue;
          processedKeys.add(componentKey);

          // Check if name matches query
          if (!displayName.toLowerCase().includes(queryLower)) continue;

          results.push({
            id: targetComponent.id,
            name: displayName,
            key: componentKey,
            library: 'Local',
            thumbnail: await targetComponent.exportAsync({
              format: 'PNG',
              constraint: { type: 'SCALE', value: 0.3 }
            })
          });
        }

        // Note: Library component search is not supported by the Figma Plugin API
        // The API only provides methods for variables, not components or text styles

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
        let sourceNode = component;

        // If this is a variant component, get properties from the parent ComponentSet
        if (component.type === 'COMPONENT' && component.parent?.type === 'COMPONENT_SET') {
          sourceNode = component.parent;
        }

        // Now get properties from the correct source
        if (sourceNode.type === 'COMPONENT_SET') {
          // ComponentSet has properties at the set level
          properties = Object.entries(sourceNode.componentPropertyDefinitions || {}).map(([name, def]: [string, any]) => {
            let defaultValue = def.defaultValue;

            // For INSTANCE_SWAP, convert node ID to component key
            if (def.type === 'INSTANCE_SWAP' && defaultValue) {
              try {
                console.log(`[INSTANCE_SWAP] Property "${name}" node ID:`, defaultValue);
                const node = figma.getNodeById(defaultValue);
                if (node && 'key' in node) {
                  defaultValue = (node as any).key;
                  console.log(`[INSTANCE_SWAP] Converted to key:`, defaultValue);
                }
              } catch (e) {
                console.warn(`Failed to resolve INSTANCE_SWAP node ID: ${defaultValue}`);
              }
            }

            const propDef = {
              name,
              type: def.type,
              defaultValue,
              variantOptions: def.type === 'VARIANT' ? def.variantOptions : undefined
            };

            // Log INSTANCE_SWAP properties with their default values
            if (def.type === 'INSTANCE_SWAP') {
              console.log(`[PROP-FETCH] INSTANCE_SWAP "${name}":`, propDef);
            }

            return propDef;
          });
        } else if (sourceNode.type === 'COMPONENT') {
          // Non-variant component has its own properties
          properties = Object.entries(sourceNode.componentPropertyDefinitions || {}).map(([name, def]: [string, any]) => {
            let defaultValue = def.defaultValue;

            // For INSTANCE_SWAP, convert node ID to component key
            if (def.type === 'INSTANCE_SWAP' && defaultValue) {
              try {
                console.log(`[INSTANCE_SWAP] Property "${name}" node ID:`, defaultValue);
                const node = figma.getNodeById(defaultValue);
                if (node && 'key' in node) {
                  defaultValue = (node as any).key;
                  console.log(`[INSTANCE_SWAP] Converted to key:`, defaultValue);
                }
              } catch (e) {
                console.warn(`Failed to resolve INSTANCE_SWAP node ID: ${defaultValue}`);
              }
            }

            const propDef = {
              name,
              type: def.type,
              defaultValue,
              variantOptions: def.type === 'VARIANT' ? def.variantOptions : undefined
            };

            // Log INSTANCE_SWAP properties with their default values
            if (def.type === 'INSTANCE_SWAP') {
              console.log(`[PROP-FETCH] INSTANCE_SWAP "${name}":`, propDef);
            }

            return propDef;
          });
        }

        // Also fetch properties from exposed instances (nested components)
        if ('exposedInstances' in sourceNode && sourceNode.exposedInstances) {
          console.log('[EXPOSED] Found exposed instances:', sourceNode.exposedInstances.length);

          for (const exposedInstance of sourceNode.exposedInstances) {
            if (!exposedInstance.mainComponent) continue;

            const instanceName = exposedInstance.name;
            const mainComp = exposedInstance.mainComponent;

            console.log(`[EXPOSED] Processing instance "${instanceName}" with component:`, mainComp.name);

            // Get properties from the exposed instance's component
            const exposedProps = Object.entries(mainComp.componentPropertyDefinitions || {}).map(([name, def]: [string, any]) => {
              let defaultValue = def.defaultValue;

              // For INSTANCE_SWAP, convert node ID to component key
              if (def.type === 'INSTANCE_SWAP' && defaultValue) {
                try {
                  const node = figma.getNodeById(defaultValue);
                  if (node && 'key' in node) {
                    defaultValue = (node as any).key;
                  }
                } catch (e) {
                  console.warn(`Failed to resolve INSTANCE_SWAP node ID: ${defaultValue}`);
                }
              }

              return {
                name: `${instanceName}.${name}`,  // Prefix with instance name
                type: def.type,
                defaultValue,
                variantOptions: def.type === 'VARIANT' ? def.variantOptions : undefined,
                isExposed: true  // Mark as exposed property
              };
            });

            properties.push(...exposedProps);
            console.log(`[EXPOSED] Added ${exposedProps.length} properties from "${instanceName}"`);
          }
        }

        console.log('[PROPERTIES] Fetched properties:', properties.map(p => ({ name: p.name, type: p.type })));

        figma.ui.postMessage({
          type: 'component-properties-fetched',
          payload: { properties }
        });
        break;
      }

      case 'get-text-styles': {
        // Get local text styles only
        const localStyles = figma.getLocalTextStyles();

        // Note: Library text style search is not supported by the Figma Plugin API
        // The API only provides methods for variables, not components or text styles

        // Map local styles
        const styles = localStyles.map((style: any) => ({
          id: style.id,
          name: style.name,
          fontFamily: style.fontName.family,
          fontSize: style.fontSize as number,
          library: 'Local'
        }));

        figma.ui.postMessage({
          type: 'text-styles-fetched',
          payload: { styles }
        });
        break;
      }

      case 'focus-on-node': {
        const { nodeId } = msg.payload;
        const node = figma.getNodeById(nodeId) as SceneNode;

        if (node) {
          // Highlight the node in Figma
          figma.currentPage.selection = [node];

          // Scroll and zoom to make the node visible
          figma.viewport.scrollAndZoomIntoView([node]);
        }
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
