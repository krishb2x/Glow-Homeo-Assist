/**
 * Side-effect CSS imports (e.g. `import "./globals.css"` in app/layout.tsx).
 * Next.js ships `*.module.css` only; plain `*.css` needs an ambient module for
 * `noUncheckedSideEffectImports` during `next build` type checking.
 */
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
