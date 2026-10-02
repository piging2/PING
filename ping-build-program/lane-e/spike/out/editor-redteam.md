# Editor generation red team

The generated editor spec covers flat CRUD for the three proof schemas.
It FAILS on these real PING requirements:

- nested object: Company.address{city,region,country} has no representation in the three-type vocabulary; a generator would flatten or drop it.
- owner correction: OwnerFieldCorrection keeps sourceValue AND ownerValue per field with provenance; a flat generated editor writes one value and destroys the distinction.
- conditionals: no if/then, show-when, or required-when in the vocabulary; real forms need them.
- custom widgets: the spec can name widget ids, but every real product eventually needs a widget the generator does not know (media, map); that is customer code by another name.
