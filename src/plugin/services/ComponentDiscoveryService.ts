import { ComponentData, InstanceData, ComponentProperty } from '../../../shared/types/component.types';

export class ComponentDiscoveryService {
  async discoverComponents(
    selection: readonly SceneNode[],
    includeNested = false
  ): Promise<ComponentData[]> {
    const componentMap = new Map<string, ComponentData>();

    for (const node of selection) {
      await this.traverseNode(node, componentMap, 0, undefined, includeNested);
    }

    return Array.from(componentMap.values());
  }

  private async traverseNode(
    node: SceneNode,
    componentMap: Map<string, ComponentData>,
    nestingLevel: number,
    parentId: string | undefined,
    includeNested: boolean
  ): Promise<void> {
    if (node.type === 'INSTANCE') {
      // Only process if includeNested=true OR if top-level (nestingLevel=0)
      if (includeNested || nestingLevel === 0) {
        await this.processInstance(node, componentMap, nestingLevel, parentId);
      }
    }

    // Continue traversing to find nested structure
    if ('children' in node) {
      for (const child of node.children) {
        await this.traverseNode(
          child,
          componentMap,
          node.type === 'INSTANCE' ? nestingLevel + 1 : nestingLevel,
          node.id,
          includeNested
        );
      }
    }
  }

  private async processInstance(
    instance: InstanceNode,
    componentMap: Map<string, ComponentData>,
    nestingLevel: number,
    parentId?: string
  ): Promise<void> {
    const mainComponent = instance.mainComponent;
    if (!mainComponent) return;

    const componentKey = mainComponent.key;

    if (!componentMap.has(componentKey)) {
      const thumbnail = await instance.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 0.5 }
      });

      // Check if this is a variant (has ComponentSet parent)
      let componentName = mainComponent.name;
      if (mainComponent.parent && mainComponent.parent.type === 'COMPONENT_SET') {
        componentName = mainComponent.parent.name;
      }

      componentMap.set(componentKey, {
        id: mainComponent.id,
        name: componentName,
        key: componentKey,
        instances: [],
        thumbnail
      });
    }

    const componentData = componentMap.get(componentKey)!;
    componentData.instances.push({
      id: instance.id,
      name: instance.name,
      properties: this.extractProperties(instance),
      isNested: nestingLevel > 0,
      nestingLevel,
      parentId
    });
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
}
