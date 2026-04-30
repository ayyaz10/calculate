function formatSavedAt(savedAt) {
  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return 'Saved recently';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function RecentResultsPanel({
  entries,
  emptyMessage = 'Your saved calculations will appear here.',
  onRemoveEntry,
  isLoading = false,
  error = '',
}) {
  return (
    <section className="rounded-[1.75rem] border-2 border-black bg-[#fff0b8] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            Recent results
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
            Saved calculations
          </h2>
        </div>

        <span className="rounded-full border-2 border-black bg-[#fffdf8] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
          {entries.length}
        </span>
      </div>

      {error ? (
        <p className="mt-4 rounded-[1rem] border-2 border-black bg-[#ffe0de] px-4 py-3 text-sm font-bold text-black">
          {error}
        </p>
      ) : isLoading ? (
        <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-black/70 sm:text-base">
          Loading saved calculations...
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-black/70 sm:text-base">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.4rem] border-2 border-black bg-[#fffdf8] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-lg font-bold leading-7 text-black">{entry.summary}</p>
                <div className="ml-auto flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/50">
                    {formatSavedAt(entry.savedAt)}
                  </p>

                  {onRemoveEntry ? (
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Delete saved calculation: ${entry.summary}?`,
                        );

                        if (confirmed) {
                          onRemoveEntry(entry.id);
                        }
                      }}
                      aria-label={`Remove saved result: ${entry.summary}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-lg font-bold leading-none text-black shadow-[3px_3px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                    >
                      x
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="mt-2 text-sm font-medium leading-6 text-black/68">
                {entry.detail}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
