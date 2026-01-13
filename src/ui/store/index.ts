import { create } from 'zustand';
import { ComponentData, SavedMapping, PropMapping } from '../../../shared/types/component.types';
import { TextNodeGroup } from '../../../shared/types/textStyle.types';
import { PreviewData, ComponentSearchResult, ComponentPropertyDefinition, TextStyleInfo } from '../../../shared/types/messages.types';

interface AppState {
  // Component data
  components: ComponentData[];
  setComponents: (components: ComponentData[]) => void;
  addComponents: (components: ComponentData[]) => void; // For adding components after detach
  removeInstance: (instanceId: string) => void; // For removing instance after detach

  // Text groups
  textGroups: TextNodeGroup[];
  setTextGroups: (groups: TextNodeGroup[]) => void;
  addTextGroups: (groups: TextNodeGroup[]) => void; // For adding text groups after detach

  // Mappings
  currentMappings: Map<string, PropMapping>;
  setMapping: (instanceId: string, mapping: PropMapping) => void;
  savedMappings: SavedMapping[];
  setSavedMappings: (mappings: SavedMapping[]) => void;

  // Preview
  previewData: PreviewData | null;
  setPreviewData: (data: PreviewData | null) => void;

  // UI state
  activeTab: 'components' | 'text-styles' | 'saved-mappings';
  setActiveTab: (tab: 'components' | 'text-styles' | 'saved-mappings') => void;
  selectedInstanceId: string | null;
  setSelectedInstanceId: (id: string | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Navigation state
  viewMode: 'list' | 'detail';
  setViewMode: (mode: 'list' | 'detail') => void;
  openDetailView: (instanceId: string) => void;
  closeDetailView: () => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  getPendingInstances: () => string[];

  // Skipped and replaced components
  skippedInstances: Set<string>;
  skipInstance: (instanceId: string) => void;
  replacedInstances: Set<string>;
  markAsReplaced: (instanceId: string) => void;

  // Component search
  componentSearchResults: ComponentSearchResult[];
  setComponentSearchResults: (results: ComponentSearchResult[]) => void;

  // Component properties
  componentProperties: ComponentPropertyDefinition[];
  setComponentProperties: (properties: ComponentPropertyDefinition[]) => void;

  // Text styles
  textStyles: TextStyleInfo[];
  setTextStyles: (styles: TextStyleInfo[]) => void;
}

export const useStore = create<AppState>((set) => ({
  components: [],
  setComponents: (components) => set({ components }),
  addComponents: (newComponents) =>
    set((state) => {
      // Merge new components with existing ones
      const componentMap = new Map<string, ComponentData>();

      // Add existing components
      state.components.forEach(c => componentMap.set(c.key, c));

      // Add or merge new components
      newComponents.forEach(newComp => {
        if (componentMap.has(newComp.key)) {
          // Merge instances, but only add instances that don't already exist
          const existing = componentMap.get(newComp.key)!;
          const existingIds = new Set(existing.instances.map(inst => inst.id));

          const newInstances = newComp.instances.filter(inst => !existingIds.has(inst.id));
          existing.instances.push(...newInstances);
        } else {
          componentMap.set(newComp.key, newComp);
        }
      });

      return { components: Array.from(componentMap.values()) };
    }),
  removeInstance: (instanceId) =>
    set((state) => ({
      components: state.components
        .map((comp) => ({
          ...comp,
          instances: comp.instances.filter((inst) => inst.id !== instanceId)
        }))
        .filter((comp) => comp.instances.length > 0) // Remove empty component groups
    })),

  textGroups: [],
  setTextGroups: (groups) => set({ textGroups: groups }),
  addTextGroups: (newGroups) =>
    set((state) => {
      // Merge new text groups with existing ones
      const groupMap = new Map<string, TextNodeGroup>();

      // Add existing groups
      state.textGroups.forEach(g => groupMap.set(g.id, g));

      // Add or merge new groups
      newGroups.forEach(newGroup => {
        if (groupMap.has(newGroup.id)) {
          // Merge node IDs
          const existing = groupMap.get(newGroup.id)!;
          existing.nodeIds.push(...newGroup.nodeIds);
          existing.count = existing.nodeIds.length;
        } else {
          groupMap.set(newGroup.id, newGroup);
        }
      });

      return { textGroups: Array.from(groupMap.values()) };
    }),

  currentMappings: new Map(),
  setMapping: (instanceId, mapping) =>
    set((state) => {
      const newMappings = new Map(state.currentMappings);
      newMappings.set(instanceId, mapping);
      return { currentMappings: newMappings };
    }),

  savedMappings: [],
  setSavedMappings: (mappings) => set({ savedMappings: mappings }),

  previewData: null,
  setPreviewData: (data) => set({ previewData: data }),

  activeTab: 'components',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedInstanceId: null,
  setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  skippedInstances: new Set(),
  skipInstance: (instanceId) =>
    set((state) => {
      const newSkipped = new Set(state.skippedInstances);
      newSkipped.add(instanceId);
      return { skippedInstances: newSkipped };
    }),

  replacedInstances: new Set(),
  markAsReplaced: (instanceId) =>
    set((state) => {
      const newReplaced = new Set(state.replacedInstances);
      newReplaced.add(instanceId);
      return { replacedInstances: newReplaced };
    }),

  componentSearchResults: [],
  setComponentSearchResults: (results) => set({ componentSearchResults: results }),

  componentProperties: [],
  setComponentProperties: (properties) => set({ componentProperties: properties }),

  textStyles: [],
  setTextStyles: (styles) => set({ textStyles: styles }),

  // Navigation state
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  openDetailView: (instanceId) => {
    set({
      viewMode: 'detail',
      selectedInstanceId: instanceId
    });

    // Send message to plugin to focus on the node
    window.parent.postMessage({
      pluginMessage: {
        type: 'focus-on-node',
        payload: { nodeId: instanceId }
      }
    }, '*');
  },

  closeDetailView: () => {
    set({
      viewMode: 'list',
      selectedInstanceId: null,
      previewData: null  // Clear preview when closing detail view
    });
  },

  getPendingInstances: () => {
    const state = useStore.getState();
    const allInstances: string[] = [];

    // Collect all instance IDs
    state.components.forEach(comp => {
      comp.instances.forEach(inst => {
        allInstances.push(inst.id);
      });
    });

    // Filter to only pending instances (not replaced or skipped)
    return allInstances.filter(id =>
      !state.replacedInstances.has(id) && !state.skippedInstances.has(id)
    );
  },

  navigateToNext: () => {
    const state = useStore.getState();
    const pending = state.getPendingInstances();
    const currentIndex = pending.indexOf(state.selectedInstanceId || '');

    if (currentIndex !== -1 && currentIndex + 1 < pending.length) {
      state.openDetailView(pending[currentIndex + 1]);
    } else if (currentIndex === -1 && pending.length > 0) {
      // If no current selection, go to first pending
      state.openDetailView(pending[0]);
    } else {
      // No more pending instances, close detail view
      state.closeDetailView();
    }
  },

  navigateToPrevious: () => {
    const state = useStore.getState();
    const pending = state.getPendingInstances();
    const currentIndex = pending.indexOf(state.selectedInstanceId || '');

    if (currentIndex > 0) {
      state.openDetailView(pending[currentIndex - 1]);
    }
  }
}));
