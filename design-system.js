import { plugin as shadcn } from '@shadcn/lint';

// Global classes that Tailwind does not generate: Understory's cp-* utilities
// and the legacy canopy-styleguide cps-* classes.
const nonTailwindClasses = ['cp-*', 'cps-*'];

// Understory's --cp-color-* variables are a sanctioned way to apply color.
const cpColorVars = ['bg', 'text', 'border', 'fill', 'stroke', 'outline', 'ring', 'divide'].map(
  (u) => `${u}-[var(--cp-color-*)]`,
);

// Understory's theme.css redefines these scales onto its own variables, but they
// share names with the default Tailwind palette, so no-raw-colors reports them.
const colorUtilities = ['bg', 'text', 'border', 'fill', 'stroke', 'outline', 'ring', 'divide', 'from', 'via', 'to', 'decoration', 'placeholder', 'accent', 'caret', 'shadow'];
const understoryScales = ['gray', 'brand', 'error', 'warning', 'success'].flatMap((scale) =>
  colorUtilities.map((u) => `${u}-${scale}-*`),
);

// Containers whose padding and gap belong to the caller.
const containerContracts = [
  { pattern: '^(CpWell|CpCard|CpCardBody|CpCardHeader|CpCardFooter|CpArea)$', allow: ['layout', 'spacing', ...nonTailwindClasses] },
  // Modal and overlay sections keep their own padding, but gap only spaces
  // their children.
  { pattern: '^(CpModalBody|CpModalFooter|CpOverlayBody)$', allow: ['layout', 'gap-*', 'gap-x-*', 'gap-y-*', ...nonTailwindClasses] },
];

// Opt-in design-system rules for repos that render Understory components.
// Usage: export default [...canopyConfig, ...canopyDesignSystem];
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { shadcn },
    settings: {
      shadcn: {
        componentImports: ['^@canopytax/understory(/|$)'],
        // Class arguments to the Canopy classname helpers. `tw` adds the app
        // prefix at runtime, so the classes in source are unprefixed.
        mergeFunctions: ['tw', 'always', 'maybe', 'toggle'],
        note: 'Understory components own their styling. See the understory-component-library skill.',
      },
    },
    rules: {
      'shadcn/no-restyle': ['error', { allow: ['layout', ...nonTailwindClasses], contracts: containerContracts }],
      'shadcn/no-raw-colors': ['error', { allow: understoryScales }],
      // canopy/no-hardcoded-font-size owns text-[...] sizes. Grid templates
      // have no scale to fall back on.
      'shadcn/no-arbitrary-values': ['error', { allow: [...cpColorVars, 'text-[*', 'grid-cols-[*', 'grid-rows-[*'] }],
    },
  },
];
