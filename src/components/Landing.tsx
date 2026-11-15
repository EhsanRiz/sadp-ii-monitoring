/**
 * Public landing page — the front door at the root of tracker.4dcs.co.za.
 * Shown before the app to every visitor; "Sign in" / "Open the tracker" calls
 * onEnter() to reveal the login (or the dashboard, when already signed in).
 * Public-facing: describes the programme and the tool, no enterprise data.
 */
import { ClipboardCheck, GraduationCap, Timer, ShieldAlert, ClipboardList, Zap, ArrowRight, type LucideIcon } from 'lucide-react';
import { FullLogo } from './Logo';

const FEATURES: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  { icon: ClipboardCheck, title: 'Approval pipeline', body: 'Track every M1 & M2 report from the ISP, through 4D review, to SADP approval — with the stage and how long it has been there.', tone: 'text-fdblue' },
  { icon: GraduationCap, title: 'Lifecycle & graduation', body: 'Each enterprise on its M1 → M2 → Graduation journey, with a readiness score and exactly what it still needs.', tone: 'text-brand' },
  { icon: Timer, title: 'Risk & SLA chasing', body: 'A “needs attention” queue and report-approval SLAs surface the reports and stalls to chase first.', tone: 'text-amber-600' },
  { icon: ShieldAlert, title: 'Finances & compliance', body: 'Farmer counterpart contributions, fund depletion and unreported-spend risk — the gaps that can undo a graduation.', tone: 'text-rose-500' },
  { icon: ClipboardList, title: 'Data completeness', body: 'See which enterprises are missing data, by field, so the records stay clean and every metric stays accurate.', tone: 'text-fdbrown' },
  { icon: Zap, title: 'Live & on any device', body: 'Changes appear for everyone in real time. Works on phone or computer, and keeps working offline.', tone: 'text-brand-logo' },
];

export function Landing({ onEnter, signedIn }: { onEnter: () => void; signedIn: boolean }) {
  const cta = signedIn ? 'Open the tracker' : 'Sign in';
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <FullLogo height={34} />
          <button onClick={onEnter} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            {cta}
          </button>
        </div>
        <div className="flex h-1">
          <div className="flex-1 bg-fdblue" />
          <div className="flex-1 bg-fdlime" />
          <div className="flex-1 bg-fdbrown-light" />
          <div className="flex-1 bg-brand-logo" />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:pt-24">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">SADP II · Matching Grants Programme · Central Region</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">MGP M1 Approval Tracker</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Real-time monitoring of every matching-grant enterprise — from M1 approval through to graduation. One shared, always-current view
          for 4D Climate Solutions, the ISPs and SADP.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={onEnter} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark">
            {cta} <ArrowRight size={18} />
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400">Access is for authorised staff. Need access? Contact your administrator.</p>
      </section>

      {/* Two tracks */}
      <section className="border-y bg-slate-50/70">
        <div className="mx-auto grid max-w-4xl gap-4 px-4 py-10 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <div className="text-sm font-semibold text-sky-800">The approval pipeline</div>
            <p className="mt-1 text-sm text-slate-600">Where each report sits on its way through SADP: With ISPs → 4D review → At SADP → Approved.</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <div className="text-sm font-semibold text-brand-dark">The graduation journey</div>
            <p className="mt-1 text-sm text-slate-600">Which milestone each enterprise has reached: M1 → M2 → Graduated, with the steps that remain.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">What the tracker does</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-white p-6 transition hover:shadow-sm">
              <f.icon className={f.tone} size={24} />
              <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t bg-brand">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-14 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to pick up where you left off?</h2>
          <p className="max-w-xl text-sm text-white/80">Sign in to see today's status across every enterprise — what's approved, what's waiting, and what needs chasing.</p>
          <button onClick={onEnter} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand-dark shadow-sm transition hover:bg-slate-50">
            {cta} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-500">
        <FullLogo height={28} />
        <p>MGP M1 Approval Tracker · SADP II Matching Grants Programme · Central Region</p>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} 4D Climate Solutions · creative · innovative · green · sustainable</p>
      </footer>
    </div>
  );
}
