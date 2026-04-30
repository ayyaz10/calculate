export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-[1.75rem] border-2 border-black bg-[#fffdf8] p-5 text-black shadow-[8px_8px_0_#000] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="pill">Confirm</span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-lg font-bold leading-none text-black shadow-[3px_3px_0_#000]"
          >
            x
          </button>
        </div>

        <h2
          id="confirm-dialog-title"
          className="mt-5 text-3xl font-bold tracking-[-0.05em] text-black"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-black/70">
          {message}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border-2 border-black bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full border-2 border-black bg-[#ff90e8] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000]"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
