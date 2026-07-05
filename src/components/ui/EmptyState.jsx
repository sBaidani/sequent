// DEPRECATED (Phase 4): this legacy component is now a thin re-export of the
// kit EmptyState (src/components/kit/EmptyState.jsx). Import from '../kit'
// instead. The old `type`/`message` props are gone — use the kit API
// (title / description / icon / actions / isCompact). This file is kept only
// so in-flight Phase 4 slices that still import this path keep resolving;
// Phase 5 deletes it.
export { EmptyState, EmptyState as default } from '../kit';
