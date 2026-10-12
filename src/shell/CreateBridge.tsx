import { PenLine, X } from "lucide-react";

export function CreateBridge({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  if (!open) return null;

  return (
    <div className="bridge-scrim" role="dialog" aria-modal aria-label="Criar história">
      <div className="bridge-card">
        <button type="button" className="icon-btn tiny bridge-close" aria-label="Fechar" onClick={onClose}>
          <X size={16} />
        </button>
        <p className="eyebrow">Studio</p>
        <h2>Tens uma história para contar?</h2>
        <p className="fine">
          Começa com uma ideia. Não precisas ter tudo planeado — o Inklyst Studio activa-se nesta
          mesma conta.
        </p>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            onCreate();
            onClose();
          }}
        >
          <PenLine size={16} />
          Criar a minha primeira história
        </button>
      </div>
    </div>
  );
}
