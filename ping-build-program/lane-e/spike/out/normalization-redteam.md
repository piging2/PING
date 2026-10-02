# Connector normalization red team

ADVISORY ONLY: additionalProperties must stay true (harvest T5 tolerance). PING's ingestion derives fields the schema does not name (e.g. locality) and classifies evidence; a strict schema-as-gate would reject valid ingestion output and violate observation-never-canonical. The target spec is a mapping contract for adapters, not a validation gate.
