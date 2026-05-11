import {
  assertSupabaseResult,
  getUserScopedClient,
  isMissingColumnError,
  normalizeLegacyUuid,
  parseNullableNumber,
} from './supabaseCrud';
import { requireSupabase } from '../lib/supabaseClient';

const entrySelectWithCompletion = `
  id,
  user_id,
  goal_id,
  date,
  completed,
  note,
  created_at,
  entry_values (
    id,
    entry_id,
    metric_id,
    value
  )
`;

const legacyEntrySelect = entrySelectWithCompletion.replace('  completed,\n', '');

export function toEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    date: row.date,
    completed: typeof row.completed === 'boolean' ? row.completed : null,
    note: row.note ?? '',
    createdAt: row.created_at,
    values: Object.fromEntries(
      (row.entry_values ?? [])
        .map((entryValue) => [
          entryValue.metric_id,
          parseNullableNumber(entryValue.value),
        ])
        .filter(([, value]) => Number.isFinite(value)),
    ),
  };
}

function toEntryPayload(entry, userId) {
  const id = normalizeLegacyUuid(entry.id, 'entry');

  return {
    ...(id ? { id } : {}),
    user_id: userId,
    goal_id: entry.goalId ?? entry.goal_id,
    date: entry.date,
    completed: typeof entry.completed === 'boolean' ? entry.completed : null,
    note: entry.note?.trim() ?? '',
    created_at: entry.createdAt ?? entry.created_at ?? new Date().toISOString(),
  };
}

function withoutCompleted(entryPayload) {
  const { completed: _completed, ...legacyPayload } = entryPayload;
  return legacyPayload;
}

function isEntryDateConflict(error) {
  const errorText = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return error?.code === '23505'
    || errorText.includes('duplicate key')
    || errorText.includes('entries_user_id_goal_id_date_key');
}

function toEntryValueRows(entryId, values) {
  return Object.entries(values ?? {})
    .map(([metricId, value]) => ({
      entry_id: entryId,
      metric_id: metricId,
      value: parseNullableNumber(value),
    }))
    .filter((entryValue) => Number.isFinite(entryValue.value));
}

async function getExistingEntryId(client, goalId, date) {
  const { data, error } = await client
    .from('entries')
    .select('id')
    .eq('goal_id', goalId)
    .eq('date', date)
    .order('created_at', { ascending: false })
    .limit(1);

  assertSupabaseResult({ error });
  return data?.[0]?.id ?? null;
}

async function replaceEntryValues(client, entryId, values) {
  const deleteResult = await client
    .from('entry_values')
    .delete()
    .eq('entry_id', entryId);
  assertSupabaseResult(deleteResult);

  const valueRows = toEntryValueRows(entryId, values);

  if (valueRows.length === 0) {
    return;
  }

  const insertResult = await client.from('entry_values').insert(valueRows);
  assertSupabaseResult(insertResult);
}

export async function getEntries() {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('entries')
    .select(entrySelectWithCompletion)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (isMissingColumnError(result.error, 'completed')) {
    const legacyResult = await client
      .from('entries')
      .select(legacyEntrySelect)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    assertSupabaseResult(legacyResult);
    return (legacyResult.data ?? []).map(toEntry);
  }

  assertSupabaseResult(result);
  return (result.data ?? []).map(toEntry);
}

