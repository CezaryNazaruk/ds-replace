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
    this.applyPropMapping(instance, propMapping);
  }

  private async findComponentByKey(key: string): Promise<ComponentNode | null> {
    return figma.root.findOne(
      node => node.type === 'COMPONENT' && (node as ComponentNode).key === key
    ) as ComponentNode | null;
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
