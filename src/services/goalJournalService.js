import { requireSupabase } from '../lib/supabaseClient';
import {
  assertSupabaseResult,
  getUserScopedClient,
  normalizeLegacyUuid,
} from './supabaseCrud';

const goalJournalSelect = `
  id,
  user_id,
  goal_id,
  entry_date,
  mood,
  content,
  created_at,
  updated_at
`;

function isMissingGoalJournalTable(error) {
  const errorText = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return errorText.includes('goal_journal_entries')
    && (
      errorText.includes('schema cache')
      || errorText.includes('relation')
      || errorText.includes('table')
      || errorText.includes('42p01')
      || errorText.includes('pgrst205')
    );
}

function getMissingGoalJournalMessage() {
  return 'Goal journal storage is not ready yet. Apply the Supabase schema migration, then try again.';
}

export function toGoalJournalEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    entryDate: row.entry_date,
    mood: row.mood ?? '',
    content: row.content ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGoalJournalPayload(entry, userId) {
  const id = normalizeLegacyUuid(entry.id, 'journal');
  const now = new Date().toISOString();

  return {
    ...(id ? { id } : {}),
    user_id: userId,
    goal_id: entry.goalId ?? entry.goal_id,
    entry_date: entry.entryDate ?? entry.entry_date,
    mood: entry.mood?.trim() ?? '',
    content: entry.content?.trim() ?? '',
    created_at: entry.createdAt ?? entry.created_at ?? now,
    updated_at: now,
  };
}

export async function getGoalJournalEntries() {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('goal_journal_entries')
    .select(goalJournalSelect)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (isMissingGoalJournalTable(result.error)) {
    return [];
  }

  assertSupabaseResult(result);
  return (result.data ?? []).map(toGoalJournalEntry);
}

export async function createGoalJournalEntry(entry) {
  const { client, userId } = await getUserScopedClient();
  const journalPayload = toGoalJournalPayload(entry, userId);
  const result = await client
    .from('goal_journal_entries')
    .insert(journalPayload)
    .select(goalJournalSelect)
    .single();

  if (isMissingGoalJournalTable(result.error)) {
    throw new Error(getMissingGoalJournalMessage());
  }

  assertSupabaseResult(result);
  return toGoalJournalEntry(result.data);
}

export async function updateGoalJournalEntry(entryId, updates) {
  const { client } = await getUserScopedClient();
  const journalUpdates = {
    ...(updates.entryDate !== undefined ? { entry_date: updates.entryDate } : {}),
    ...(updates.mood !== undefined ? { mood: updates.mood.trim() } : {}),
    ...(updates.content !== undefined ? { content: updates.content.trim() } : {}),
    updated_at: new Date().toISOString(),
  };

  const result = await client
    .from('goal_journal_entries')
    .update(journalUpdates)
    .eq('id', entryId)
    .select(goalJournalSelect)
    .single();

  if (isMissingGoalJournalTable(result.error)) {
    throw new Error(getMissingGoalJournalMessage());
  }

  assertSupabaseResult(result);
  return toGoalJournalEntry(result.data);
}

export async function deleteGoalJournalEntry(entryId) {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('goal_journal_entries')
    .delete()
    .eq('id', entryId);

  if (isMissingGoalJournalTable(result.error)) {
    throw new Error(getMissingGoalJournalMessage());
  }

  assertSupabaseResult(result);
}

export function subscribeToGoalJournalEntries(userId, onChange) {
  const client = requireSupabase();

  return client
    .channel(`goal_journal_entries:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goal_journal_entries',
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
}
