import { useEffect, useMemo, useState } from 'react';
import { getAppHref } from '../../app/useRoute';
import { PageShell } from '../../components/layout/PageShell';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { createEntry, deleteEntry, getEntries, subscribeToEntries, updateEntry } from '../../services/entryService';
import {
  createGoalJournalEntry,
  deleteGoalJournalEntry,
  getGoalJournalEntries,
  subscribeToGoalJournalEntries,
  updateGoalJournalEntry,
} from '../../services/goalJournalService';
import {
  createGoalQuote,
  deleteGoalQuote,
  getGoalQuotes,
  pinGoalQuote,
  subscribeToGoalQuotes,
  updateGoalQuote,
} from '../../services/goalQuoteService';
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
  updateGoalDetails,
  updateGoalSortOrder,
} from '../../services/goalService';
import { EntryForm } from './EntryForm';
import { EntryList } from './EntryList';
import { GoalChart } from './GoalChart';
import { GoalForm } from './GoalForm';
import { GoalList } from './GoalList';
import { GoalJournalPanel, GoalPinnedQuote, GoalVisionPanel } from './GoalMindsetPanel';
import { GoalStats } from './GoalStats';
import { GOAL_ORDER_STORAGE_KEY } from './progressTrackerStorage';
import { getTrackerErrorMessage } from './trackerErrorMessages';

const trackerViews = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'new-tracker', label: 'New Tracker' },
];

const goalDetailViews = [
  { id: 'progress', label: 'Progress' },
  { id: 'vision', label: 'Vision' },
  { id: 'journal', label: 'Journal' },
];

function readLocalGoalOrder() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(GOAL_ORDER_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function saveLocalGoalOrder(goals) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    GOAL_ORDER_STORAGE_KEY,
    JSON.stringify(goals.map((goal) => goal.id)),
  );
}

function applyLocalGoalOrder(goals) {
  const localOrder = readLocalGoalOrder();

  if (localOrder.length === 0) {
    return goals;
  }

  const orderMap = new Map(localOrder.map((goalId, index) => [goalId, index]));

  return [...goals].sort((leftGoal, rightGoal) => {
    const leftOrder = orderMap.has(leftGoal.id)
      ? orderMap.get(leftGoal.id)
      : Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.has(rightGoal.id)
      ? orderMap.get(rightGoal.id)
      : Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return (leftGoal.sortOrder ?? 0) - (rightGoal.sortOrder ?? 0);
  });
}

