import { InstanceData, ComponentProperty } from '../types/component.types';

/**
 * Extracts the variant value from an instance's properties
 * @param instance - The instance to extract variant from
 * @returns The variant value or undefined if no variant property exists
 */
export const getVariantValue = (instance: InstanceData): string | undefined => {
  const variantProp = instance.properties.find(p => p.type === 'VARIANT');
  return variantProp?.value;
};

/**
 * Creates a composite key for matching components with variants
 * @param componentName - The component name
 * @param variant - Optional variant value
 * @returns Composite key in format "componentName/variant" or just "componentName"
 */
export const getComponentVariantKey = (componentName: string, variant?: string): string => {
  return variant ? `${componentName}/${variant}` : componentName;
};

/**
 * Sorts properties to place VARIANT properties at the top
 * @param props - Array of properties to sort
 * @returns New sorted array with VARIANT properties first
 */
export const sortPropertiesByVariant = <T extends { type: string }>(props: T[]): T[] => {
  return [...props].sort((a, b) => {
    if (a.type === 'VARIANT' && b.type !== 'VARIANT') return -1;
    if (a.type !== 'VARIANT' && b.type === 'VARIANT') return 1;
    return 0;
  });
};
