import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../Modal';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** If set, the confirm button stays disabled until the user types this exact text. */
  requireText?: string;
};

type PromptOptions = {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
};

type ToastTone = 'success' | 'error';

type ConfirmRequest = { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void };
type PromptRequest = { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };
type Request = ConfirmRequest | PromptRequest;

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  showToast: (message: string, tone?: ToastTone) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

/** App-level replacement for window.confirm/prompt/alert, styled with the app's own modal. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setTyped('');
    setRequest({ kind: 'confirm', options, resolve });
  }), []);

  const prompt = useCallback((options: PromptOptions) => new Promise<string | null>((resolve) => {
    setValue(options.defaultValue ?? '');
    setRequest({ kind: 'prompt', options, resolve });
  }), []);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  function close(result: boolean | string | null) {
    if (!request) return;
    if (request.kind === 'confirm') request.resolve(result === true);
    else request.resolve(typeof result === 'string' ? result : null);
    setRequest(null);
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt, showToast }}>
      {children}
      {request?.kind === 'confirm' && (
        <Modal title={request.options.title ?? 'Confirmar acción'} onClose={() => close(false)}>
          <div className="modal-body">
            <p>{request.options.message}</p>
            {request.options.requireText && (
              <div className="control">
                <span>Escribe <b>{request.options.requireText}</b> para confirmar</span>
                <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} />
              </div>
            )}
            <div className="modal-actions">
              <button className="button ghost" onClick={() => close(false)}>{request.options.cancelLabel ?? 'Cancelar'}</button>
              <button
                className={`button ${request.options.danger ? 'danger' : 'primary'}`}
                disabled={!!request.options.requireText && typed !== request.options.requireText}
                onClick={() => close(true)}
              >{request.options.confirmLabel ?? 'Confirmar'}</button>
            </div>
          </div>
        </Modal>
      )}
      {request?.kind === 'prompt' && (
        <Modal title={request.options.title ?? 'Ingresa un valor'} onClose={() => close(null)}>
          <div className="modal-body">
            {request.options.message && <p>{request.options.message}</p>}
            <div className="control">
              <input
                autoFocus
                value={value}
                placeholder={request.options.placeholder}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') close(value); }}
              />
            </div>
            <div className="modal-actions">
              <button className="button ghost" onClick={() => close(null)}>Cancelar</button>
              <button className="button primary" onClick={() => close(value)}>{request.options.confirmLabel ?? 'Aceptar'}</button>
            </div>
          </div>
        </Modal>
      )}
      {toast && <div className={`toast toast-${toast.tone}`} role="status">{toast.message}</div>}
    </DialogContext.Provider>
  );
}

function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('DialogProvider is missing from the component tree.');
  return ctx;
}

export function useConfirm() {
  return useDialogContext().confirm;
}

export function usePrompt() {
  return useDialogContext().prompt;
}

export function useToast() {
  return useDialogContext().showToast;
}
