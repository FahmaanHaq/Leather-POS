import '@testing-library/jest-dom';

// MUI's ripple animation (TouchRipple) triggers a state update slightly after
// a click event fires, outside the act() window RTL wraps around user
// interactions. It's a benign, well-known noisy warning - not a real test
// failure - so it's filtered out here to keep CI logs readable.
const originalConsoleError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
        return;
    }
    originalConsoleError(...args);
};