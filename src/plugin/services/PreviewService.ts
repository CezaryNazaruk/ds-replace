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
    this.applyPropMapping(tempInstance, propMapping);

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
    return figma.root.findOne(
      node => node.type === 'COMPONENT' && (node as ComponentNode).key === key
    ) as ComponentNode | null;
  }

  private extractProperties(instance: InstanceNode): ComponentProperty[] {
    const properties: ComponentProperty[] = [];

    if (instance.componentProperties) {
      for (const [key, prop] of Object.entries(instance.componentProperties)) {
        properties.push({
          name: key,
          type: prop.type,
          value: prop.value
        });
      }
    }

    return properties;
  }

  private applyPropMapping(instance: InstanceNode, mapping: PropMapping): void {
    if (!instance.componentProperties) return;

    const newProps = { ...instance.componentProperties };

    for (const [oldPropName, { newPropName, value }] of Object.entries(mapping)) {
      if (newProps[newPropName]) {
        newProps[newPropName] = {
          ...newProps[newPropName],
          value
        };
      }
    }

    instance.componentProperties = newProps;
  }
}
