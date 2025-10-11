// Shim for packages expecting `warning` to have a default export
// The real `warning` package exports a function; esm consumers sometimes expect `default`.
function warning(condition: any, ...args: any[]) {
    if (!condition) {
        if (typeof console !== 'undefined' && console.warn) {
            try { console.warn('[warning]', ...args) } catch { /* no-op */ }
        }
    }
}
export default warning
export { warning }
