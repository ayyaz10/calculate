import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '../../components/layout/PageShell';
import { useAuth } from '../../contexts/AuthContext';
import { createEntry, deleteEntry, getEntries, subscribeToEntries, updateEntry } from '../../services/entryService';
import { createGoal, deleteGoal, getGoals } from '../../services/goalService';
import { EntryForm } from './EntryForm';
import { GoalChart } from './GoalChart';
import { GoalForm } from './GoalForm';
import { GoalList } from './GoalList';
import { GoalStats } from './GoalStats';
import { metricColors } from './progressTrackerStorage';

const trackerViews = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'new-tracker', label: 'New Tracker' },
  { id: 'daily-log', label: 'Daily Log' },
];

function sortEntriesNewestFirst(entries) {
  return [...entries].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    return dateCompare || b.createdAt.localeCompare(a.createdAt);
  });
}

function EntryHistory({ goal, entries, onEditEntry, onDeleteEntry }) {
  return (
    <section className="rounded-[1.75rem] border-2 border-black bg-[#9fe3ff] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            History
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
            Past entries
          </h2>
        </div>
        <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
          Edit ready
        </span>
      </div>

      {!goal ? (
        <div className="mt-5 rounded-[1.35rem] border-2 border-black bg-white px-4 py-5 text-sm font-bold leading-6 text-black/70">
          Select a goal to review entries.
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-5 rounded-[1.35rem] border-2 border-black bg-white px-4 py-5 text-sm font-bold leading-6 text-black/70">
          No entries for this goal yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {sortEntriesNewestFirst(entries).map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.35rem] border-2 border-black bg-[#fffdf8] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/55">
                    {entry.date}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {goal.metrics
                      .filter((metric) =>
                        Number.isFinite(entry.values?.[metric.id]),
                      )
                      .map((metric) => (
                        <span
                          key={metric.id}
                          className="rounded-full border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black"
                          style={{
                            backgroundColor:
                              metricColors[metric.colorKey] || '#fff',
                          }}
                        >
                          {metric.name}: {entry.values[metric.id]}
                          {metric.unit ? ` ${metric.unit}` : ''}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onEditEntry(entry)}
                    className="rounded-full border-2 border-black bg-[#c5ff6f] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {entry.note ? (
                <p className="mt-4 rounded-[1rem] border-2 border-black bg-white px-3 py-2 text-sm font-semibold leading-6 text-black/70">
                  {entry.note}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProgressTracker() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadTrackerData() {
    setError('');

    try {
      const [savedGoals, savedEntries] = await Promise.all([
        getGoals(),
        getEntries(),
      ]);

      setGoals(savedGoals);
      setEntries(savedEntries);
    } catch (loadError) {
      setError(loadError.message);
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

    const channel = subscribeToEntries(user.id, () => {
      getEntries()
        .then(setEntries)
        .catch((entryError) => setError(entryError.message));
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (goals.length === 0) {
      setSelectedGoalId('');
      setEditingEntry(null);
      return;
    }

    if (!goals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(goals[0].id);
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

  async function handleCreateGoal(goal) {
    setIsSaving(true);
    setError('');

    try {
      const savedGoal = await createGoal(goal);
      setGoals((current) => [savedGoal, ...current]);
      setSelectedGoalId(savedGoal.id);
      setActiveView('daily-log');
    } catch (createError) {
      setError(createError.message);
      throw createError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEntry(entry) {
    setIsSaving(true);
    setError('');

    try {
      const savedEntry = editingEntry
        ? await updateEntry(entry.id, entry)
        : await createEntry(entry);

      setEntries((current) => [
        savedEntry,
        ...current.filter((currentEntry) => currentEntry.id !== savedEntry.id),
      ]);
      setEditingEntry(null);
      setActiveView('dashboard');
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditEntry(entry) {
    setSelectedGoalId(entry.goalId);
    setEditingEntry(entry);
    setActiveView('daily-log');
  }

  async function handleDeleteEntry(entryId) {
    setError('');

    try {
      await deleteEntry(entryId);
      setEntries((current) =>
        current.filter((entry) => entry.id !== entryId),
      );
      if (editingEntry?.id === entryId) {
        setEditingEntry(null);
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleDeleteGoal(goalId) {
    const goal = goals.find((savedGoal) => savedGoal.id === goalId);
    const confirmed = window.confirm(
      `Delete "${goal?.title || 'this goal'}" and its entries?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteGoal(goalId);
      setGoals((current) => current.filter((savedGoal) => savedGoal.id !== goalId));
      setEntries((current) => current.filter((entry) => entry.goalId !== goalId));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <PageShell>
      <section className="panel p-6 sm:p-8 lg:p-10">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            <a
              href="#/"
              className="inline-flex items-center rounded-full border border-black/85 bg-[#fffdf8] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition hover:bg-white"
            >
              C Board
            </a>
            <a
              href="#/calculators"
              className="inline-flex items-center rounded-full border border-black/85 bg-[#fffdf8] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition hover:bg-white"
            >
              Calculator Tools
            </a>
            <a
              href="#/progress-tracker"
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
          Create a goal, log daily metric values, and compare target, latest,
          best, average, streak, and trend lines.
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
            <div className="mt-8 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <GoalList
                goals={goals}
                selectedGoalId={selectedGoalId}
                entries={entries}
                onSelectGoal={(goalId) => {
                  setSelectedGoalId(goalId);
                  setEditingEntry(null);
                }}
                onDeleteGoal={handleDeleteGoal}
              />
              <GoalStats goal={selectedGoal} entries={selectedGoalEntries} />
            </div>

            <div className="mt-5 grid gap-5">
              <GoalChart goal={selectedGoal} entries={selectedGoalEntries} />
              <EntryHistory
                goal={selectedGoal}
                entries={selectedGoalEntries}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            </div>
          </>
        ) : null}

        {!isLoading && activeView === 'new-tracker' ? (
          <div className="mt-8 max-w-3xl">
            <GoalForm onCreateGoal={handleCreateGoal} isSaving={isSaving} />
          </div>
        ) : null}

        {!isLoading && activeView === 'daily-log' ? (
          <div className="mt-8 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <EntryForm
              goals={goals}
              selectedGoalId={selectedGoalId}
              onSelectGoal={(goalId) => {
                setSelectedGoalId(goalId);
                setEditingEntry(null);
              }}
              editingEntry={editingEntry}
              onSaveEntry={handleSaveEntry}
              onCancelEdit={() => {
                setEditingEntry(null);
                setActiveView('dashboard');
              }}
              isSaving={isSaving}
            />
            <GoalStats goal={selectedGoal} entries={selectedGoalEntries} />
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
