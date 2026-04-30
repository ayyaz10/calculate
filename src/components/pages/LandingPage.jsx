import calLogo from '../../assets/cal-logo.png';

const featureTiles = [
  {
    title: 'Progress Tracker',
    text: 'Create goals, log daily metrics, and see current progress against the target.',
    color: '#c5ff6f',
  },
  {
    title: 'Calculator Tools',
    text: 'Save calculation history for percentages, calories, and mass conversions.',
    color: '#9fe3ff',
  },
  {
    title: 'Personal Workspace',
    text: 'Keep your tools, entries, and saved results organized behind your account.',
    color: '#ff90e8',
  },
];

export function LandingPage({ isAuthenticated }) {
  return (
    <main className="min-h-screen bg-[#f4f0e6] text-black">
      <section className="relative min-h-[92vh] overflow-hidden border-b-2 border-black px-4 py-6 sm:px-6 lg:px-8">
        <img
          src={calLogo}
          alt=""
          className="absolute right-[-8rem] top-24 w-[34rem] max-w-none opacity-10 sm:right-[-5rem] lg:right-8 lg:top-14 lg:w-[42rem]"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:min-h-[84vh]">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <a
              href="#/"
              className="inline-flex w-fit items-center gap-2.5 rounded-[1.5rem] border-2 border-black bg-[#fffdf8] px-2.5 py-2 pr-4 no-underline shadow-[6px_6px_0_#000]"
              aria-label="C Board intro"
            >
              <img
                src={calLogo}
                alt=""
                className="h-11 w-auto shrink-0 object-contain"
              />
              <div className="space-y-0.5">
                <p className="text-[0.65rem] font-bold uppercase leading-none tracking-[0.22em] text-black/55">
                  Control board
                </p>
                <p className="text-lg font-bold leading-none tracking-[-0.05em] text-black sm:text-xl">
                  C Board
                </p>
              </div>
            </a>

            <a
              href={isAuthenticated ? '#/board' : '#/login'}
              className="rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000]"
            >
              {isAuthenticated ? 'Open board' : 'Login'}
            </a>
          </header>

          <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
            <div className="max-w-3xl">
              <span className="pill">Progress, tools, history</span>
              <h1 className="mt-6 text-5xl font-bold leading-none tracking-[-0.06em] text-black sm:text-6xl lg:text-7xl">
                One board for goals and quick calculations.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-black/72 sm:text-lg">
                Track daily progress, compare it against your targets, and keep
                useful calculator results in the same focused workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={isAuthenticated ? '#/board' : '#/login'}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#c5ff6f] px-6 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000]"
                >
                  {isAuthenticated ? 'Open C Board' : 'Get started'}
                </a>
                <a
                  href="#/progress-tracker"
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000]"
                >
                  View tracker
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border-2 border-black bg-[#fffdf8] p-4 shadow-[10px_10px_0_#000] sm:p-5">
              <div className="rounded-[1.5rem] border-2 border-black bg-black p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                  Target goal
                </p>
                <p className="mt-4 text-5xl font-bold tracking-[-0.06em]">
                  150 WPM
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border-2 border-white bg-[#c5ff6f] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                    Current 80 WPM
                  </span>
                  <span className="rounded-full border-2 border-white bg-[#ffd166] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                    53% of goal
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {['Latest', 'Best', 'Streak'].map((label, index) => (
                  <article
                    key={label}
                    className="rounded-[1.25rem] border-2 border-black p-4"
                    style={{
                      backgroundColor: ['#c5ff6f', '#9fe3ff', '#ff90e8'][index],
                    }}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/55">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-[-0.05em]">
                      {['80', '92', '5'][index]}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-[1.5rem] border-2 border-black bg-[#fff0b8] p-4">
                <div className="flex h-36 items-end gap-3">
                  {[52, 62, 58, 70, 80].map((height, index) => (
                    <div
                      key={height}
                      className="flex-1 rounded-t-[1rem] border-2 border-black bg-[#c5ff6f]"
                      style={{ height: `${height}%` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {featureTiles.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[1.75rem] border-2 border-black p-5 shadow-[5px_5px_0_#000]"
              style={{ backgroundColor: feature.color }}
            >
              <h2 className="text-2xl font-bold tracking-[-0.04em]">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/70">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
