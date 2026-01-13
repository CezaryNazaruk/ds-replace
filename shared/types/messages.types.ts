import { ComponentData, PropMapping, SavedMapping } from './component.types';
import { TextNodeGroup } from './textStyle.types';

// Preview data structure
export interface PreviewData {
  oldImage: Uint8Array;
  newImage: Uint8Array;
  oldProps: any[];
  newProps: any[];
}

// Component search result
export interface ComponentSearchResult {
  id: string;
  name: string;
  key: string;
  library: string;
  thumbnail: Uint8Array;
}

// Component property definition
export interface ComponentPropertyDefinition {
  name: string;
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue: any;
  variantOptions?: string[];
  isExposed?: boolean; // True if this property comes from an exposed instance
}

// Text style info
export interface TextStyleInfo {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  library: string;
}

// Messages from UI → Plugin
export type UIMessage =
  | { type: 'discover-components'; payload?: { clearExisting?: boolean } }
  | { type: 'replace-component'; payload: { instanceId: string; newComponentKey: string; propMapping: PropMapping } }
  | { type: 'skip-component'; payload: { instanceId: string } }
  | { type: 'detach-instance'; payload: { instanceId: string } }
  | { type: 'save-mapping'; payload: { mapping: SavedMapping } }
  | { type: 'load-mappings' }
  | { type: 'apply-text-style'; payload: { nodeIds: string[]; styleId: string } }
  | { type: 'preview-component'; payload: { instanceId: string; newComponentKey: string; propMapping: PropMapping } }
  | { type: 'search-components'; payload: { query: string } }
  | { type: 'get-component-properties'; payload: { componentKey: string } }
  | { type: 'get-text-styles' }
  | { type: 'focus-on-node'; payload: { nodeId: string } };

// Messages from Plugin → UI
export type PluginMessage =
  | { type: 'components-discovered'; payload: { components: ComponentData[]; clearExisting: boolean } }
  | { type: 'component-replaced'; payload: { instanceId: string } }
  | { type: 'instance-detached'; payload: { instanceId: string } }
  | { type: 'mappings-loaded'; payload: { mappings: SavedMapping[] } }
  | { type: 'text-nodes-grouped'; payload: { groups: TextNodeGroup[]; clearExisting: boolean } }
  | { type: 'preview-ready'; payload: { preview: PreviewData } }
  | { type: 'components-search-results'; payload: { results: ComponentSearchResult[] } }
  | { type: 'component-properties-fetched'; payload: { properties: ComponentPropertyDefinition[] } }
  | { type: 'text-styles-fetched'; payload: { styles: TextStyleInfo[] } }
  | { type: 'error'; payload: { message: string } };
