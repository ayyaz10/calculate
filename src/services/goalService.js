import { toMetric } from './metricService';
import {
  decodeGoalTypeFields,
  encodeGoalTypeForLegacyColumn,
  normalizeGoalType,
} from '../features/progressTracker/progressTrackerStorage';
import {
  assertSupabaseResult,
  getUserScopedClient,
  isMissingColumnError,
  normalizeLegacyUuid,
  parseNullableNumber,
} from './supabaseCrud';

const goalSelectWithBehavior = `
  id,
  user_id,
  title,
  type,
  goal_type,
  start_value,
  target_value,
  unit,
  deadline,
  allow_multiple_entries_per_day,
  sort_order,
  created_at,
  metrics (
    id,
    goal_id,
    name,
    unit,
    color_key,
    created_at
  )
`;

const goalSelectWithoutBehavior = goalSelectWithBehavior.replace('  goal_type,\n', '');
const goalSelectWithoutStartValue = goalSelectWithBehavior.replace('  start_value,\n', '');
const goalSelectWithoutAllowMultiple = goalSelectWithBehavior.replace('  allow_multiple_entries_per_day,\n', '');
const goalSelectWithoutSortOrder = goalSelectWithBehavior.replace('  sort_order,\n', '');
const legacyGoalSelect = goalSelectWithoutBehavior
  .replace('  start_value,\n', '')
  .replace('  allow_multiple_entries_per_day,\n', '')
  .replace('  sort_order,\n', '');

export function toGoal(row) {
  const decodedGoal = decodeGoalTypeFields(row.goal_type, row.type);

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: decodedGoal.type,
    goalType: decodedGoal.goalType,
    startValue: parseNullableNumber(row.start_value ?? decodedGoal.startValue),
    targetValue: parseNullableNumber(row.target_value),
    unit: row.unit ?? '',
    deadline: row.deadline ?? '',
    allowMultipleEntriesPerDay: Boolean(
      row.allow_multiple_entries_per_day ?? decodedGoal.allowMultipleEntriesPerDay,
    ),
    sortOrder: Number.isFinite(row.sort_order) ? row.sort_order : 0,
    createdAt: row.created_at,
    metrics: (row.metrics ?? [])
      .map(toMetric)
      .sort((leftMetric, rightMetric) =>
        leftMetric.createdAt.localeCompare(rightMetric.createdAt),
      ),
  };
}

function toGoalInsert(goal, userId) {
  const id = normalizeLegacyUuid(goal.id, 'goal');

  return {
    ...(id ? { id } : {}),
    user_id: userId,
    title: goal.title.trim(),
    type: goal.type,
    goal_type: normalizeGoalType(goal.goalType, goal.type),
    start_value: parseNullableNumber(goal.startValue ?? goal.start_value),
    target_value: parseNullableNumber(goal.targetValue ?? goal.target_value),
    unit: goal.unit?.trim() ?? '',
    deadline: goal.deadline || null,
    allow_multiple_entries_per_day: Boolean(
      goal.allowMultipleEntriesPerDay ?? goal.allow_multiple_entries_per_day,
    ),
    sort_order: Number.isFinite(goal.sortOrder ?? goal.sort_order)
      ? goal.sortOrder ?? goal.sort_order
      : 0,
    created_at: goal.createdAt ?? goal.created_at ?? new Date().toISOString(),
  };
}

function withoutGoalType(goalPayload) {
  const { goal_type: goalType, ...legacyPayload } = goalPayload;
  return {
    ...legacyPayload,
    type: encodeGoalTypeForLegacyColumn(
      goalType,
      legacyPayload.type,
      legacyPayload.start_value,
      legacyPayload.allow_multiple_entries_per_day,
    ),
  };
}

function withoutStartValue(goalPayload) {
  const { start_value: startValue, ...legacyPayload } = goalPayload;
  return {
    ...legacyPayload,
    type: encodeGoalTypeForLegacyColumn(
      legacyPayload.goal_type,
      legacyPayload.type,
      startValue,
      legacyPayload.allow_multiple_entries_per_day,
    ),
  };
}

function withoutAllowMultiple(goalPayload) {
  const { allow_multiple_entries_per_day: allowMultiple, ...legacyPayload } = goalPayload;
  return {
    ...legacyPayload,
    type: encodeGoalTypeForLegacyColumn(
      legacyPayload.goal_type,
      legacyPayload.type,
      legacyPayload.start_value,
      allowMultiple,
    ),
  };
}

function withoutSortOrder(goalPayload) {
  const { sort_order: _sortOrder, ...legacyPayload } = goalPayload;
  return legacyPayload;
}

function getGoalPayloadForMissingColumn(payload, error) {
  if (isMissingColumnError(error, 'goal_type')) {
    return withoutGoalType(payload);
  }

  if (isMissingColumnError(error, 'start_value')) {
    return withoutStartValue(payload);
  }

  if (isMissingColumnError(error, 'allow_multiple_entries_per_day')) {
    return withoutAllowMultiple(payload);
  }

  if (isMissingColumnError(error, 'sort_order')) {
    return withoutSortOrder(payload);
  }

  return payload;
}

