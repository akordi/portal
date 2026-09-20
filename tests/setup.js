// Global Vitest setup. Intentionally minimal — individual tests mock the
// modules they need. Kept so vite.config's setupFiles reference resolves.

// jsdom doesn't implement ResizeObserver (a deliberate jsdom limitation, not
// a bug) — @floating-ui/vue's autoUpdate() (used by lx-ui's Popper/
// DropDownMenu/ValuePicker/etc.) uses it to reposition on size changes, so
// any test that mounts one of those without this stub fails with
// "ResizeObserver is not defined", unrelated to whatever the test is
// actually checking. No-op is fine: these tests don't assert on
// reposition-on-resize behavior.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}
