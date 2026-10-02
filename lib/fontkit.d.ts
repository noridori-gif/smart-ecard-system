// Minimal types for the parts of fontkit used by lib/saveTheDateCardImage.tsx (the package ships none).
declare module "fontkit" {
  export interface Font {
    unitsPerEm: number;
    layout(text: string): { advanceWidth: number };
  }
  export function create(buffer: Buffer): Font;
}
