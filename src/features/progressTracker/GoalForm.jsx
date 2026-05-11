import { useEffect, useMemo, useState } from 'react';
import { ThemedDatePicker } from '../../components/ui/ThemedDatePicker';
import { ThemedSelect } from '../../components/ui/ThemedSelect';
import {
  buildBinaryMetrics,
  buildPresetMetrics,
  createId,
  goalBehaviorTypes,
  goalTypePresets,
  isBinaryGoal,
  metricColorKeys,
} from './progressTrackerStorage';

function makeInitialForm(goal = null) {
  const type = 'typing';

  if (goal) {
    return {
      title: goal.title || '',
      goalType: goal.goalType || 'performance',
      type: goal.type || 'custom',
      startValue: Number.isFinite(goal.startValue) ? String(goal.startValue) : '',
      targetValue: Number.isFinite(goal.targetValue) ? String(goal.targetValue) : '',
      unit: goal.unit || '',
      deadline: goal.deadline || '',
      allowMultipleEntriesPerDay: Boolean(goal.allowMultipleEntriesPerDay),
      metrics: goal.metrics?.length ? goal.metrics : buildPresetMetrics(goal.type || 'custom'),
    };
  }

  return {
    title: '',
    goalType: 'performance',
    type,
    startValue: '',
    targetValue: '',
    unit: goalTypePresets[type].targetUnit,
    deadline: '',
    allowMultipleEntriesPerDay: false,
    metrics: buildPresetMetrics(type),
  };
}

