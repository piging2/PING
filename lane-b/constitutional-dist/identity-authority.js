'use strict';
/**
 * Lane-local test-harness shim. In production this path is the compiled
 * constitutional dist (runtime/constitutional/src/*.ts -> gateway/
 * constitutional-dist at Docker build time). In this sandbox the shim
 * re-exports the lane's reference copy so unit tests run without a gateway
 * build. Do NOT add logic here: the sibling file is the implementation.
 */
module.exports = require('../identity-authority.js');
