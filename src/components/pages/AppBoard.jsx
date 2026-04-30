import { PageShell } from '../layout/PageShell';

const appSections = [
  {
    id: 'calculator-board',
    path: '/calculators',
    label: 'App 01',
    name: 'Calculator Tools',
    description:
      'Percentage, calories, and unit tools collected in one quick board.',
    color: '#c5ff6f',
    countLabel: '3 live tools',
  },
  {
    id: 'progress-tracker',
    path: '/progress-tracker',
    label: 'App 02',
    name: 'Progress Tracker',
    description:
      'Create goals, log daily metrics, and watch your numbers move over time.',
    color: '#9fe3ff',
    countLabel: 'Goal dashboard',
  },
];

const futureAppSections = [];

export function AppBoard({ calculators }) {
  return (
    <PageShell>
      <section className="panel p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="pill">Control board</span>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            {appSections.length} app sections
          </span>
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl lg:text-6xl">
          C Board
        </h1>

        <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-black/70 sm:text-lg">
          Pick a workspace from the control board.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {appSections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.path}`}
              className="board-card"
              style={{ backgroundColor: section.color }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
                    {section.label}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-black sm:text-3xl">
                    {section.name}
                  </h2>
                </div>

                <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <p className="mt-4 max-w-sm text-sm font-medium leading-7 text-black/72">
                {section.description}
              </p>

              <div className="mt-8 flex items-center justify-between gap-3">
                <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
                  {section.id === 'calculator-board'
                    ? `${calculators.length} calculators`
                    : section.countLabel}
                </span>
                <span className="text-2xl font-bold text-black">{'->'}</span>
              </div>
            </a>
          ))}
        </div>

        {futureAppSections.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {futureAppSections.map((section) => (
              <div key={section.id}>{section.name}</div>
            ))}
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
