// Additional module declarations for better TypeScript support

// Add proper typing for API responses
interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
  request?: any;
}

// For libraries without type definitions
declare module '@some-untyped-library' {
  const content: any;
  export default content;
}

// For CSS modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
