import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { InputField } from "../../../components/ui/InputField";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { RecentResultsPanel } from "../../../components/ui/RecentResultsPanel";
import { SelectField } from "../../../components/ui/SelectField";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useRecentResults } from "../useRecentResults";
import { useMassUnitPreferences } from "./useMassUnitPreferences";
import {
  buildMassResult,
  createEmptyMassForm,
  massUnitOptions,
  validateMassForm,
} from "./massMath";

function MassResultPanel({ result, className = "" }) {
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
        {/* <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-black/65">
          Choose values
        </p> */}
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

      <p className="mt-6 break-words text-5xl font-bold tracking-[-0.06em] text-black sm:text-6xl">
        {result.formattedConvertedValue}
      </p>
      <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-black/65">
        {result.toUnitName}
      </p>

      <div className="mt-6 grid gap-3">
        <div className="rounded-[1.4rem] border-2 border-black bg-[#fffdf8] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/55">
            From
          </p>
          <p className="mt-2 text-xl font-bold text-black">
            {result.formattedInputValue} {result.fromUnitName}
          </p>
        </div>

        <div className="rounded-[1.4rem] border-2 border-black bg-[#fffdf8] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/55">
            Formula
          </p>
          <p className="mt-2 text-lg font-bold leading-7 text-black">
            {result.formulaText}
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm font-medium leading-7 text-black/70">
        Relation: {result.relationshipText}
      </p>
      <p className="mt-2 text-sm font-medium leading-7 text-black/70">
        Calculation: {result.calculationText}
      </p>
    </aside>
  );
}

export function MassCalculator() {
  const { confirm, dialog } = useConfirmDialog();
  const {
    preferredUnits,
    rememberUnits,
    error: preferenceError,
  } = useMassUnitPreferences();
  const [formValues, setFormValues] = useState(() =>
    createEmptyMassForm(preferredUnits),
  );
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const {
    recentResults,
    isLoading: isLoadingResults,
    error: resultsError,
    saveResult,
    removeResult,
  } = useRecentResults("mass");

  useEffect(() => {
    if (hasAttemptedSubmit) {
      return;
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      fromUnit: preferredUnits.fromUnit,
      toUnit: preferredUnits.toUnit,
    }));
  }, [hasAttemptedSubmit, preferredUnits.fromUnit, preferredUnits.toUnit]);

  const runCalculation = (nextValues) => {
    const validationErrors = validateMassForm(nextValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setResult(null);
      return null;
    }

    const nextResult = buildMassResult(nextValues);
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
      rememberUnits({
        fromUnit: formValues.fromUnit,
        toUnit: formValues.toUnit,
      });
    }
  };

  async function handleRemoveResult(entry) {
    const confirmed = await confirm({
      title: "Delete saved conversion?",
      message: entry.summary,
      confirmLabel: "Delete",
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
          className="order-2 rounded-[2rem] border-2 border-black bg-[#fffdf8] p-5 sm:p-6 lg:order-1"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
                Inputs
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
                Convert mass
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                id="value"
                name="value"
                label="Value"
                placeholder="e.g. 2"
                value={formValues.value}
                onChange={handleChange}
                error={errors.value}
              />
            </div>

            <SelectField
              id="fromUnit"
              name="fromUnit"
              label="From"
              value={formValues.fromUnit}
              onChange={handleChange}
              options={massUnitOptions}
              error={errors.fromUnit}
            />

            <SelectField
              id="toUnit"
              name="toUnit"
              label="To"
              value={formValues.toUnit}
              onChange={handleChange}
              options={massUnitOptions}
              error={errors.toUnit}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryButton type="submit">Calculate</PrimaryButton>
            <p className="text-sm font-medium leading-6 text-black/55">
              Updates live after the first submit.
            </p>
          </div>
        </form>

        <MassResultPanel result={result} className="order-1 lg:order-2" />
      </div>

      <RecentResultsPanel
        entries={recentResults}
        emptyMessage="Your mass conversions will appear here after you save a result with Calculate."
        onRemoveEntry={removeResult}
        onRequestRemoveEntry={handleRemoveResult}
        isLoading={isLoadingResults}
        error={resultsError || preferenceError}
      />
      <ConfirmDialog isOpen={Boolean(dialog)} {...dialog} />
    </div>
  );
}
