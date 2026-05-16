import { requireSupabase } from '../lib/supabaseClient';
import {
  assertSupabaseResult,
  getUserScopedClient,
  normalizeLegacyUuid,
} from './supabaseCrud';

const goalQuoteSelect = `
  id,
  user_id,
  goal_id,
  content,
  is_pinned,
  created_at,
  updated_at
`;

function isMissingGoalQuoteTable(error) {
  const errorText = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return errorText.includes('goal_quotes')
    && (
      errorText.includes('schema cache')
      || errorText.includes('relation')
      || errorText.includes('table')
      || errorText.includes('42p01')
      || errorText.includes('pgrst205')
    );
}

function getMissingGoalQuoteMessage() {
  return 'Goal quote storage is not ready yet. Apply the Supabase schema migration, then try again.';
}

export function toGoalQuote(row) {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    content: row.content ?? '',
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGoalQuotePayload(quote, userId) {
  const id = normalizeLegacyUuid(quote.id, 'quote');
  const now = new Date().toISOString();

  return {
    ...(id ? { id } : {}),
    user_id: userId,
    goal_id: quote.goalId ?? quote.goal_id,
    content: quote.content?.trim() ?? '',
    is_pinned: Boolean(quote.isPinned ?? quote.is_pinned),
    created_at: quote.createdAt ?? quote.created_at ?? now,
    updated_at: now,
  };
}

async function clearPinnedGoalQuotes(client, goalId, exceptQuoteId = null) {
  let query = client
    .from('goal_quotes')
    .update({ is_pinned: false, updated_at: new Date().toISOString() })
    .eq('goal_id', goalId);

  if (exceptQuoteId) {
    query = query.neq('id', exceptQuoteId);
  }

  const result = await query;

  if (isMissingGoalQuoteTable(result.error)) {
    throw new Error(getMissingGoalQuoteMessage());
  }

  assertSupabaseResult(result);
}

export async function getGoalQuotes() {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('goal_quotes')
    .select(goalQuoteSelect)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (isMissingGoalQuoteTable(result.error)) {
    return [];
  }

  assertSupabaseResult(result);
  return (result.data ?? []).map(toGoalQuote);
}

export async function createGoalQuote(quote) {
  const { client, userId } = await getUserScopedClient();
  const quotePayload = toGoalQuotePayload(quote, userId);

  if (quotePayload.is_pinned) {
    await clearPinnedGoalQuotes(client, quotePayload.goal_id);
  }

  const result = await client
    .from('goal_quotes')
    .insert(quotePayload)
    .select(goalQuoteSelect)
    .single();

  if (isMissingGoalQuoteTable(result.error)) {
    throw new Error(getMissingGoalQuoteMessage());
  }

  assertSupabaseResult(result);
  return toGoalQuote(result.data);
}

export async function updateGoalQuote(quoteId, updates) {
  const { client } = await getUserScopedClient();

  if (updates.isPinned) {
    await clearPinnedGoalQuotes(client, updates.goalId ?? updates.goal_id, quoteId);
  }

  const quoteUpdates = {
    ...(updates.content !== undefined ? { content: updates.content.trim() } : {}),
    ...(updates.isPinned !== undefined ? { is_pinned: Boolean(updates.isPinned) } : {}),
    updated_at: new Date().toISOString(),
  };

  const result = await client
    .from('goal_quotes')
    .update(quoteUpdates)
    .eq('id', quoteId)
    .select(goalQuoteSelect)
    .single();

  if (isMissingGoalQuoteTable(result.error)) {
    throw new Error(getMissingGoalQuoteMessage());
  }

  assertSupabaseResult(result);
  return toGoalQuote(result.data);
}

export async function pinGoalQuote(quote) {
  return updateGoalQuote(quote.id, {
    goalId: quote.goalId,
    isPinned: true,
  });
}

export async function deleteGoalQuote(quoteId) {
  const { client } = await getUserScopedClient();
  const result = await client
    .from('goal_quotes')
    .delete()
    .eq('id', quoteId);

  if (isMissingGoalQuoteTable(result.error)) {
    throw new Error(getMissingGoalQuoteMessage());
  }

  assertSupabaseResult(result);
}

export function subscribeToGoalQuotes(userId, onChange) {
  const client = requireSupabase();

  return client
    .channel(`goal_quotes:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goal_quotes',
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
}
