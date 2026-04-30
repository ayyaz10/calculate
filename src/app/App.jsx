import { useEffect, useRef, useState } from 'react';
import { AppBoard } from '../components/pages/AppBoard';
import { AuthPage } from '../components/pages/AuthPage';
import { LandingPage } from '../components/pages/LandingPage';
import { NotFoundPage } from '../components/pages/NotFoundPage';
import { ToolLayout } from '../components/layout/ToolLayout';
import { useAuth } from '../contexts/AuthContext';
import { migrateLocalStorageData } from '../services/dataMigrationService';
import { useHashRoute } from './useHashRoute';
import { CalculatorBoard } from '../features/calculators/CalculatorBoard';
import {
  calculators,
  findCalculatorByPath,
} from '../features/calculators/registry';
import { ProgressTracker } from '../features/progressTracker/ProgressTracker';

export default function App() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const route = useHashRoute();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState('');
  const migratedUserRef = useRef(null);

  useEffect(() => {
    if (!user?.id || migratedUserRef.current === user.id) {
      return undefined;
    }

    let isActive = true;
    migratedUserRef.current = user.id;
    setIsMigrating(true);
    setMigrationError('');

    migrateLocalStorageData()
      .catch((error) => {
        if (isActive) {
          setMigrationError(error.message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsMigrating(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  if (route === '/') {
    return <LandingPage isAuthenticated={!isLoading && isAuthenticated} />;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel mx-auto mt-12 max-w-xl p-6 text-center text-lg font-bold text-black">
          Loading C Board...
        </section>
      </main>
    );
  }

  if (route === '/login') {
    return <AuthPage />;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (isMigrating) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel mx-auto mt-12 max-w-xl p-6 text-center text-lg font-bold text-black">
          Setting up your workspace...
        </section>
      </main>
    );
  }

  if (migrationError) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel mx-auto mt-12 max-w-xl p-6">
          <span className="pill">Migration</span>
          <h1 className="mt-5 text-3xl font-bold tracking-[-0.05em] text-black">
            Could not migrate local data
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-black/70">
            {migrationError}
          </p>
        </section>
      </main>
    );
  }

  if (route === '/board') {
    return <AppBoard calculators={calculators} />;
  }

  if (route === '/calculators') {
    return <CalculatorBoard calculators={calculators} />;
  }

  if (route === '/progress-tracker') {
    return <ProgressTracker />;
  }

  const activeCalculator = findCalculatorByPath(route);

  if (!activeCalculator) {
    return <NotFoundPage />;
  }

  const ActiveCalculatorComponent = activeCalculator.component;

  return (
    <ToolLayout
      activeCalculator={activeCalculator}
      calculators={calculators}
    >
      <ActiveCalculatorComponent />
    </ToolLayout>
  );
}
