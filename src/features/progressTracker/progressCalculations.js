export function getSortedMetricEntries(entries, metricId) {
  return [...entries]
    .filter((entry) => Number.isFinite(entry.values?.[metricId]))
    .sort((leftEntry, rightEntry) => {
      const dateCompare = leftEntry.date.localeCompare(rightEntry.date);
      return dateCompare || leftEntry.createdAt.localeCompare(rightEntry.createdAt);
    });
}

export function getProgressFromStart(goal, entries, metricId) {
  if (!metricId || !Number.isFinite(goal?.targetValue)) {
    return null;
  }

  const metricEntries = getSortedMetricEntries(entries, metricId);

  if (metricEntries.length === 0 && !Number.isFinite(goal?.startValue)) {
    return null;
  }

  const latestEntry = metricEntries.at(-1);
  const startValue = Number.isFinite(goal?.startValue)
    ? goal.startValue
    : metricEntries[0].values[metricId];
  const latestValue = latestEntry?.values?.[metricId] ?? startValue;
  const totalDistance = goal.targetValue - startValue;

  if (totalDistance === 0) {
    return latestValue === goal.targetValue ? 100 : null;
  }

  const progress = ((latestValue - startValue) / totalDistance) * 100;

  return Math.min(999, Math.max(0, Math.round(progress)));
}

export function formatTrackerNumber(value) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function getPrimaryMetric(goal) {
  return goal?.metrics?.[0] ?? null;
}

export function getPreviousDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() - 1);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function calculateStreak(entries, predicate = () => true) {
  const validDates = new Set(
    entries
      .filter(predicate)
      .map((entry) => entry.date)
      .filter(Boolean),
  );

  if (validDates.size === 0) {
    return 0;
  }

  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  let cursor = new Date(today.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
  let streak = 0;

  if (!validDates.has(cursor)) {
    cursor = [...validDates].sort().at(-1);
  }

  while (cursor && validDates.has(cursor)) {
    streak += 1;
    cursor = getPreviousDate(cursor);
  }

  return streak;
}

export function calculatePerformanceProgress(goal, entries, metricId) {
  return getProgressFromStart(goal, entries, metricId);
}

function getDirectionalBestValue(values, startValue, targetValue) {
  if (values.length === 0) {
    return null;
  }

  if (!Number.isFinite(startValue) || !Number.isFinite(targetValue)) {
    return Math.max(...values);
  }

  return targetValue < startValue
    ? Math.min(...values)
    : Math.max(...values);
}

export function calculatePerformanceStats(goal, entries) {
  const mainMetric = getPrimaryMetric(goal);
  const sortedEntries = mainMetric ? getSortedMetricEntries(entries, mainMetric.id) : [];
  const values = sortedEntries
    .map((entry) => entry.values?.[mainMetric?.id])
    .filter((value) => Number.isFinite(value));
  const latestEntry = sortedEntries.at(-1);
  const previousEntry = sortedEntries.at(-2);
  const startEntry = sortedEntries[0];
  const startValue = Number.isFinite(goal?.startValue)
    ? goal.startValue
    : startEntry?.values?.[mainMetric?.id];
  const latestValue = latestEntry?.values?.[mainMetric?.id];
  const previousValue = previousEntry?.values?.[mainMetric?.id];
  const bestValue = getDirectionalBestValue(values, startValue, goal?.targetValue);
  const averageValue =
    values.length > 0
      ? values.reduce((total, value) => total + value, 0) / values.length
      : null;
  const trendValue =
    Number.isFinite(latestValue) && Number.isFinite(previousValue)
      ? latestValue - previousValue
      : null;

  return {
    mainMetric,
    startEntry,
    startValue,
    latestEntry,
    latestValue,
    bestValue,
    averageValue,
    trendValue,
    progressPercentage: calculatePerformanceProgress(goal, entries, mainMetric?.id),
    streak: calculateStreak(sortedEntries),
    valueCount: values.length,
    unit: mainMetric?.unit || goal?.unit || '',
  };
}

export function calculateAccumulativeProgress(goal, entries, metricId) {
  if (!Number.isFinite(goal?.targetValue) || goal.targetValue === 0) {
    return null;
  }

  const startingTotal = Number.isFinite(goal?.startValue) ? goal.startValue : 0;
  const total = startingTotal + getSortedMetricEntries(entries, metricId)
    .reduce((sum, entry) => sum + (entry.values?.[metricId] ?? 0), 0);

  return Math.min(999, Math.max(0, Math.round((total / goal.targetValue) * 100)));
}

export function calculateAccumulativeStats(goal, entries) {
  const mainMetric = getPrimaryMetric(goal);
  const sortedEntries = mainMetric ? getSortedMetricEntries(entries, mainMetric.id) : [];
  const dailyValues = sortedEntries
    .map((entry) => entry.values?.[mainMetric?.id])
    .filter((value) => Number.isFinite(value));
  const startingTotal = Number.isFinite(goal?.startValue) ? goal.startValue : 0;
  const activityTotal = dailyValues.reduce((sum, value) => sum + value, 0);
  const totalValue = startingTotal + activityTotal;
  const latestEntry = sortedEntries.at(-1);
  const latestValue = latestEntry?.values?.[mainMetric?.id];
  const remainingValue = Number.isFinite(goal?.targetValue)
    ? Math.max(0, goal.targetValue - totalValue)
    : null;

  return {
    mainMetric,
    latestEntry,
    latestValue,
    startingTotal,
    activityTotal,
    totalValue,
    remainingValue,
    progressPercentage: calculateAccumulativeProgress(goal, entries, mainMetric?.id),
    streak: calculateStreak(sortedEntries),
    valueCount: dailyValues.length,
    unit: mainMetric?.unit || goal?.unit || '',
  };
}

export function isBinaryEntryCompleted(entry, goal) {
  if (typeof entry?.completed === 'boolean') {
    return entry.completed;
  }

  const mainMetric = getPrimaryMetric(goal);
  return Number(entry?.values?.[mainMetric?.id]) > 0;
}

export function calculateBinaryStats(goal, entries) {
  const sortedEntries = [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare || a.createdAt.localeCompare(b.createdAt);
  });
  const completedEntries = sortedEntries.filter((entry) =>
    isBinaryEntryCompleted(entry, goal),
  );
  const completionRate =
    sortedEntries.length > 0
      ? Math.round((completedEntries.length / sortedEntries.length) * 100)
      : null;

  return {
    completedEntries,
    totalEntries: sortedEntries.length,
    totalCompletedDays: completedEntries.length,
    completionRate,
    streak: calculateStreak(sortedEntries, (entry) =>
      isBinaryEntryCompleted(entry, goal),
    ),
  };
}
