import { useCallback, useState } from 'react';

export function useConfirmDialog() {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) =>
    new Promise((resolve) => {
      setDialog({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        },
      });
    }), []);

  return {
    confirm,
    dialog,
  };
}
