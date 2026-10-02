def parse_duration(spec: str) -> int:
    if not isinstance(spec, str):
        raise TypeError("spec must be a string")
    s = spec.strip()
    if not s:
        raise ValueError("empty duration")
    total = 0
    i = 0
    n = len(s)
    while i < n:
        if not s[i].isdigit():
            raise ValueError(f"invalid character at position {i}: {s[i]}")
        start = i
        while i < n and s[i].isdigit():
            i += 1
        num_str = s[start:i]
        if i >= n:
            raise ValueError("missing unit after number")
        unit = s[i].lower()
        i += 1
        if unit not in ('s', 'm', 'h', 'd'):
            raise ValueError(f"unknown unit: {unit}")
        value = int(num_str)
        if unit == 's':
            total += value
        elif unit == 'm':
            total += value * 60
        elif unit == 'h':
            total += value * 3600
        elif unit == 'd':
            total += value * 86400
    return total