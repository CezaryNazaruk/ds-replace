export interface ComponentData {
  id: string;
  name: string;
  key: string; // Component key for lookup
  instances: InstanceData[];
  thumbnail?: Uint8Array; // Image bytes
}

export interface InstanceData {
  id: string;
  name: string;
  properties: ComponentProperty[]; // Current prop values
  isNested: boolean;
  nestingLevel: number;
  parentId?: string;
}

export interface ComponentProperty {
  name: string;
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  value: any;
}

// Simple key-value map of new property names to values (no 1:1 mapping with old props)
export interface PropMapping {
  [newPropName: string]: any;
}

export interface SavedMapping {
  id: string;
  name: string;
  oldComponentKey: string;
  oldComponentName: string;        // Component name for matching
  oldComponentVariant?: string;    // Variant value (e.g., "Primary") for composite key matching
  newComponentKey: string;
  newComponentName: string;        // New component name for display
  propMapping: PropMapping;
  createdAt: number;
}