async function selectGoalsWithFallback(buildQuery) {
  const selectStatements = [
    goalSelectWithBehavior,
    goalSelectWithoutStartValue,
    goalSelectWithoutAllowMultiple,
    goalSelectWithoutSortOrder,
    goalSelectWithoutBehavior,
    legacyGoalSelect,
  ];

  let lastResult = null;

  for (const selectStatement of selectStatements) {
    const result = await buildQuery(selectStatement);
    lastResult = result;

    if (!isMissingColumnError(result.error, 'goal_type')
      && !isMissingColumnError(result.error, 'start_value')
      && !isMissingColumnError(result.error, 'allow_multiple_entries_per_day')
      && !isMissingColumnError(result.error, 'sort_order')) {
      return result;
    }
  }

  return lastResult;
}

function toMetricInsert(metric, goalId) {
  const id = normalizeLegacyUuid(metric.id, 'metric');

  return {
    ...(id ? { id } : {}),
    goal_id: goalId,
    name: metric.name.trim(),
    unit: metric.unit?.trim() ?? '',
    color_key: metric.colorKey || metric.color_key || 'lime',
    created_at: metric.createdAt ?? metric.created_at ?? new Date().toISOString(),
  };
}

export async function getGoals() {
  const { client } = await getUserScopedClient();
  let result = await selectGoalsWithFallback((selectStatement) =>
    client
      .from('goals')
      .select(selectStatement)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  );

  if (isMissingColumnError(result.error, 'sort_order')) {
    result = await selectGoalsWithFallback((selectStatement) =>
      client
        .from('goals')
        .select(selectStatement)
        .order('created_at', { ascending: false }),
    );
  }

  assertSupabaseResult(result);
  return (result.data ?? []).map(toGoal);
}

export async function createGoal(goal) {
  const { client, userId } = await getUserScopedClient();
  const goalPayload = toGoalInsert(goal, userId);
  let insertResult = await client
    .from('goals')
    .insert(goalPayload)
    .select('id, user_id, title, type, goal_type, start_value, target_value, unit, deadline, allow_multiple_entries_per_day, sort_order, created_at')
    .single();

  if (isMissingColumnError(insertResult.error, 'goal_type')
    || isMissingColumnError(insertResult.error, 'start_value')
    || isMissingColumnError(insertResult.error, 'allow_multiple_entries_per_day')
    || isMissingColumnError(insertResult.error, 'sort_order')) {
    const fallbackPayload = getGoalPayloadForMissingColumn(goalPayload, insertResult.error);
    insertResult = await client
      .from('goals')
      .insert(fallbackPayload)
      .select('id')
      .single();

    if (isMissingColumnError(insertResult.error, 'goal_type')
      || isMissingColumnError(insertResult.error, 'start_value')
      || isMissingColumnError(insertResult.error, 'allow_multiple_entries_per_day')
      || isMissingColumnError(insertResult.error, 'sort_order')) {
      insertResult = await client
        .from('goals')
        .insert(withoutSortOrder(withoutAllowMultiple(withoutStartValue(withoutGoalType(goalPayload)))))
        .select('id')
        .single();
    }
  }

  assertSupabaseResult(insertResult);

  const metricRows = (goal.metrics ?? [])
    .filter((metric) => metric.name?.trim())
    .map((metric) => toMetricInsert(metric, insertResult.data.id));

  if (metricRows.length > 0) {
    const metricResult = await client.from('metrics').insert(metricRows);
    assertSupabaseResult(metricResult);
  }

  return getGoalById(insertResult.data.id);
}

export async function upsertGoal(goal) {
  const { client, userId } = await getUserScopedClient();
  const goalPayload = toGoalInsert(goal, userId);
  let upsertResult = await client
    .from('goals')
    .upsert(goalPayload, { onConflict: 'id' })
    .select('id')
    .single();

  if (isMissingColumnError(upsertResult.error, 'goal_type')
    || isMissingColumnError(upsertResult.error, 'start_value')
    || isMissingColumnError(upsertResult.error, 'allow_multiple_entries_per_day')
    || isMissingColumnError(upsertResult.error, 'sort_order')) {
    const fallbackPayload = getGoalPayloadForMissingColumn(goalPayload, upsertResult.error);
    upsertResult = await client
      .from('goals')
      .upsert(fallbackPayload, { onConflict: 'id' })
      .select('id')
      .single();

    if (isMissingColumnError(upsertResult.error, 'goal_type')
      || isMissingColumnError(upsertResult.error, 'start_value')
      || isMissingColumnError(upsertResult.error, 'allow_multiple_entries_per_day')
      || isMissingColumnError(upsertResult.error, 'sort_order')) {
      upsertResult = await client
        .from('goals')
        .upsert(
          withoutSortOrder(withoutAllowMultiple(withoutStartValue(withoutGoalType(goalPayload)))),
          { onConflict: 'id' },
        )
        .select('id')
        .single();
    }
  }

  assertSupabaseResult(upsertResult);

  const metricRows = (goal.metrics ?? [])
    .filter((metric) => metric.name?.trim())
    .map((metric) => toMetricInsert(metric, upsertResult.data.id));

  if (metricRows.length > 0) {
    const metricResult = await client
      .from('metrics')
      .upsert(metricRows, { onConflict: 'id' });
    assertSupabaseResult(metricResult);
  }

  return getGoalById(upsertResult.data.id);
}

