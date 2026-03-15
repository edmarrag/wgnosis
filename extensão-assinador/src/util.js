// src/util.js

export function validatePin(pin) {
    return /^\d{6}$/.test(pin);
}

export function antiDebugging() {
    // Disable right click
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Disable F12 keys and others
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
        }
    });
}

/**
 * Parses error messages safely
 */
export function getErrorMessage(error) {
    if (error instanceof Error) return error.message;
    return String(error);
}
