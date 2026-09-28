/**
 * Ambient declarations so the type checker accepts stylesheet imports.
 * Vite handles the actual CSS at build time.
 */
declare module "*.css" {
  const content: string;
  export default content;
}
