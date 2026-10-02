def merge_intervals(intervals):
    '''Merge overlapping [start, end] interval pairs into a sorted list.'''
    if not isinstance(intervals, list):
        raise ValueError("Input must be a list of lists/tuples.")
    for interval in intervals:
        if not all(isinstance(x, (int, float)) and (x != False) for x in interval):
            raise ValueError("All elements in each sublist must be numeric and non-False.")
        elif len(interval) != 2:
            raise ValueError("Each sublist must contain exactly two numbers.")
        elif interval[0] > interval[1]:
            raise ValueError("Start of an interval must not be greater than its end.")
    intervals.sort(key=lambda x: x[0])
    merged = []
    for i in range(len(intervals)):
        if not merged or intervals[i][0] > merged[-1][1]:
            merged.append(intervals[i])
        else:
            merged[-1][1] = max(merged[-1][1], intervals[i][1])
    return merged