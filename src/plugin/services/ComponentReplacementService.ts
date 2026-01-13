import { PropMapping } from '../../../shared/types/component.types';

export class ComponentReplacementService {
  async replaceComponent(
    instanceId: string,
    newComponentKey: string,
    propMapping: PropMapping
  ): Promise<void> {
    const instance = figma.getNodeById(instanceId) as InstanceNode;
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error('Instance not found');
    }

    const newComponent = await this.findComponentByKey(newComponentKey);
    if (!newComponent) {
      throw new Error('New component not found');
    }

    // Swap component (preserves overrides intelligently)
    instance.swapComponent(newComponent);

    // Apply prop mappings
    await this.applyPropMapping(instance, propMapping);
  }

  private async findComponentByKey(key: string): Promise<ComponentNode | null> {
    // Try to find locally (check both COMPONENT and COMPONENT_SET)
    let component = figma.root.findOne(
      node => (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
              ('key' in node) && node.key === key
    ) as ComponentNode | ComponentSetNode | null;

    // If not found locally, try to import from library
    if (!component) {
      try {
        component = await figma.importComponentByKeyAsync(key);
      } catch (e) {
        return null;
      }
    }

    // If it's a ComponentSet, use the default variant
    if (component.type === 'COMPONENT_SET') {
      return component.defaultVariant;
    }

    return component as ComponentNode;
  }

  private async applyPropMapping(instance: InstanceNode, mapping: PropMapping): Promise<void> {
    if (!instance.componentProperties) return;
    if (Object.keys(mapping).length === 0) return; // No mapping to apply

    try {
      // Apply each property individually to catch errors
      for (const [propName, value] of Object.entries(mapping)) {
        try {
          const propDef = instance.componentProperties[propName];
          if (propDef === undefined) continue;

          let finalValue = value;

          // For INSTANCE_SWAP, convert component key to node ID
          if (propDef.type === 'INSTANCE_SWAP' && value) {
            try {
              console.log(`[REPLACE] Setting INSTANCE_SWAP "${propName}" to key:`, value);

              // Value is a component key, find the component and get its node ID
              let component = figma.root.findOne(
                node => (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
                        ('key' in node) && (node as any).key === value
              );

              // If not found locally, try to import from library
              if (!component) {
                try {
                  component = await figma.importComponentByKeyAsync(value as string);
                } catch (importError) {
                  console.warn(`Failed to import component for key: ${value}`);
                  continue;
                }
              }

              if (component) {
                console.log(`[REPLACE] Found component type:`, component.type, 'id:', component.id);

                // If it's a ComponentSet, use the default variant
                if (component.type === 'COMPONENT_SET') {
                  finalValue = (component as any).defaultVariant.id;
                  console.log(`[REPLACE] Using defaultVariant id:`, finalValue);
                } else {
                  finalValue = component.id;
                  console.log(`[REPLACE] Using component id:`, finalValue);
                }
              } else {
                console.warn(`Component not found for key: ${value}`);
                continue;
              }
            } catch (e) {
              console.warn(`Failed to resolve component key ${value}:`, e);
              continue;
            }
          }

          // Set the property value directly using Figma's setProperties API
          instance.setProperties({
            [propName]: finalValue
          });
        } catch (propError) {
          console.warn(`Failed to set property ${propName}:`, propError);
          // Continue with other properties even if one fails
        }
      }
    } catch (error) {
      console.error('Error applying property mapping:', error);
      throw error;
    }
  }

  /**
   * Detaches an instance and returns the resulting node for re-scanning
   */
  detachInstance(instanceId: string): SceneNode {
    const instance = figma.getNodeById(instanceId) as InstanceNode;
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error('Instance not found');
    }

    // Detach the instance (converts to Frame/Group)
    const detachedNode = instance.detachInstance();

    return detachedNode;
  }
}
