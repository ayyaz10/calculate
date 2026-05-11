export const GOALS_STORAGE_KEY = 'calculatorBoard_progressTracker_goals';
export const ENTRIES_STORAGE_KEY = 'calculatorBoard_progressTracker_entries';
export const GOAL_ORDER_STORAGE_KEY = 'calculatorBoard_progressTracker_goal_order';

export const metricColors = {
  lime: '#7ed957',
  pink: '#ff90e8',
  blue: '#38bdf8',
  yellow: '#ffd166',
  coral: '#ff7a59',
  violet: '#a78bfa',
};

export const metricColorKeys = Object.keys(metricColors);

export const goalBehaviorTypes = {
  performance: {
    label: 'Performance Goal',
    shortLabel: 'Performance',
    description: 'Track current ability.',
    examples: 'Typing speed, strength, speed',
    note: 'Progress can go up or down.',
  },
  accumulative: {
    label: 'Accumulative Goal',
    shortLabel: 'Accumulative',
    description: 'Track total completion toward a target.',
    examples: 'Reading, studying, saving money',
    note: 'Progress continuously increases.',
  },
  binary: {
    label: 'Binary Goal',
    shortLabel: 'Binary',
    description: 'Track whether the task was completed.',
    examples: 'Meditation, workout, habits',
    note: 'Focus on consistency and streaks.',
  },
};

const validGoalBehaviorTypes = Object.keys(goalBehaviorTypes);

const legacyPresetGoalTypeMap = {
  typing: 'performance',
  walking: 'accumulative',
  pomodoro: 'accumulative',
  selfControl: 'binary',
  custom: 'performance',
};

export function normalizeGoalType(value, fallbackType = 'custom') {
  if (validGoalBehaviorTypes.includes(value)) {
    return value;
  }

  if (typeof fallbackType === 'string') {
    const [encodedGoalType] = fallbackType.split(':');

    if (validGoalBehaviorTypes.includes(encodedGoalType)) {
      return encodedGoalType;
    }
  }

  return legacyPresetGoalTypeMap[fallbackType] || 'performance';
}

export function decodeGoalTypeFields(goalType, type = 'custom') {
  if (typeof type === 'string') {
    const [encodedGoalType, encodedType, ...encodedParts] = type.split(':');
    const encodedStartValue = encodedParts
      .map((part) => part.match(/^start=(.+)$/)?.[1])
      .find(Boolean);
    const encodedAllowMultiple = encodedParts.some((part) => part === 'multi=1');

    if (validGoalBehaviorTypes.includes(encodedGoalType)) {
      return {
        goalType: encodedGoalType,
        type: encodedType || 'custom',
        startValue: encodedStartValue === undefined
          ? null
          : Number.parseFloat(encodedStartValue),
        allowMultipleEntriesPerDay: encodedAllowMultiple,
      };
    }
  }

  return {
    goalType: normalizeGoalType(goalType, type),
    type,
    startValue: null,
    allowMultipleEntriesPerDay: false,
  };
}

export function encodeGoalTypeForLegacyColumn(
  goalType,
  type = 'custom',
  startValue = null,
  allowMultipleEntriesPerDay = false,
) {
  const decoded = decodeGoalTypeFields(goalType, type);
  const normalizedGoalType = normalizeGoalType(goalType, type);
  const parsedStartValue = Number.parseFloat(startValue);
  const startSuffix = Number.isFinite(parsedStartValue)
    ? `:start=${parsedStartValue}`
    : '';
  const multiSuffix = allowMultipleEntriesPerDay ? ':multi=1' : '';

  return normalizedGoalType === 'performance' && !startSuffix && !multiSuffix
    ? decoded.type
    : `${normalizedGoalType}:${decoded.type}${startSuffix}${multiSuffix}`;
}

export function getGoalType(goal) {
  return normalizeGoalType(goal?.goalType, goal?.type);
}

export function isBinaryGoal(goal) {
  return getGoalType(goal) === 'binary';
}

export function buildBinaryMetrics() {
  return [
    {
      id: createId('metric'),
      name: 'Completed',
      unit: 'day',
      colorKey: 'lime',
    },
  ];
}

export const goalTypePresets = {
  typing: {
    label: 'Typing practice',
    targetUnit: 'WPM',
    metrics: [
      { name: 'WPM', unit: 'WPM' },
      { name: 'Accuracy', unit: '%' },
      { name: 'Raw Speed', unit: 'WPM' },
      { name: 'Consistency', unit: '%' },
    ],
  },
  walking: {
    label: 'Walking',
    targetUnit: 'steps',
    metrics: [
      { name: 'Steps', unit: 'steps' },
      { name: 'Distance', unit: 'km' },
      { name: 'Calories', unit: 'kcal' },
    ],
  },
  pomodoro: {
    label: 'Pomodoro',
    targetUnit: 'sessions',
    metrics: [
      { name: 'Completed Pomodoros', unit: 'sessions' },
      { name: 'Focus Minutes', unit: 'minutes' },
    ],
  },
  selfControl: {
    label: 'Self-control',
    targetUnit: 'controls',
    metrics: [
      { name: 'Successful Controls', unit: 'count' },
      { name: 'Failed Attempts', unit: 'count' },
    ],
  },
  custom: {
    label: 'Custom',
    targetUnit: '',
    metrics: [
      { name: 'Progress', unit: '' },
    ],
  },
};

export function createId(prefix) {
  const randomValue =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${randomValue}`;
}

export function getTodayInputValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function buildPresetMetrics(type) {
  return goalTypePresets[type].metrics.map((metric, index) => ({
    id: createId('metric'),
    name: metric.name,
    unit: metric.unit,
    colorKey: metricColorKeys[index % metricColorKeys.length],
  }));
}

export function formatGoalTarget(goal) {
  if (!Number.isFinite(goal.targetValue)) {
    return 'No target set';
  }

  return `${goal.targetValue.toLocaleString()} ${goal.unit}`.trim();
}
