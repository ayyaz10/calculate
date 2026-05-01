export function ResultPanel({ result, className = '' }) {
  if (!result) {
    return (
      <aside
        aria-live="polite"
        className={`rounded-[2rem] border-2 border-black bg-[#ff90e8] p-6 text-black sm:p-7 ${className}`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/60">
          Result
        </p>

        <p className="mt-6 text-6xl font-bold tracking-[-0.06em] text-black sm:text-7xl">
          --
        </p>
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-black/65">
          Fill the form
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-live="polite"
      className={`rounded-[2rem] border-2 border-black bg-[#ff90e8] p-6 text-black sm:p-7 ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/60">
        Result
      </p>

      <p className="mt-6 text-6xl font-bold tracking-[-0.06em] text-black sm:text-7xl">
        {result.formattedCalculatedCalories}
      </p>
      <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-black/65">
        calories
      </p>

      <div className="mt-6 grid gap-3">
        <div className="rounded-[1.4rem] border-2 border-black bg-[#fffdf8] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/55">
            Per unit
          </p>
          <p className="mt-2 text-xl font-bold text-black">
            {result.formattedCaloriesPerUnit}
          </p>
        </div>

        <div className="rounded-[1.4rem] border-2 border-black bg-[#fffdf8] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/55">
            Desired quantity
          </p>
          <p className="mt-2 text-xl font-bold text-black">
            {result.formattedDesiredQuantity}
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm font-medium leading-7 text-black/70">
        Calculation: {result.formulaText}
      </p>
    </aside>
  );
}
