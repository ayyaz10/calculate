import { useState } from 'react';
import { InputField } from '../../../components/ui/InputField';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { RecentResultsPanel } from '../../../components/ui/RecentResultsPanel';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { useRecentResults } from '../useRecentResults';
import {
  buildPercentageResult,
  createEmptyPercentageForm,
  percentageFieldConfig,
  validatePercentageForm,
} from './percentageMath';

export function PercentageCalculator() {
  const { confirm, dialog } = useConfirmDialog();
  const [formValues, setFormValues] = useState(createEmptyPercentageForm);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const {
    recentResults,
    isLoading: isLoadingResults,
    error: resultsError,
    saveResult,
    removeResult,
  } = useRecentResults('percentage');

  const runCalculation = (nextValues) => {
    const validationErrors = validatePercentageForm(nextValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setResult(null);
      return null;
    }

    const nextResult = buildPercentageResult(nextValues);
    setResult(nextResult);
    return nextResult;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
        <form
          noValidate
          onSubmit={handleSubmit}
          className="rounded-[1.75rem] border-2 border-black bg-[#fffdf8] p-5 sm:p-6"
        >
          <div className="grid gap-5">
            {percentageFieldConfig.map((field) => (
              <InputField
                key={field.name}
                id={field.name}
                name={field.name}
                label={field.label}
                placeholder={field.placeholder}
                value={formValues[field.name]}
                onChange={handleChange}
                error={errors[field.name]}
              />
            ))}
          </div>

          <div className="mt-6">
            <PrimaryButton type="submit">Calculate</PrimaryButton>
          </div>
        </form>

        <aside
          aria-live="polite"
          className="rounded-[1.75rem] border-2 border-black bg-[#ff90e8] p-5 text-black sm:p-6"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/60">
            Result
          </p>

          <div className="mt-4 min-h-[5rem] break-words text-4xl font-bold tracking-[-0.06em] text-black sm:min-h-[6rem] sm:text-5xl lg:text-6xl">
            {result ? result.formattedValue : '--'}
          </div>

          {result ? (
            <p className="mt-3 text-sm font-medium leading-7 text-black/70">
              Calculation: {result.formulaText}
            </p>
          ) : null}
        </aside>
      </div>

      <RecentResultsPanel
        entries={recentResults}
        emptyMessage="Your percentage calculations will appear here after you save a result with Calculate."
        onRemoveEntry={removeResult}
        onRequestRemoveEntry={handleRemoveResult}
        isLoading={isLoadingResults}
        error={resultsError}
      />
      <ConfirmDialog isOpen={Boolean(dialog)} {...dialog} />
    </div>
  );
}
