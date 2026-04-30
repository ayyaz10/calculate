import { PageShell } from '../../components/layout/PageShell';
import { CalculatorBoardCard } from '../../components/ui/CalculatorBoardCard';

export function CalculatorBoard({ calculators }) {
  return (
    <PageShell>
      <section className="panel p-6 sm:p-8 lg:p-10">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            <a
              href="#/board"
              className="inline-flex items-center rounded-full border border-black/85 bg-[#fffdf8] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition hover:bg-white"
            >
              C Board
            </a>
            <a
              href="#/calculators"
              className="inline-flex items-center rounded-full border border-black/85 bg-[#c5ff6f] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition"
            >
              Calculator Tools
            </a>
            <a
              href="#/progress-tracker"
              className="inline-flex items-center rounded-full border border-black/85 bg-[#fffdf8] px-3.5 py-1.5 text-sm font-semibold tracking-[-0.02em] text-black transition hover:bg-white"
            >
              Progress Tracker
            </a>
          </div>
        </nav>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <span className="pill">Calculator tools</span>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            {calculators.length} live tool{calculators.length === 1 ? '' : 's'}
          </span>
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl lg:text-6xl">
          Choose a calculator
        </h1>

        <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-black/70 sm:text-lg">
          Open any tool from C Board.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calculators.map((calculator, index) => (
            <CalculatorBoardCard
              key={calculator.id}
              calculator={calculator}
              index={index}
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
