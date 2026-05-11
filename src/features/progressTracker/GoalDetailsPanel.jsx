import { EntryForm } from './EntryForm';
import { EntryList } from './EntryList';
import { GoalChart } from './GoalChart';
import { GoalStats } from './GoalStats';

export function GoalDetailsPanel({
  goal,
  goals,
  entries,
  editingEntry,
  onSaveEntry,
  onEditEntry,
  onDeleteEntry,
  onCancelEdit,
  onEditGoal,
  onDeleteGoal,
  isSaving,
}) {
  if (!goal) {
    return (
      <section className="rounded-[1.75rem] border-2 border-black bg-[#fffdf8] p-5 sm:p-6">
        <span className="pill">Dashboard</span>
        <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-black">
          Select a goal
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-black/65">
          Goals are collapsed by default. Open one to review stats, chart,
          entries, and logging tools.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <GoalStats goal={goal} entries={entries} />

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onEditGoal(goal)}
          className="rounded-full border-2 border-black bg-[#9fe3ff] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000]"
        >
          Edit goal
        </button>
        <button
          type="button"
          onClick={() => onDeleteGoal(goal.id)}
          className="rounded-full border-2 border-black bg-[#ffe0de] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black shadow-[3px_3px_0_#000] transition hover:bg-[#ffb4ad]"
        >
          Delete goal
        </button>
      </div>

      <GoalChart goal={goal} entries={entries} />

      <EntryForm
        goals={goals}
        selectedGoalId={goal.id}
        onSelectGoal={() => {}}
        editingEntry={editingEntry}
        onSaveEntry={onSaveEntry}
        onCancelEdit={onCancelEdit}
        hideGoalSelect
        isSaving={isSaving}
      />

      <EntryList
        goal={goal}
        entries={entries}
        onEditEntry={onEditEntry}
        onDeleteEntry={onDeleteEntry}
      />
    </div>
  );
}
