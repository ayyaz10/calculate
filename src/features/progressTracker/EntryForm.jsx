import { useEffect, useMemo, useState } from 'react';
import { ThemedDatePicker } from '../../components/ui/ThemedDatePicker';
import { ThemedSelect } from '../../components/ui/ThemedSelect';
import { createId, getTodayInputValue, isBinaryGoal } from './progressTrackerStorage';
import { getTrackerErrorMessage } from './trackerErrorMessages';
import { getPrimaryMetric, isBinaryEntryCompleted } from './progressCalculations';

function buildValueState(goal, entry) {
  if (!goal) {
    return {};
  }

  return goal.metrics.reduce((values, metric) => {
    const savedValue = entry?.values?.[metric.id];
    return {
      ...values,
      [metric.id]: savedValue ?? '',
    };
  }, {});
}

export function EntryForm({
  goals,
  selectedGoalId,
  onSelectGoal,
  editingEntry,
  onSaveEntry,
  onCancelEdit,
  hideGoalSelect = false,
  isSaving = false,
}) {
  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId),
    [goals, selectedGoalId],
  );
  const goalOptions = useMemo(
    () => goals.map((goal) => ({ value: goal.id, label: goal.title })),
    [goals],
  );
  const [date, setDate] = useState(getTodayInputValue());
  const [values, setValues] = useState({});
  const [completed, setCompleted] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date);
      setNote(editingEntry.note || '');
      setValues(buildValueState(selectedGoal, editingEntry));
      setCompleted(isBinaryEntryCompleted(editingEntry, selectedGoal));
      return;
    }

    setDate(getTodayInputValue());
    setNote('');
    setValues(buildValueState(selectedGoal));
    setCompleted(true);
  }, [editingEntry, selectedGoal]);

  function handleGoalChange(event) {
    onSelectGoal(event.target.value);
  }

  function updateMetricValue(metricId, value) {
    setValues((current) => ({
      ...current,
      [metricId]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedGoal) {
      setError('Create or select a goal first.');
      return;
    }

    const mainMetric = getPrimaryMetric(selectedGoal);
    if (isBinaryGoal(selectedGoal) && !mainMetric) {
      setError('This binary goal needs a completion metric. Recreate the goal and try again.');
      return;
    }

    const parsedValues = isBinaryGoal(selectedGoal)
      ? { [mainMetric.id]: completed ? 1 : 0 }
      : Object.fromEntries(
        selectedGoal.metrics
          .map((metric) => [
            metric.id,
            values[metric.id] === ''
              ? null
              : Number.parseFloat(values[metric.id]),
          ])
          .filter(([, value]) => Number.isFinite(value)),
      );

    if (Object.keys(parsedValues).length === 0) {
      setError('Enter at least one metric value.');
      return;
    }

    try {
      const saveResult = await onSaveEntry({
        id: editingEntry?.id || createId('entry'),
        goalId: selectedGoal.id,
        date,
        completed: isBinaryGoal(selectedGoal) ? completed : null,
        values: parsedValues,
        note: note.trim(),
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
        updatedAt: editingEntry ? new Date().toISOString() : undefined,
      });

      if (saveResult === false) {
        return;
      }

      setError('');
      setDate(getTodayInputValue());
      setValues(buildValueState(selectedGoal));
      setCompleted(true);
      setNote('');
    } catch (saveError) {
      setError(
        getTrackerErrorMessage(
          saveError,
          'Could not save this entry. Please check the date and metric values, then try again.',
        ),
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border-2 border-black bg-[#c5ff6f] p-5 shadow-[5px_5px_0_#000] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            Daily entry
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
            {editingEntry ? 'Edit log' : 'Log today'}
          </h2>
        </div>
        {editingEntry ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {goals.length === 0 ? (
        <div className="mt-5 rounded-[1.35rem] border-2 border-black bg-white px-4 py-5 text-sm font-bold leading-6 text-black/70">
          Create a goal first, then daily metrics will appear here.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {!hideGoalSelect ? (
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                Goal
              </span>
              <ThemedSelect
                value={selectedGoalId || ''}
                onChange={handleGoalChange}
                options={goalOptions}
                disabled={Boolean(editingEntry)}
              />
            </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                Date
              </span>
              <ThemedDatePicker
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {isBinaryGoal(selectedGoal) ? (
              <div className="md:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                  Completion
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: true, label: 'Completed', color: '#fffdf8' },
                    { value: false, label: 'Missed', color: '#ffe0de' },
                  ].map((option) => {
                    const selected = completed === option.value;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setCompleted(option.value)}
                        className={`rounded-[1.35rem] border-2 border-black px-4 py-4 text-left text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] ${
                          selected ? 'shadow-[4px_4px_0_#000]' : ''
                        }`}
                        style={{ backgroundColor: selected ? '#9fe3ff' : option.color }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selectedGoal?.metrics.map((metric) => (
              <label key={metric.id} className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                  {metric.name}
                  {metric.unit ? ` (${metric.unit})` : ''}
                </span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  value={values[metric.id] ?? ''}
                  onChange={(event) =>
                    updateMetricValue(metric.id, event.target.value)
                  }
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
              Note
            </span>
            <textarea
              className="field-input min-h-28 resize-y"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What changed today?"
            />
          </label>
        </>
      )}

      {error ? (
        <p className="mt-4 rounded-[1rem] border-2 border-black bg-[#ffe0de] px-4 py-3 text-sm font-bold text-black">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={goals.length === 0 || isSaving}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border-2 border-black bg-black px-5 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[4px_4px_0_#fff] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#fff] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isSaving ? 'Saving...' : editingEntry ? 'Update entry' : 'Save entry'}
      </button>
    </form>
  );
}
