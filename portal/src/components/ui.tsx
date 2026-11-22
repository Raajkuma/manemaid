import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { Icon, type IconName } from './icons';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2',
  danger: 'bg-bad text-white hover:brightness-95',
};

export function Button({
  variant = 'primary',
  icon,
  loading,
  size = 'md',
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; loading?: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner small /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
export function Field({
  label,
  hint,
  error,
  required,
  counter,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  counter?: { value: number; max: number };
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
          {required ? <span className="text-bad"> *</span> : null}
        </label>
        {counter ? (
          <span className={cx('text-xs tabular-nums', counter.value > counter.max ? 'text-bad' : 'text-muted')}>
            {counter.value}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-sm text-bad">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted/80 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60';

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx(inputBase, 'h-11', invalid && 'border-bad', className)} {...rest} />;
}

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx(inputBase, 'min-h-24 py-2.5', invalid && 'border-bad', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputBase, 'h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)} {...rest}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A8098' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-brand-500' : 'bg-line',
      )}
    >
      <span className={cx('inline-block size-5 rounded-full bg-white shadow transition', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
    </button>
  );
}

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 rounded-full border px-3.5 text-sm font-medium transition',
            value === o.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-surface text-ink-soft hover:border-brand-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------
export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'info' | 'bad';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border border-line',
  brand: 'bg-accent-soft text-brand-600 dark:text-brand-300',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info',
  bad: 'bg-bad-soft text-bad',
};

export function Badge({ tone = 'neutral', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', tones[tone])}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-line bg-surface shadow-card', className)}>{children}</div>;
}

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', small ? 'size-4' : 'size-6 text-brand-500')}
    />
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-brand-500">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-bad/30 bg-bad-soft p-4 text-bad">
      <Icon name="alert" size={20} />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Couldn't load this</p>
        <p className="mt-0.5 opacity-90">{msg}</p>
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold sm:text-[28px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[15px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ icon, label, value, tone = 'brand' }: { icon: IconName; label: string; value: ReactNode; tone?: Tone }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cx('grid size-11 place-items-center rounded-xl', tones[tone])}>
        <Icon name={icon} size={21} />
      </div>
      <div>
        <p className="text-2xl font-extrabold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
          {value}
        </p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dialog + confirm + toasts
// ---------------------------------------------------------------------------
export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2">
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

type ConfirmOpts = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  /** Ask for a reason / note (same as the app's pop-ups). */
  reason?: 'required' | 'optional';
  reasonLabel?: string;
  onConfirm: (text: string) => Promise<unknown> | unknown;
};
type ToastTone = 'ok' | 'bad' | 'info';
type FeedbackApi = { confirm: (o: ConfirmOpts) => void; toast: (message: string, tone?: ToastTone) => void };
const FeedbackCtx = createContext<FeedbackApi | null>(null);
export function useFeedback() {
  const v = use(FeedbackCtx);
  if (!v) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return v;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [confirm, setConfirm] = useState<ConfirmOpts | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: ToastTone }[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const api: FeedbackApi = {
    confirm: (o) => {
      setErr(null);
      setText('');
      setConfirm(o);
    },
    toast,
  };

  async function run() {
    if (!confirm) return;
    if (confirm.reason === 'required' && !text.trim()) {
      setErr('Please add a short reason.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await confirm.onConfirm(text.trim());
      setConfirm(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FeedbackCtx value={api}>
      {children}
      <Dialog
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        title={confirm?.title ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={run} loading={busy}>
              {confirm?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink-soft">{confirm?.message}</p>
        {confirm?.reason ? (
          <div className="mt-4">
            <Field label={confirm.reasonLabel ?? (confirm.reason === 'required' ? 'Reason' : 'Note (optional)')} required={confirm.reason === 'required'} htmlFor="confirm-reason">
              <Textarea id="confirm-reason" autoFocus value={text} onChange={(e) => setText(e.target.value)} className="min-h-20" />
            </Field>
          </div>
        ) : null}
        {err ? <p className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p> : null}
      </Dialog>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-pop',
              t.tone === 'ok' ? 'bg-[#1b1f3b]' : t.tone === 'bad' ? 'bg-bad' : 'bg-info',
            )}
          >
            <Icon name={t.tone === 'bad' ? 'alert' : 'check'} size={16} />
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackCtx>
  );
}
