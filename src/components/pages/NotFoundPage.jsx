import { PageShell } from '../layout/PageShell';

export function NotFoundPage() {
  return (
    <PageShell>
      <section className="panel p-6 sm:p-8 lg:p-10">
        <span className="pill">Page not found</span>
        <h1 className="mt-6 text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl">
          This page could not be found
        </h1>
        <p className="mt-3 max-w-xl text-base font-medium leading-7 text-black/70">
          Head back to the board and open an available calculator.
        </p>

        <div className="mt-8">
          <a href="#/board" className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#c5ff6f] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]">
            Back to board
          </a>
        </div>
      </section>
    </PageShell>
  );
}
