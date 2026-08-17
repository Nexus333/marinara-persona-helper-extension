# Changelog

## Unreleased

- Added directive-only Goals generation with prompt contract setup, lorebook context, reviewable draft candidates, regeneration, and debug output panels.
- Added live Goals milestone removal from edit mode with a confirmation dialog.
- Moved Goals generation settings into the directive generation modal and removed the obsolete setup-only generation debug builder.
- Added an explicit chat-history toggle and message-count control to Goals directive generation settings.
- Improved focused Goals milestone readability by separating wrapped node text from compact breadcrumb metadata.
- Hid the current chat from Goals Advanced Chat Cleanup so only stale bindings are listed.
- Updated the Persona Helper topbar compass icon to use the active Marinara primary theme color.
- Replaced Goals subject dropdown/list selection with searchable card picker modals for current subject and duplicate target subject.
- Replaced remaining Goals checkbox affordances with switches, tightened selected-card action buttons, and routed Goals status messages through the shared snackbar.
- Added Goals Library duplication with target subject, target collection, reset progress, and optional current-chat assignment.
- Expanded Goals Library cards to show descriptions and reveal actions only on the selected card.
- Moved the Goals Library create/edit form above the collection goal list.
- Defaulted Goals Chat Scope and Library search rail to collapsed.
- Added Actions and Goals About tabs describing intended use cases and surfaced player context.
- Reframed Goals UI language around milestones and directives.
- Made live Goals milestone cards read-only by default, with explicit edit mode, clearer checklist completion, and visible map connectors.
- Reworked Goals Milestones into focused node navigation with checklist completion, accumulation progress controls, current-tier milestone adds, and a React Flow tree map.
- Added Goals subject thumbnails for selected characters when Marinara provides avatar data.
- Updated Goals Library with a collapsible search/collection rail and focused navigation for nested initial-milestone editing.
- Fixed Goals subject labels for current-chat characters and made Library search and goal creation easier to find.
- Added Phase 6 Goals Setup diagnostics for backend context, chat binding cleanup, and generation debug panes.
- Added Phase 4 Goals Library support for collection management, goal create/edit/delete, status and priority controls, search assignment, and current-chat binding.
- Added Phase 2/3 Goals support for subject switching, chat-scoped task bindings, focused subtrees, hide-completed filtering, and direct node progress edits through the live goal backend.
- Replaced the Goals scaffold with Phase 1 `Milestones | Library | Setup` shells backed by the live `goal` backend command surface.
