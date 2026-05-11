export function getTrackerErrorMessage(error, fallbackMessage) {
  const message = error?.message || String(error || '');
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('multiple entries need')
    || lowerMessage.includes('latest database migration')
    || lowerMessage.includes('one-log-per-day constraint')
  ) {
    return message;
  }

  if (
    lowerMessage.includes('entry_values_entry_id_fkey')
    || lowerMessage.includes('violates foreign key constraint')
  ) {
    return 'This date already has a saved log. The app will update that date instead of creating a duplicate. Please try saving again.';
  }

  if (
    error?.code === '23505'
    || lowerMessage.includes('duplicate key')
    || lowerMessage.includes('entries_user_id_goal_id_date_key')
  ) {
    return 'This tracker already has a log for that date. Choose another date, or edit the existing daily log.';
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('failed to fetch')) {
    return 'Could not reach the database. Check your connection and try again.';
  }

  return fallbackMessage || 'Something went wrong. Please try again.';
}