export function ProgressTracker() {
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();
  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [goalJournalEntries, setGoalJournalEntries] = useState([]);
  const [goalQuotes, setGoalQuotes] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [activeGoalDetailView, setActiveGoalDetailView] = useState('progress');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReflectionSaving, setIsReflectionSaving] = useState(false);
  const [isJournalSaving, setIsJournalSaving] = useState(false);
  const [isQuoteSaving, setIsQuoteSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadTrackerData() {
    setError('');

    try {
      const [savedGoals, savedEntries, savedGoalJournalEntries, savedGoalQuotes] = await Promise.all([
        getGoals(),
        getEntries(),
        getGoalJournalEntries(),
        getGoalQuotes(),
      ]);

      setGoals(applyLocalGoalOrder(savedGoals));
      setEntries(savedEntries);
      setGoalJournalEntries(savedGoalJournalEntries);
      setGoalQuotes(savedGoalQuotes);
    } catch (loadError) {
      setError(
        getTrackerErrorMessage(
          loadError,
          'Could not load tracker data. Please refresh and try again.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    loadTrackerData();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const entriesChannel = subscribeToEntries(user.id, () => {
      getEntries()
        .then(setEntries)
        .catch((entryError) => setError(
          getTrackerErrorMessage(
            entryError,
            'Could not refresh tracker entries. Please try again.',
          ),
        ));
    });
    const goalJournalChannel = subscribeToGoalJournalEntries(user.id, () => {
      getGoalJournalEntries()
        .then(setGoalJournalEntries)
        .catch((journalError) => setError(
          getTrackerErrorMessage(
            journalError,
            'Could not refresh goal journal entries. Please try again.',
          ),
        ));
    });
    const goalQuotesChannel = subscribeToGoalQuotes(user.id, () => {
      getGoalQuotes()
        .then(setGoalQuotes)
        .catch((quoteError) => setError(
          getTrackerErrorMessage(
            quoteError,
            'Could not refresh goal quotes. Please try again.',
          ),
        ));
    });

    return () => {
      entriesChannel.unsubscribe();
      goalJournalChannel.unsubscribe();
      goalQuotesChannel.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (goals.length === 0) {
      setSelectedGoalId('');
      setEditingEntry(null);
      setActiveGoalDetailView('progress');
      return;
    }

    if (selectedGoalId && !goals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId('');
      setActiveGoalDetailView('progress');
    }
  }, [goals, selectedGoalId]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId),
    [goals, selectedGoalId],
  );
  const selectedGoalEntries = useMemo(
    () => entries.filter((entry) => entry.goalId === selectedGoalId),
    [entries, selectedGoalId],
  );
  const selectedGoalJournalEntries = useMemo(
    () => goalJournalEntries.filter((entry) => entry.goalId === selectedGoalId),
    [goalJournalEntries, selectedGoalId],
  );
  const selectedGoalQuotes = useMemo(
    () => goalQuotes.filter((quote) => quote.goalId === selectedGoalId),
    [goalQuotes, selectedGoalId],
  );

  async function handleCreateGoal(goal) {
    setIsSaving(true);
    setError('');

    try {
      const savedGoal = await createGoal({
        ...goal,
        sortOrder: goals.length,
      });
      setGoals((current) => [savedGoal, ...current]);
      setSelectedGoalId(savedGoal.id);
      setActiveView('dashboard');
      setActiveGoalDetailView('progress');
    } catch (createError) {
      setError(
        getTrackerErrorMessage(
          createError,
          'Could not create this tracker. Please check the fields and try again.',
        ),
      );
      throw createError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEntry(entry) {
    const goal = goals.find((savedGoal) => savedGoal.id === entry.goalId);
    const existingEntry = entries.find((savedEntry) =>
      savedEntry.goalId === entry.goalId
      && savedEntry.date === entry.date
      && savedEntry.id !== editingEntry?.id
    );

    if (editingEntry && existingEntry && !goal?.allowMultipleEntriesPerDay) {
      setError(
        `This tracker only allows one entry on ${entry.date}. Edit that existing entry or choose another date.`,
      );
      return false;
    }

    if (!editingEntry && existingEntry && !goal?.allowMultipleEntriesPerDay) {
      const confirmed = await confirm({
        title: 'Override existing log?',
        message: `This tracker already has a log for ${entry.date}. Saving now will replace that date's values and note.`,
        confirmLabel: 'Override',
      });

      if (!confirmed) {
        return false;
      }
    }

    setIsSaving(true);
    setError('');

    try {
      const savedEntry = editingEntry
        ? await updateEntry(entry.id, entry)
        : await createEntry(entry, {
          allowMultipleEntriesPerDay: goal?.allowMultipleEntriesPerDay,
        });

      setEntries((current) => [
        savedEntry,
        ...current.filter((currentEntry) => currentEntry.id !== savedEntry.id),
      ]);
      setEditingEntry(null);
      setIsLogPanelOpen(false);
      setActiveView('dashboard');
    } catch (saveError) {
      setError(
        getTrackerErrorMessage(
          saveError,
          'Could not save this entry. Please check the date and metric values, then try again.',
        ),
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditEntry(entry) {
    setSelectedGoalId(entry.goalId);
    setEditingEntry(entry);
    setEditingGoal(null);
    setIsLogPanelOpen(true);
    setActiveView('dashboard');
    setActiveGoalDetailView('progress');
  }

  async function handleDeleteEntry(entryId) {
    const entry = entries.find((savedEntry) => savedEntry.id === entryId);
    const confirmed = await confirm({
      title: 'Delete daily entry?',
      message: `This will remove the entry from ${entry?.date || 'this date'}.`,
      confirmLabel: 'Delete',
    });

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteEntry(entryId);
      const refreshedEntries = await getEntries();
      setEntries(refreshedEntries);
      if (editingEntry?.id === entryId) {
        setEditingEntry(null);
      }
    } catch (deleteError) {
      setError(
        getTrackerErrorMessage(
          deleteError,
          'Could not delete this entry. Please try again.',
        ),
      );
    }
  }

  async function handleDeleteGoal(goalId) {
    const goal = goals.find((savedGoal) => savedGoal.id === goalId);
    const confirmed = await confirm({
      title: 'Delete goal?',
      message: `This will remove "${goal?.title || 'this goal'}" and every entry saved under it.`,
      confirmLabel: 'Delete',
    });

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteGoal(goalId);
      setGoals((current) => current.filter((savedGoal) => savedGoal.id !== goalId));
      setEntries((current) => current.filter((entry) => entry.goalId !== goalId));
      setGoalJournalEntries((current) => current.filter((entry) => entry.goalId !== goalId));
      setGoalQuotes((current) => current.filter((quote) => quote.goalId !== goalId));
      if (selectedGoalId === goalId) {
        setSelectedGoalId('');
        setIsLogPanelOpen(false);
        setActiveGoalDetailView('progress');
      }
    } catch (deleteError) {
      setError(
        getTrackerErrorMessage(
          deleteError,
          'Could not delete this tracker. Please try again.',
        ),
      );
    }
  }

  async function handleUpdateGoal(goal) {
    setIsSaving(true);
    setError('');

    try {
      const savedGoal = await updateGoalDetails(goal.id, goal);
      setGoals((current) =>
        current.map((currentGoal) =>
          currentGoal.id === savedGoal.id ? savedGoal : currentGoal,
        ),
      );
      setEditingGoal(null);
    } catch (updateError) {
      setError(
        getTrackerErrorMessage(
          updateError,
          'Could not update this tracker. Please check the fields and try again.',
        ),
      );
      throw updateError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveGoalReflection(goalId, reflection) {
    setIsReflectionSaving(true);
    setError('');

    try {
      const savedGoal = await updateGoal(goalId, reflection);

      if (
        (reflection.vision && savedGoal.vision !== reflection.vision)
        || (reflection.quote && savedGoal.quote !== reflection.quote)
      ) {
        throw new Error(
          'Goal vision storage is not ready yet. Apply the Supabase schema migration, then try again.',
        );
      }

      setGoals((current) =>
        current.map((currentGoal) =>
          currentGoal.id === savedGoal.id ? savedGoal : currentGoal,
        ),
      );
      return true;
    } catch (reflectionError) {
      setError(
        getTrackerErrorMessage(
          reflectionError,
          'Could not save this goal vision. Please try again.',
        ),
      );
      throw reflectionError;
    } finally {
      setIsReflectionSaving(false);
    }
  }

  async function handleSaveGoalJournalEntry(journalEntry) {
    setIsJournalSaving(true);
    setError('');

    try {
      const savedJournalEntry = goalJournalEntries.some((entry) => entry.id === journalEntry.id)
        ? await updateGoalJournalEntry(journalEntry.id, journalEntry)
        : await createGoalJournalEntry(journalEntry);

      setGoalJournalEntries((current) => [
        savedJournalEntry,
        ...current.filter((entry) => entry.id !== savedJournalEntry.id),
      ]);
      return true;
    } catch (journalError) {
      setError(
        getTrackerErrorMessage(
          journalError,
          'Could not save this goal journal entry. Please try again.',
        ),
      );
      throw journalError;
    } finally {
      setIsJournalSaving(false);
    }
  }

  async function handleDeleteGoalJournalEntry(journalEntryId) {
    const confirmed = await confirm({
      title: 'Delete journal entry?',
      message: 'This removes the reflection from this goal journal.',
      confirmLabel: 'Delete',
    });

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteGoalJournalEntry(journalEntryId);
      setGoalJournalEntries((current) =>
        current.filter((entry) => entry.id !== journalEntryId),
      );
    } catch (journalError) {
      setError(
        getTrackerErrorMessage(
          journalError,
          'Could not delete this goal journal entry. Please try again.',
        ),
      );
    }
  }

  async function handleSaveGoalQuote(quote) {
    setIsQuoteSaving(true);
    setError('');

    try {
      const savedQuote = goalQuotes.some((currentQuote) => currentQuote.id === quote.id)
        ? await updateGoalQuote(quote.id, quote)
        : await createGoalQuote(quote);

      setGoalQuotes((current) => {
        const withoutSavedQuote = current.filter((currentQuote) => currentQuote.id !== savedQuote.id);
        const nextQuotes = savedQuote.isPinned
          ? withoutSavedQuote.map((currentQuote) =>
            currentQuote.goalId === savedQuote.goalId
              ? { ...currentQuote, isPinned: false }
              : currentQuote,
          )
          : withoutSavedQuote;

        return [savedQuote, ...nextQuotes];
      });
      return true;
    } catch (quoteError) {
      setError(
        getTrackerErrorMessage(
          quoteError,
          'Could not save this goal quote. Please try again.',
        ),
      );
      throw quoteError;
    } finally {
      setIsQuoteSaving(false);
    }
  }

  async function handlePinGoalQuote(quote) {
    setIsQuoteSaving(true);
    setError('');

    try {
      const pinnedQuote = await pinGoalQuote(quote);
      setGoalQuotes((current) =>
        current.map((currentQuote) => {
          if (currentQuote.id === pinnedQuote.id) {
            return pinnedQuote;
          }

          if (currentQuote.goalId === pinnedQuote.goalId) {
            return { ...currentQuote, isPinned: false };
          }

          return currentQuote;
        }),
      );
    } catch (quoteError) {
      setError(
        getTrackerErrorMessage(
          quoteError,
          'Could not pin this goal quote. Please try again.',
        ),
      );
      throw quoteError;
    } finally {
      setIsQuoteSaving(false);
    }
  }

  async function handleDeleteGoalQuote(quoteId) {
    const quote = goalQuotes.find((currentQuote) => currentQuote.id === quoteId);
    const confirmed = await confirm({
      title: 'Delete quote?',
      message: quote?.isPinned
        ? 'This removes the quote currently shown on the goal dashboard.'
        : 'This removes the quote from this goal.',
      confirmLabel: 'Delete',
    });

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteGoalQuote(quoteId);
      setGoalQuotes((current) => current.filter((currentQuote) => currentQuote.id !== quoteId));
    } catch (quoteError) {
      setError(
        getTrackerErrorMessage(
          quoteError,
          'Could not delete this goal quote. Please try again.',
        ),
      );
    }
  }

  async function handleReorderGoals(nextGoals) {
    const orderedGoals = nextGoals.map((goal, index) => ({
      ...goal,
      sortOrder: index,
    }));

    setGoals(orderedGoals);
    setError('');

    try {
      saveLocalGoalOrder(orderedGoals);
      const didPersist = await updateGoalSortOrder(
        orderedGoals.map((goal) => ({
          id: goal.id,
          sortOrder: goal.sortOrder,
        })),
      );

      if (didPersist === false) {
        return;
      }
    } catch (orderError) {
      saveLocalGoalOrder(orderedGoals);
      console.warn('Goal order was saved locally, but could not sync to Supabase.', orderError);
    }
  }

  return (
    <PageShell>
      <section className="panel p-6 sm:p-8 lg:p-10">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            <a
              href={getAppHref('/board')}
              className="inline-flex items-center rounded-full border border-black/85 bg-[#fffdf8] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition hover:bg-white"
            >
              C Board
            </a>
            <a
              href={getAppHref('/calculators')}
              className="inline-flex items-center rounded-full border border-black/85 bg-[#fffdf8] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition hover:bg-white"
            >
              Calculator Tools
            </a>
            <a
              href={getAppHref('/progress-tracker')}
              className="inline-flex items-center rounded-full border border-black/85 bg-[#c5ff6f] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition"
            >
              Progress Tracker
            </a>
          </div>
        </nav>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <span className="pill">Progress tracker</span>
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl lg:text-6xl">
          Build goals that show their work
        </h1>

        <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-black/70 sm:text-lg">
          Create performance, completion, or consistency goals and track each
          one with the dashboard behavior that fits it.
        </p>

        {error ? (
          <p className="mt-5 rounded-[1rem] border-2 border-black bg-[#ffe0de] px-4 py-3 text-sm font-bold text-black">
            {error}
          </p>
        ) : null}

        <div className="mt-7 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {trackerViews.map((view) => {
              const isActive = activeView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={`inline-flex items-center rounded-full border border-black/85 px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition ${
                    isActive
                      ? 'bg-[#c5ff6f]'
                      : 'bg-[#fffdf8] hover:bg-white'
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-[1.75rem] border-2 border-black bg-[#fffdf8] p-6 text-lg font-bold text-black">
            Loading tracker data...
          </div>
        ) : null}

        {!isLoading && activeView === 'dashboard' ? (
          <>
            <div className="mt-8 grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              {isLogPanelOpen && selectedGoal ? (
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEntry(null);
                      setIsLogPanelOpen(false);
                    }}
                    className="justify-self-start rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000]"
                  >
                    Back to tracker list
                  </button>
                  <EntryForm
                    goals={goals}
                    selectedGoalId={selectedGoal.id}
                    onSelectGoal={() => {}}
                    editingEntry={editingEntry}
                    onSaveEntry={handleSaveEntry}
                    onCancelEdit={() => {
                      setEditingEntry(null);
                      setIsLogPanelOpen(false);
                    }}
                    hideGoalSelect
                    isSaving={isSaving}
                  />
                </div>
              ) : (
                <GoalList
                  goals={goals}
                  selectedGoalId={selectedGoalId}
                  entries={entries}
                  onSelectGoal={(goalId) => {
                    setSelectedGoalId(goalId);
                    setEditingEntry(null);
                    setEditingGoal(null);
                    setIsLogPanelOpen(false);
                    setActiveGoalDetailView('progress');
                  }}
                  onEditGoal={(goal) => {
                    setSelectedGoalId(goal.id);
                    setEditingGoal(goal);
                    setIsLogPanelOpen(false);
                    setActiveGoalDetailView('progress');
                  }}
                  onLogGoal={(goalId) => {
                    setSelectedGoalId(goalId);
                    setEditingGoal(null);
                    setEditingEntry(null);
                    setIsLogPanelOpen(true);
                    setActiveGoalDetailView('progress');
                  }}
                  onReorderGoals={handleReorderGoals}
                />
              )}
              {editingGoal ? (
                <GoalForm
                  initialGoal={editingGoal}
                  onSubmitGoal={handleUpdateGoal}
                  onCancel={() => setEditingGoal(null)}
                  isSaving={isSaving}
                />
              ) : (
                <div className="grid gap-3">
                  {selectedGoal ? (
                    <GoalPinnedQuote goal={selectedGoal} quotes={selectedGoalQuotes} />
                  ) : null}
                  <GoalStats goal={selectedGoal} entries={selectedGoalEntries} />
                  {selectedGoal ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingGoal(selectedGoal)}
                        className="rounded-full border-2 border-black bg-[#9fe3ff] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000]"
                      >
                        Edit goal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(selectedGoal.id)}
                        className="rounded-full border-2 border-black bg-[#ffe0de] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000] transition hover:bg-[#ffb4ad]"
                      >
                        Delete goal
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {selectedGoal && !editingGoal && !isLogPanelOpen ? (
              <div className="mt-5 grid gap-5">
                <div className="overflow-x-auto">
                  <div className="flex min-w-max gap-2">
                    {goalDetailViews.map((view) => {
                      const isActive = activeGoalDetailView === view.id;

                      return (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => setActiveGoalDetailView(view.id)}
                          className={`inline-flex items-center rounded-full border-2 border-black px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black transition ${
                            isActive
                              ? 'bg-[#c5ff6f] shadow-[3px_3px_0_#000]'
                              : 'bg-[#fffdf8] hover:bg-white'
                          }`}
                        >
                          {view.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeGoalDetailView === 'progress' ? (
                  <>
                    <GoalChart goal={selectedGoal} entries={selectedGoalEntries} />
                    <EntryList
                      goal={selectedGoal}
                      entries={selectedGoalEntries}
                      onEditEntry={handleEditEntry}
                      onDeleteEntry={handleDeleteEntry}
                    />
                  </>
                ) : null}

                {activeGoalDetailView === 'vision' ? (
                  <GoalVisionPanel
                    goal={selectedGoal}
                    goalQuotes={selectedGoalQuotes}
                    onSaveReflection={handleSaveGoalReflection}
                    onSaveQuote={handleSaveGoalQuote}
                    onPinQuote={handlePinGoalQuote}
                    onDeleteQuote={handleDeleteGoalQuote}
                    isSaving={isReflectionSaving}
                    isQuoteSaving={isQuoteSaving}
                  />
                ) : null}

                {activeGoalDetailView === 'journal' ? (
                  <GoalJournalPanel
                    goal={selectedGoal}
                    journalEntries={selectedGoalJournalEntries}
                    onSaveJournalEntry={handleSaveGoalJournalEntry}
                    onDeleteJournalEntry={handleDeleteGoalJournalEntry}
                    isSaving={isJournalSaving}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {!isLoading && activeView === 'new-tracker' ? (
          <div className="mt-8 max-w-3xl">
            <GoalForm onCreateGoal={handleCreateGoal} isSaving={isSaving} />
          </div>
        ) : null}
        <ConfirmDialog isOpen={Boolean(dialog)} {...dialog} />
      </section>
    </PageShell>
  );
}
