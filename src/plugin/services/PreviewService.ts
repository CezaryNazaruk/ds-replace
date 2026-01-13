import { PropMapping, ComponentProperty } from '../../../shared/types/component.types';
import { PreviewData } from '../../../shared/types/messages.types';

export class PreviewService {
  async generatePreview(
    instanceId: string,
    newComponentKey: string,
    propMapping: PropMapping
  ): Promise<PreviewData> {
    const oldInstance = figma.getNodeById(instanceId) as InstanceNode;
    if (!oldInstance || oldInstance.type !== 'INSTANCE') {
      throw new Error('Instance not found');
    }

    // Export old instance
    const oldImage = await oldInstance.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 }
    });

    const oldProps = this.extractProperties(oldInstance);

    // Create temporary new instance
    const newComponent = await this.findComponentByKey(newComponentKey);
    if (!newComponent) {
      throw new Error('New component not found');
    }

    const tempInstance = newComponent.createInstance();
    tempInstance.x = -10000; // Off-screen

    // Apply prop mapping
    await this.applyPropMapping(tempInstance, propMapping);

    // Export new instance
    const newImage = await tempInstance.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 }
    });

    const newProps = this.extractProperties(tempInstance);

    // Clean up
    tempInstance.remove();

    return {
      oldImage,
      newImage,
      oldProps,
      newProps
    };
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

  private extractProperties(instance: InstanceNode): ComponentProperty[] {
    const properties: ComponentProperty[] = [];

    if (instance.componentProperties) {
      for (const [key, prop] of Object.entries(instance.componentProperties)) {
        let value = prop.value;

        // For INSTANCE_SWAP, convert node ID to component key for display
        if (prop.type === 'INSTANCE_SWAP' && value) {
          try {
            const node = figma.getNodeById(value as string);
            if (node && 'key' in node) {
              value = (node as any).key;
            }
          } catch (e) {
            console.warn(`Failed to resolve INSTANCE_SWAP node ID: ${value}`);
          }
        }

        properties.push({
          name: key,
          type: prop.type,
          value
        });
      }
    }

    return properties;
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
              console.log(`[PREVIEW] Setting INSTANCE_SWAP "${propName}" to key:`, value);

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
                console.log(`[PREVIEW] Found component type:`, component.type, 'id:', component.id);

                // If it's a ComponentSet, use the default variant
                if (component.type === 'COMPONENT_SET') {
                  finalValue = (component as any).defaultVariant.id;
                  console.log(`[PREVIEW] Using defaultVariant id:`, finalValue);
                } else {
                  finalValue = component.id;
                  console.log(`[PREVIEW] Using component id:`, finalValue);
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
      console.error('Error applying property mapping in preview:', error);
      throw error;
    }
  }
}
