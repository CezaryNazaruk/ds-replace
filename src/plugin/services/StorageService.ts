import { SavedMapping } from '../../../shared/types/component.types';

export class StorageService {
  private readonly STORAGE_KEY = 'component-mappings';
  private readonly MAX_SIZE = 100 * 1024; // 100KB limit

  async saveMappings(mappings: SavedMapping[]): Promise<void> {
    const data = JSON.stringify(mappings);

    // Check size limit
    if (data.length > this.MAX_SIZE) {
      throw new Error(`Mapping data exceeds ${this.MAX_SIZE / 1024}KB limit`);
    }

    figma.root.setPluginData(this.STORAGE_KEY, data);
  }

  async loadMappings(): Promise<SavedMapping[]> {
    const data = figma.root.getPluginData(this.STORAGE_KEY);

    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse stored mappings:', error);
      return [];
    }
  }

  async saveMapping(mapping: SavedMapping): Promise<void> {
    const mappings = await this.loadMappings();

    // Update existing or add new
    const existingIndex = mappings.findIndex(m => m.id === mapping.id);
    if (existingIndex >= 0) {
      mappings[existingIndex] = mapping;
    } else {
      mappings.push(mapping);
    }

    await this.saveMappings(mappings);
  }

  async deleteMapping(mappingId: string): Promise<void> {
    const mappings = await this.loadMappings();
    const filtered = mappings.filter(m => m.id !== mappingId);
    await this.saveMappings(filtered);
  }
}
