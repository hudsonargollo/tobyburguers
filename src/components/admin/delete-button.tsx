"use client";

type Props = {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
};

export function DeleteButton({ action, label = "Eliminar", confirmText = "¿Eliminar este elemento?" }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button className="text-sm text-red-700 transition hover:underline">{label}</button>
    </form>
  );
}
