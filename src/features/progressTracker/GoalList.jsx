import { useState } from 'react';
import {
  formatGoalTarget,
  getGoalType,
  goalBehaviorTypes,
  goalTypePresets,
} from './progressTrackerStorage';
import {
  calculateAccumulativeStats,
  calculateBinaryStats,
  calculatePerformanceStats,
  formatTrackerNumber,
} from './progressCalculations';

function getCurrentSummary(goal, entries) {
  const goalEntries = entries.filter((entry) => entry.goalId === goal.id);
  const goalType = getGoalType(goal);

  if (goalType === 'binary') {
    const stats = calculateBinaryStats(goal, goalEntries);

    return {
      current: `${stats.streak} day${stats.streak === 1 ? '' : 's'} streak`,
      target: stats.completionRate === null ? '' : `${stats.completionRate}% completion`,
      percentage: stats.completionRate,
    };
  }

  if (goalType === 'accumulative') {
    const stats = calculateAccumulativeStats(goal, goalEntries);
    const unit = stats.unit || goal.unit;

    return {
      current: `Current: ${formatTrackerNumber(stats.totalValue)}`,
      target: Number.isFinite(goal.targetValue)
        ? `Goal: ${formatTrackerNumber(goal.targetValue)} ${unit}`.trim()
        : '',
      percentage: stats.progressPercentage,
    };
  }

  const stats = calculatePerformanceStats(goal, goalEntries);
  const unit = stats.unit || goal.unit;

  return {
    current: Number.isFinite(stats.latestValue)
      ? `Current: ${formatTrackerNumber(stats.latestValue)} ${unit}`.trim()
      : 'No entries yet',
    target: Number.isFinite(goal.targetValue)
      ? `Goal: ${formatTrackerNumber(goal.targetValue)} ${unit}`.trim()
      : '',
    percentage: stats.progressPercentage,
  };
}

function ProgressStrip({ percentage }) {
  const width = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;

  return (
    <div className="h-2 overflow-hidden rounded-full border-2 border-black bg-white">
      <div className="h-full bg-[#c5ff6f]" style={{ width: `${width}%` }} />
    </div>
  );
}

function reorderItems(items, activeId, overId) {
  if (!activeId || !overId || activeId === overId) {
    return items;
  }

  const fromIndex = items.findIndex((item) => item.id === activeId);
  const toIndex = items.findIndex((item) => item.id === overId);

  if (fromIndex === -1 || toIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function isInteractiveTarget(target) {
  return Boolean(
    target.closest?.('button, input, select, textarea, a, [data-no-drag="true"]'),
  );
}

export function GoalList({
  goals,
  selectedGoalId,
  entries,
  onSelectGoal,
  onEditGoal,
  onLogGoal,
  onReorderGoals,
}) {
  const [draggedGoalId, setDraggedGoalId] = useState('');
  const [dragOverGoalId, setDragOverGoalId] = useState('');

  function handleCardKeyDown(event, goalId) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onSelectGoal(goalId);
  }

  function handleDrop(event, overGoalId) {
    event.preventDefault();
    event.stopPropagation();
    const activeGoalId = draggedGoalId || event.dataTransfer.getData('text/plain');
    const nextGoals = reorderItems(goals, activeGoalId, overGoalId);
    setDraggedGoalId('');
    setDragOverGoalId('');

    if (nextGoals !== goals) {
      onReorderGoals(nextGoals);
    }
  }

  return (
    <section className="rounded-[1.75rem] border-2 border-black bg-[#fff0b8] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            Goals
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
            Tracker list
          </h2>
        </div>
        <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
          {goals.length}
        </span>
      </div>

      {goals.length === 0 ? (
        <div className="mt-5 rounded-[1.35rem] border-2 border-black bg-white px-4 py-5 text-sm font-bold leading-6 text-black/70">
          No goals yet. Create one to unlock the dashboard.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {goals.map((goal) => {
            const isSelected = goal.id === selectedGoalId;
            const isDragging = draggedGoalId === goal.id;
            const isDropTarget = dragOverGoalId === goal.id && draggedGoalId !== goal.id;
            const goalType = getGoalType(goal);
            const summary = getCurrentSummary(goal, entries);

            return (
              <article
                key={goal.id}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => onSelectGoal(goal.id)}
                onKeyDown={(event) => handleCardKeyDown(event, goal.id)}
                onDragStart={(event) => {
                  if (isInteractiveTarget(event.target)) {
                    event.preventDefault();
                    return;
                  }

                  setDraggedGoalId(goal.id);
                  setDragOverGoalId('');
                  event.dataTransfer.setData('text/plain', goal.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (draggedGoalId && draggedGoalId !== goal.id) {
                    setDragOverGoalId(goal.id);
                  }
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragOverGoalId((currentGoalId) =>
                      currentGoalId === goal.id ? '' : currentGoalId,
                    );
                  }
                }}
                onDrop={(event) => handleDrop(event, goal.id)}
                onDragEnd={() => {
                  setDraggedGoalId('');
                  setDragOverGoalId('');
                }}
                className={`group relative rounded-[1.35rem] border-2 border-black p-4 outline-none transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] focus-visible:-translate-y-1 focus-visible:shadow-[6px_6px_0_#000] focus-visible:ring-2 focus-visible:ring-black ${
                  isSelected ? 'bg-[#ff90e8]' : 'bg-[#fffdf8]'
                } ${
                  isDragging
                    ? 'translate-x-1 translate-y-1 opacity-60 shadow-none'
                    : ''
                } ${
                  isDropTarget
                    ? '-translate-y-1 bg-[#c5ff6f] shadow-[6px_6px_0_#000] ring-4 ring-[#9fe3ff]'
                    : ''
                }`}
              >
                {isDropTarget ? (
                  <span className="pointer-events-none absolute -top-3 left-5 rounded-full border-2 border-black bg-white px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000]">
                    Drop here
                  </span>
                ) : null}
                <div className="flex items-start gap-3">
                  <span
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onDragStart={(event) => {
                      setDraggedGoalId(goal.id);
                      setDragOverGoalId('');
                      event.dataTransfer.setData('text/plain', goal.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`mt-1 shrink-0 cursor-grab rounded-full border-2 border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-black transition active:cursor-grabbing ${
                      isDragging ? 'bg-black text-white' : 'bg-white group-hover:bg-[#9fe3ff]'
                    }`}
                    title="Drag to reorder"
                  >
                    ::
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/55">
                          {goalBehaviorTypes[goalType].shortLabel} - {goalTypePresets[goal.type]?.label || goal.type}
                        </p>
                        <h3 className="mt-1 break-words text-xl font-bold tracking-[-0.04em] text-black">
                          {goal.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditGoal(goal);
                        }}
                        className="shrink-0 rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:bg-[#9fe3ff]"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border-2 border-black bg-[#c5ff6f] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                        {summary.current}
                      </span>
                      {summary.target ? (
                        <span className="rounded-full border-2 border-black bg-[#ffd166] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                          {summary.target}
                        </span>
                      ) : goalType !== 'binary' ? (
                        <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                          {formatGoalTarget(goal)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2">
                      <ProgressStrip percentage={summary.percentage} />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-black/55">
                          {Number.isFinite(summary.percentage) ? `${summary.percentage}% progress` : 'Progress pending'}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.12em] text-black/55">
                            {goal.allowMultipleEntriesPerDay ? 'Multi-entry' : 'Daily entry'}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onLogGoal(goal.id);
                            }}
                            className="rounded-full border-2 border-black bg-black px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[2px_2px_0_#c5ff6f] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#c5ff6f]"
                          >
                            Add log
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
