import '@testing-library/jest-dom';
// Provide a default CONFIG for tests unless overridden
import { CONFIG } from './src/config';

(global as any).CONFIG = CONFIG;
