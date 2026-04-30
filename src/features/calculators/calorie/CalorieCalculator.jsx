import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { RecentResultsPanel } from '../../../components/ui/RecentResultsPanel';
import { InputField } from '../../../components/ui/InputField';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { ResultPanel } from '../../../components/ui/ResultPanel';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { useRecentResults } from '../useRecentResults';
import {
  buildResultSummary,
  calorieFieldConfig,
  createEmptyCalorieForm,
  validateCalorieForm,
} from './calorieMath';

export function CalorieCalculator() {
  const { confirm, dialog } = useConfirmDialog();
  const [formValues, setFormValues] = useState(createEmptyCalorieForm);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const {
    recentResults,
    isLoading: isLoadingResults,
    error: resultsError,
    saveResult,
    removeResult,
  } = useRecentResults('calorie');

  const runCalculation = (nextValues) => {
    const validationErrors = validateCalorieForm(nextValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setResult(null);
      return null;
    }

    const nextResult = buildResultSummary(nextValues);
    setResult(nextResult);
    return nextResult;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValues = {
      ...formValues,
      [name]: value,
    };

    setFormValues(nextValues);

    if (hasAttemptedSubmit) {
      runCalculation(nextValues);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    const nextResult = runCalculation(formValues);

    if (nextResult) {
      saveResult({
        summary: nextResult.historySummary,
        detail: nextResult.historyDetail,
      });
    }
  };

  async function handleRemoveResult(entry) {
    const confirmed = await confirm({
      title: 'Delete saved calculation?',
      message: entry.summary,
      confirmLabel: 'Delete',
    });

    if (confirmed) {
      removeResult(entry.id);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
        <form
          noValidate
          onSubmit={handleSubmit}
          className="rounded-[2rem] border-2 border-black bg-[#fffdf8] p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
                Inputs
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
                Enter values
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                Use the same unit for both quantity fields.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {calorieFieldConfig.map((field) => (
              <div key={field.name} className={field.wide ? 'sm:col-span-2' : ''}>
                <InputField
                  id={field.name}
                  name={field.name}
                  label={field.label}
                  placeholder={field.placeholder}
                  hint={field.hint}
                  value={formValues[field.name]}
                  onChange={handleChange}
                  error={errors[field.name]}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryButton type="submit">Calculate</PrimaryButton>
            <p className="text-sm font-medium leading-6 text-black/55">
              Updates live after the first submit.
            </p>
          </div>
        </form>

        <ResultPanel result={result} />
      </div>

      <RecentResultsPanel
        entries={recentResults}
        emptyMessage="Your calorie calculations will appear here after you save a result with Calculate."
        onRemoveEntry={removeResult}
        onRequestRemoveEntry={handleRemoveResult}
        isLoading={isLoadingResults}
        error={resultsError}
      />
      <ConfirmDialog isOpen={Boolean(dialog)} {...dialog} />
    </div>
  );
}