export async function getGoalById(goalId) {
  const { client } = await getUserScopedClient();
  const result = await selectGoalsWithFallback((selectStatement) =>
    client
      .from('goals')
      .select(selectStatement)
      .eq('id', goalId)
      .single(),
  );

  assertSupabaseResult(result);
  return toGoal(result.data);
}

export async function updateGoal(goalId, updates) {
  const { client } = await getUserScopedClient();
  const goalUpdates = {
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.type !== undefined ? { type: updates.type } : {}),
    ...(updates.goalType !== undefined
      ? { goal_type: normalizeGoalType(updates.goalType, updates.type) }
      : {}),
    ...(updates.startValue !== undefined
      ? { start_value: parseNullableNumber(updates.startValue) }
      : {}),
    ...(updates.targetValue !== undefined
      ? { target_value: parseNullableNumber(updates.targetValue) }
      : {}),
    ...(updates.unit !== undefined ? { unit: updates.unit.trim() } : {}),
    ...(updates.deadline !== undefined ? { deadline: updates.deadline || null } : {}),
    ...(updates.allowMultipleEntriesPerDay !== undefined
      ? { allow_multiple_entries_per_day: Boolean(updates.allowMultipleEntriesPerDay) }
      : {}),
    ...(updates.sortOrder !== undefined
      ? { sort_order: Number.isFinite(updates.sortOrder) ? updates.sortOrder : 0 }
      : {}),
  };

  if (Object.keys(goalUpdates).length > 0) {
    let result = await client.from('goals').update(goalUpdates).eq('id', goalId);

    if (isMissingColumnError(result.error, 'goal_type')
      || isMissingColumnError(result.error, 'start_value')
      || isMissingColumnError(result.error, 'allow_multiple_entries_per_day')
      || isMissingColumnError(result.error, 'sort_order')) {
      const fallbackUpdates = getGoalPayloadForMissingColumn(goalUpdates, result.error);
      result = await client
        .from('goals')
        .update(fallbackUpdates)
        .eq('id', goalId);

      if (isMissingColumnError(result.error, 'goal_type')
        || isMissingColumnError(result.error, 'start_value')
        || isMissingColumnError(result.error, 'allow_multiple_entries_per_day')
        || isMissingColumnError(result.error, 'sort_order')) {
        result = await client
          .from('goals')
          .update(withoutSortOrder(withoutAllowMultiple(withoutStartValue(withoutGoalType(goalUpdates)))))
          .eq('id', goalId);
      }
    }

    assertSupabaseResult(result);
  }

  return getGoalById(goalId);
}

export async function updateGoalDetails(goalId, updates) {
  const { client } = await getUserScopedClient();
  await updateGoal(goalId, updates);

  if (Array.isArray(updates.metrics)) {
    const existingResult = await client
      .from('metrics')
      .select('id')
      .eq('goal_id', goalId);
    assertSupabaseResult(existingResult);

    const existingMetricIds = new Set((existingResult.data ?? []).map((metric) => metric.id));
    const keptMetricIds = new Set();

    for (const metric of updates.metrics.filter((item) => item.name?.trim())) {
      const metricId = normalizeLegacyUuid(metric.id, 'metric');

      if (metricId && existingMetricIds.has(metricId)) {
        keptMetricIds.add(metricId);
        const result = await client
          .from('metrics')
          .update({
            name: metric.name.trim(),
            unit: metric.unit?.trim() ?? '',
            color_key: metric.colorKey || metric.color_key || 'lime',
          })
          .eq('id', metricId);
        assertSupabaseResult(result);
      } else {
        const result = await client.from('metrics').insert(toMetricInsert(metric, goalId));
        assertSupabaseResult(result);
      }
    }

    const removedMetricIds = [...existingMetricIds].filter((metricId) => !keptMetricIds.has(metricId));

    if (removedMetricIds.length > 0) {
      const valueDeleteResult = await client
        .from('entry_values')
        .delete()
        .in('metric_id', removedMetricIds);
      assertSupabaseResult(valueDeleteResult);

      const metricDeleteResult = await client
        .from('metrics')
        .delete()
        .in('id', removedMetricIds);
      assertSupabaseResult(metricDeleteResult);
    }
  }

  return getGoalById(goalId);
}

export async function deleteGoal(goalId) {
  const { client } = await getUserScopedClient();
  const result = await client.from('goals').delete().eq('id', goalId);
  assertSupabaseResult(result);
}

export async function updateGoalSortOrder(goalOrders) {
  const { client } = await getUserScopedClient();

  for (const goalOrder of goalOrders) {
    const result = await client
      .from('goals')
      .update({ sort_order: goalOrder.sortOrder })
      .eq('id', goalOrder.id);

    if (isMissingColumnError(result.error, 'sort_order')) {
      return false;
    }

    assertSupabaseResult(result);
  }

  return true;
}
