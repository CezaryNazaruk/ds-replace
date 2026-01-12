import { TextNodeGroup, RGBA } from '../../../shared/types/textStyle.types';

export class TextNodeService {
  discoverTextNodes(selection: readonly SceneNode[]): TextNodeGroup[] {
    const textNodes: TextNode[] = [];

    for (const node of selection) {
      this.collectTextNodes(node, textNodes);
    }

    return this.groupTextNodes(textNodes);
  }

  private collectTextNodes(node: SceneNode, result: TextNode[], insideInstance = false): void {
    // Track if we're inside an instance (either already inside one, or current node is instance)
    const nowInside = insideInstance || node.type === 'INSTANCE';

    // Only collect text nodes that are NOT inside component instances
    if (node.type === 'TEXT' && !nowInside) {
      result.push(node);
    }

    // Don't traverse into component instances
    if (node.type === 'INSTANCE') {
      return;
    }

    // Recursively traverse children, passing along the insideInstance flag
    if ('children' in node) {
      for (const child of node.children) {
        this.collectTextNodes(child, result, nowInside);
      }
    }
  }

  private groupTextNodes(nodes: TextNode[]): TextNodeGroup[] {
    const groups = new Map<string, TextNodeGroup>();

    for (const node of nodes) {
      const groupKey = this.getGroupKey(node);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          styleId: node.textStyleId?.toString() || null,
          styleName: this.getStyleName(node),
          color: this.getColor(node),
          nodeIds: [],
          sampleText: node.characters.substring(0, 50),
          count: 0
        });
      }

      const group = groups.get(groupKey)!;
      group.nodeIds.push(node.id);
      group.count++;
    }

    return Array.from(groups.values());
  }

  private getGroupKey(node: TextNode): string {
    const styleId = node.textStyleId || 'no-style';
    const color = this.getColor(node);
    return `${styleId}-${color.r}-${color.g}-${color.b}-${color.a}`;
  }

  private getStyleName(node: TextNode): string {
    if (node.textStyleId) {
      const style = figma.getStyleById(node.textStyleId.toString());
      return style?.name || 'Unknown Style';
    }
    return 'No Style';
  }

  private getColor(node: TextNode): RGBA {
    if (typeof node.fills === 'symbol') {
      return { r: 0, g: 0, b: 0, a: 1 };
    }

    const fills = node.fills as Paint[];
    const solidFill = fills.find(f => f.type === 'SOLID') as SolidPaint;

    if (solidFill && solidFill.color) {
      return {
        r: solidFill.color.r,
        g: solidFill.color.g,
        b: solidFill.color.b,
        a: solidFill.opacity !== undefined ? solidFill.opacity : 1
      };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  }

  async applyTextStyle(nodeIds: string[], styleId: string): Promise<void> {
    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId) as TextNode;
      if (node && node.type === 'TEXT') {
        await figma.loadFontAsync(node.fontName as FontName);
        node.textStyleId = styleId;
      }
    }
  }
}
