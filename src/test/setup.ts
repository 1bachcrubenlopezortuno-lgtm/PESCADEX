import '@testing-library/jest-dom/vitest';

// jsdom no implementa URLs de objetos
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:test';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
