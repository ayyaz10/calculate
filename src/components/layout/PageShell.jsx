import { BrandBadge } from './BrandBadge';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';

export function PageShell({ children }) {
  const { displayName, user, signOut } = useAuth();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandBadge />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <ThemeToggle />

            {user ? (
              <>
              <span className="max-w-[16rem] truncate rounded-full border-2 border-black bg-[#fffdf8] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                {displayName}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000]"
              >
                Logout
              </button>
              </>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