export function GoalForm({
  initialGoal = null,
  onCreateGoal,
  onSubmitGoal,
  onCancel,
  isSaving = false,
}) {
  const isEditing = Boolean(initialGoal);
  const [form, setForm] = useState(() => makeInitialForm(initialGoal));
  const [error, setError] = useState('');

  const typeOptions = useMemo(
    () => Object.entries(goalTypePresets),
    [],
  );
  const goalBehaviorOptions = useMemo(
    () => Object.entries(goalBehaviorTypes),
    [],
  );
  const themedTypeOptions = useMemo(
    () => typeOptions.map(([type, preset]) => ({
      value: type,
      label: preset.label,
    })),
    [typeOptions],
  );

  useEffect(() => {
    setForm(makeInitialForm(initialGoal));
    setError('');
  }, [initialGoal]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleGoalTypeChange(goalType) {
    const binary = goalType === 'binary';

    setForm((current) => ({
      ...current,
      goalType,
      startValue: binary ? '' : current.startValue,
      targetValue: binary ? '' : current.targetValue,
      unit: binary ? '' : current.unit || goalTypePresets[current.type].targetUnit,
      metrics: binary ? buildBinaryMetrics() : buildPresetMetrics(current.type),
    }));
  }

  function handleTypeChange(event) {
    const type = event.target.value;
    const preset = goalTypePresets[type];

    setForm((current) => ({
      ...current,
      type,
      unit: preset.targetUnit,
      metrics: isBinaryGoal(current) ? current.metrics : buildPresetMetrics(type),
    }));
  }

  function updateMetric(metricId, field, value) {
    setForm((current) => ({
      ...current,
      metrics: current.metrics.map((metric) =>
        metric.id === metricId ? { ...metric, [field]: value } : metric,
      ),
    }));
  }

  function addMetric() {
    setForm((current) => ({
      ...current,
      metrics: [
        ...current.metrics,
        {
          id: createId('metric'),
          name: '',
          unit: '',
          colorKey: metricColorKeys[current.metrics.length % metricColorKeys.length],
        },
      ],
    }));
  }

  function removeMetric(metricId) {
    setForm((current) => ({
      ...current,
      metrics:
        current.metrics.length === 1
          ? current.metrics
          : current.metrics.filter((metric) => metric.id !== metricId),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const metrics = form.metrics
      .map((metric, index) => ({
        ...metric,
        name: metric.name.trim(),
        unit: metric.unit.trim(),
        colorKey: metric.colorKey || metricColorKeys[index % metricColorKeys.length],
      }))
      .filter((metric) => metric.name);

    if (!form.title.trim()) {
      setError('Add a goal title first.');
      return;
    }

    if (!isBinaryGoal(form) && metrics.length === 0) {
      setError('Add at least one metric to track.');
      return;
    }

    const parsedTarget = Number.parseFloat(form.targetValue);
    const parsedStart = Number.parseFloat(form.startValue);
    const startValue = isBinaryGoal(form)
      ? null
      : form.startValue === '' || !Number.isFinite(parsedStart)
      ? form.goalType === 'accumulative'
        ? 0
        : null
      : parsedStart;

    try {
      const payload = {
        id: initialGoal?.id || createId('goal'),
        title: form.title.trim(),
        goalType: form.goalType,
        type: form.type,
        startValue,
        targetValue:
          isBinaryGoal(form) || form.targetValue === '' || !Number.isFinite(parsedTarget)
            ? null
            : parsedTarget,
        unit: isBinaryGoal(form) ? '' : form.unit.trim(),
        deadline: form.deadline,
        allowMultipleEntriesPerDay: form.allowMultipleEntriesPerDay,
        sortOrder: initialGoal?.sortOrder ?? 0,
        metrics: isBinaryGoal(form) ? form.metrics : metrics,
        createdAt: initialGoal?.createdAt || new Date().toISOString(),
      };

      if (onSubmitGoal) {
        await onSubmitGoal(payload);
      } else {
        await onCreateGoal(payload);
      }

      setError('');
      if (!isEditing) {
        setForm(makeInitialForm());
      }
    } catch (createError) {
      setError(createError.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border-2 border-black bg-[#fffdf8] p-5 shadow-[5px_5px_0_#000] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            {isEditing ? 'Edit goal' : 'Create goal'}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
            {isEditing ? 'Goal details' : 'New tracker'}
          </h2>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black"
          >
            Cancel
          </button>
        ) : (
          <span className="rounded-full border-2 border-black bg-[#ffd166] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
            Ready
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Goal title
          </span>
          <input
            className="field-input"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="150 WPM, 10,000 steps..."
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Template
          </span>
          <ThemedSelect
            value={form.type}
            onChange={handleTypeChange}
            options={themedTypeOptions}
          />
        </label>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
          How should this goal be tracked?
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {goalBehaviorOptions.map(([goalType, option]) => {
            const isSelected = form.goalType === goalType;

            return (
              <button
                key={goalType}
                type="button"
                onClick={() => handleGoalTypeChange(goalType)}
                className={`rounded-[1.35rem] border-2 border-black p-4 text-left transition hover:-translate-y-1 hover:shadow-[5px_5px_0_#000] ${
                  isSelected ? 'bg-[#9fe3ff]' : 'bg-[#f8f3ea]'
                }`}
              >
                <span className="text-sm font-bold tracking-[-0.03em] text-black">
                  {option.label}
                </span>
                <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-black/55">
                  {option.description}
                </span>
                <span className="mt-3 block text-sm font-semibold leading-6 text-black/70">
                  {option.examples}
                </span>
                <span className="mt-3 inline-flex rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                  {option.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!isBinaryGoal(form) ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            {form.goalType === 'accumulative' ? 'Already completed' : 'Starting value'}
          </span>
          <input
            className="field-input"
            type="number"
            inputMode="decimal"
            value={form.startValue}
            onChange={(event) => updateField('startValue', event.target.value)}
            placeholder={form.goalType === 'accumulative' ? '0' : 'Optional'}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Target value
          </span>
          <input
            className="field-input"
            type="number"
            inputMode="decimal"
            value={form.targetValue}
            onChange={(event) => updateField('targetValue', event.target.value)}
            placeholder="150"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Target unit
          </span>
          <input
            className="field-input"
            value={form.unit}
            onChange={(event) => updateField('unit', event.target.value)}
            placeholder="WPM, steps, sessions..."
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Deadline
          </span>
          <ThemedDatePicker
            value={form.deadline}
            onChange={(event) => updateField('deadline', event.target.value)}
          />
        </label>
      </div>
      ) : (
        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Deadline
          </span>
          <ThemedDatePicker
            value={form.deadline}
            onChange={(event) => updateField('deadline', event.target.value)}
          />
        </label>
      )}

      <label className="mt-5 flex items-center justify-between gap-4 rounded-[1.35rem] border-2 border-black bg-[#f8f3ea] p-4">
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
            Allow multiple entries per day
          </span>
          <span className="mt-1 block text-sm font-semibold leading-6 text-black/65">
            Save separate logs on the same date instead of replacing the daily entry.
          </span>
        </span>
        <button
          type="button"
          onClick={() =>
            updateField(
              'allowMultipleEntriesPerDay',
              !form.allowMultipleEntriesPerDay,
            )
          }
          className={`relative h-8 w-16 shrink-0 rounded-full border-2 border-black transition ${
            form.allowMultipleEntriesPerDay ? 'bg-[#c5ff6f]' : 'bg-white'
          }`}
          aria-pressed={form.allowMultipleEntriesPerDay}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full border-2 border-black bg-black transition ${
              form.allowMultipleEntriesPerDay ? 'left-9' : 'left-1'
            }`}
          />
        </button>
      </label>

      {!isBinaryGoal(form) ? (
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            Metrics
          </p>
          <button
            type="button"
            onClick={addMetric}
            className="rounded-full border-2 border-black bg-[#9fe3ff] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000]"
          >
            Add metric
          </button>
        </div>

        <div className="mt-3 grid gap-3">
          {form.metrics.map((metric) => (
            <div
              key={metric.id}
              className="grid gap-3 rounded-[1.35rem] border-2 border-black bg-[#f8f3ea] p-3 md:grid-cols-[1fr_0.55fr_0.45fr_auto]"
            >
              <input
                className="field-input"
                value={metric.name}
                onChange={(event) =>
                  updateMetric(metric.id, 'name', event.target.value)
                }
                placeholder="Metric name"
              />
              <input
                className="field-input"
                value={metric.unit}
                onChange={(event) =>
                  updateMetric(metric.id, 'unit', event.target.value)
                }
                placeholder="Unit"
              />
              <ThemedSelect
                value={metric.colorKey || metricColorKeys[0]}
                onChange={(event) =>
                  updateMetric(metric.id, 'colorKey', event.target.value)
                }
                options={metricColorKeys.map((colorKey) => ({
                  value: colorKey,
                  label: colorKey,
                }))}
              />
              <button
                type="button"
                onClick={() => removeMetric(metric.id)}
                className="rounded-full border-2 border-black bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-black"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-[1rem] border-2 border-black bg-[#ffe0de] px-4 py-3 text-sm font-bold text-black">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border-2 border-black bg-[#c5ff6f] px-5 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create goal'}
      </button>
    </form>
  );
}
