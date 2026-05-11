import { requireSupabase } from '../lib/supabaseClient';
import { getAuthenticatedUserId } from './authSessionService';

export function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeLegacyUuid(value, prefix) {
  if (isUuid(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const prefixValue = prefix ? `${prefix}_` : '';

  if (!value.startsWith(prefixValue)) {
    return null;
  }

  const candidate = value.slice(prefixValue.length);
  return isUuid(candidate) ? candidate : null;
}

export function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

export async function getUserScopedClient() {
  const [client, userId] = await Promise.all([
    Promise.resolve(requireSupabase()),
    getAuthenticatedUserId(),
  ]);

  return { client, userId };
}

export function assertSupabaseResult({ error }) {
  if (error) {
    throw error;
  }
}

export function isMissingColumnError(error, columnName) {
  const haystack = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(columnName.toLowerCase())
    && (
      haystack.includes('schema cache')
      || haystack.includes('column')
      || haystack.includes('42703')
      || haystack.includes('pgrst204')
    );
}
