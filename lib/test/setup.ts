/**
 * Jest setup file that runs after the test environment is set up.
 * This file is loaded for every test file.
 *
 * Use this for:
 * - Global test configuration
 * - Custom matchers
 * - Global setup that needs to run for each test file
 */

import { expect } from "@jest/globals";

// Custom Jest matchers can be added here
// Example:
// expect.extend({
//   toBeWithinRange(received, floor, ceiling) {
//     const pass = received >= floor && received <= ceiling;
//     if (pass) {
//       return {
//         message: () =>
//           `expected ${received} not to be within range ${floor} - ${ceiling}`,
//         pass: true,
//       };
//     } else {
//       return {
//         message: () =>
//           `expected ${received} to be within range ${floor} - ${ceiling}`,
//         pass: false,
//       };
//     }
//   },
// });

// You can add global test configuration here
