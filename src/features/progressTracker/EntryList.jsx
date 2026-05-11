import { isBinaryGoal, metricColors } from './progressTrackerStorage';
import { isBinaryEntryCompleted } from './progressCalculations';

function sortEntriesNewestFirst(entries) {
  return [...entries].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    return dateCompare || b.createdAt.localeCompare(a.createdAt);
  });
}

function formatEntryTime(entry) {
  if (!entry.createdAt) {
    return '';
  }

  return new Date(entry.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EntryList({ goal, entries, onEditEntry, onDeleteEntry }) {
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

      {entries.length === 0 ? (
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
                    {goal.allowMultipleEntriesPerDay && formatEntryTime(entry)
                      ? ` - ${formatEntryTime(entry)}`
                      : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isBinaryGoal(goal) ? (
                      <span
                        className="rounded-full border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black"
                        style={{
                          backgroundColor: isBinaryEntryCompleted(entry, goal)
                            ? '#c5ff6f'
                            : '#ffe0de',
                        }}
                      >
                        {isBinaryEntryCompleted(entry, goal) ? 'Completed' : 'Missed'}
                      </span>
                    ) : goal.metrics
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
                    className="rounded-full border-2 border-black bg-[#ffe0de] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:bg-[#ffb4ad]"
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