export async function getEntriesByGoal(goalId) {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('entries')
    .select(entrySelectWithCompletion)
    .eq('goal_id', goalId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (isMissingColumnError(result.error, 'completed')) {
    const legacyResult = await client
      .from('entries')
      .select(legacyEntrySelect)
      .eq('goal_id', goalId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    assertSupabaseResult(legacyResult);
    return (legacyResult.data ?? []).map(toEntry);
  }

  assertSupabaseResult(result);
  return (result.data ?? []).map(toEntry);
}

export async function createEntry(entry, options = {}) {
  const { client, userId } = await getUserScopedClient();
  const entryPayload = toEntryPayload(entry, userId);
  const goalId = entryPayload.goal_id;
  const allowMultipleEntriesPerDay = Boolean(options.allowMultipleEntriesPerDay);
  const existingEntryId = allowMultipleEntriesPerDay
    ? null
    : await getExistingEntryId(client, goalId, entryPayload.date);

  if (existingEntryId) {
    let updateResult = await client
      .from('entries')
      .update({ note: entryPayload.note, completed: entryPayload.completed })
      .eq('id', existingEntryId)
      .select('id')
      .single();

    if (isMissingColumnError(updateResult.error, 'completed')) {
      updateResult = await client
        .from('entries')
        .update({ note: entryPayload.note })
        .eq('id', existingEntryId)
        .select('id')
        .single();
    }

    assertSupabaseResult(updateResult);
    await replaceEntryValues(client, existingEntryId, entry.values);
    return getEntryById(existingEntryId);
  }

  let insertResult = await client
    .from('entries')
    .insert(entryPayload)
    .select('id')
    .single();

  if (isMissingColumnError(insertResult.error, 'completed')) {
    insertResult = await client
      .from('entries')
      .insert(withoutCompleted(entryPayload))
      .select('id')
      .single();
  }

  if (isEntryDateConflict(insertResult.error) && allowMultipleEntriesPerDay) {
    throw new Error(
      'Multiple entries are enabled, but Supabase still has the old one-log-per-day constraint. Apply the tracker schema migration to drop entries_user_id_goal_id_date_key, then try again.',
    );
  }

  if (isEntryDateConflict(insertResult.error)) {
    const conflictEntryId = await getExistingEntryId(client, goalId, entryPayload.date);

    if (conflictEntryId) {
      let updateResult = await client
        .from('entries')
        .update({ note: entryPayload.note, completed: entryPayload.completed })
        .eq('id', conflictEntryId)
        .select('id')
        .single();

      if (isMissingColumnError(updateResult.error, 'completed')) {
        updateResult = await client
          .from('entries')
          .update({ note: entryPayload.note })
          .eq('id', conflictEntryId)
          .select('id')
          .single();
      }

      assertSupabaseResult(updateResult);
      await replaceEntryValues(client, conflictEntryId, entry.values);
      return getEntryById(conflictEntryId);
    }
  }

  assertSupabaseResult(insertResult);
  await replaceEntryValues(client, insertResult.data.id, entry.values);
  return getEntryById(insertResult.data.id);
}

export async function getEntryById(entryId) {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('entries')
    .select(entrySelectWithCompletion)
    .eq('id', entryId)
    .single();

  if (isMissingColumnError(result.error, 'completed')) {
    const legacyResult = await client
      .from('entries')
      .select(legacyEntrySelect)
      .eq('id', entryId)
      .single();

    assertSupabaseResult(legacyResult);
    return toEntry(legacyResult.data);
  }

  assertSupabaseResult(result);
  return toEntry(result.data);
}

export async function updateEntry(entryId, entry) {
  const { client } = await getUserScopedClient();
  const entryUpdates = {
    goal_id: entry.goalId ?? entry.goal_id,
    date: entry.date,
    completed: typeof entry.completed === 'boolean' ? entry.completed : null,
    note: entry.note?.trim() ?? '',
  };
  let updateResult = await client
    .from('entries')
    .update(entryUpdates)
    .eq('id', entryId)
    .select('id')
    .single();

  if (isMissingColumnError(updateResult.error, 'completed')) {
    updateResult = await client
      .from('entries')
      .update(withoutCompleted(entryUpdates))
      .eq('id', entryId)
      .select('id')
      .single();
  }

  assertSupabaseResult(updateResult);
  await replaceEntryValues(client, updateResult.data.id, entry.values);
  return getEntryById(updateResult.data.id);
}

export async function deleteEntry(entryId) {
  const { client } = await getUserScopedClient();
  const valuesResult = await client
    .from('entry_values')
    .delete()
    .eq('entry_id', entryId);
  assertSupabaseResult(valuesResult);

  const entryResult = await client.from('entries').delete().eq('id', entryId);
  assertSupabaseResult(entryResult);
}

export function subscribeToEntries(userId, onChange) {
  const client = requireSupabase();

  return client
    .channel(`entries:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'entries',
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
}
