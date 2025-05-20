// Add declarations for modules that don't have type definitions

declare module 'framer-motion' {
  export const motion: any;
  export const AnimatePresence: any;
  export function useAnimation(): any;
  export function useMotionValue(initialValue: any): any;
  export function useTransform(value: any, input: any[], output: any[]): any;
}

// Add declarations for other modules without type definitions if needed
// For example:
// declare module 'some-untyped-module';
