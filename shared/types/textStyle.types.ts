export interface TextNodeGroup {
  id: string; // Unique group ID
  styleId: string | null;
  styleName: string;
  color: RGBA;
  nodeIds: string[]; // Text node IDs in this group
  sampleText: string;
  count: number;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}
