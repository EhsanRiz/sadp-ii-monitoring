import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { STAGE, type StageKey } from '../lib/stages';

// ---------- Toasts ----------
type Toast = { id: number; text: string; kind: 'ok' | 'err' };
let listeners: ((t: Toast) => void)[] = [];
let seq = 0;
export const toast = {
  ok: (text: string) => listeners.forEach((l) => l({ id: ++seq, text, kind: 'ok' })),
  err: (text: string) => listeners.forEach((l) => l({ id: ++seq, text, kind: 'err' })),
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const l = (t: Toast) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), t.kind === 'err' ? 6000 : 3000);
    };
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 print:hidden">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
            t.kind === 'ok' ? 'bg-brand text-white' : 'bg-red-600 text-white'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ---------- Buttons ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' };
export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  }[variant];
  const s = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm';
  return <button className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition ${v} ${s} ${className}`} {...rest} />;
}

export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

// ---------- Stage chip ----------
export function StageChip({ stage, size = 'md' }: { stage: StageKey; size?: 'sm' | 'md' }) {
  const s = STAGE[stage];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium ${s.color} ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ---------- Drawer / Modal ----------
export function Drawer({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end print:hidden">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={`relative flex h-full w-full flex-col bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0 flex-1">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</div>;
}

export const selectCls =
  'w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
