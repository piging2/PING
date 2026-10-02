/**
 * RECONSTRUCTED FIXTURE — optional capability provider.
 * Required lazily (inside loadOptionalProvider), never at top level.
 * Classification: OPTIONAL_RUNTIME. Its absence from a snapshot must WARN,
 * never block promotion. This is the "optional stays optional" invariant:
 * the checker's existence must not promote optional providers to mandatory.
 */
'use strict';

module.exports = {
  name: 'example-optional-provider',
  describe() {
    return 'optional provider (fixture)';
  },
};
