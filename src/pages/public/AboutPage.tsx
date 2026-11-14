/**
 * Public "About" page. Placeholder copy — written to be edited. 4D only.
 */
import { CheckCircle2 } from 'lucide-react';

const OBJECTIVES = [
  'Strengthen smallholder agricultural enterprises and their incomes.',
  'Support climate-smart, sustainable farming practices.',
  'Track each enterprise from first investment through to graduation.',
  'Give field teams clear, up-to-date monitoring data — even offline.',
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">About the programme</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
        Supporting smallholder enterprises through every milestone
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        The Smallholder Agriculture Development Project II (SADP-II) helps smallholder farmers in
        Lesotho build viable, climate-smart agricultural enterprises. 4D Climate Solutions implements
        and monitors the programme across the central region — Maseru, Berea and Thaba-Tseka.
      </p>

      <h2 className="mt-12 text-xl font-semibold">What the programme does</h2>
      <ul className="mt-4 space-y-3">
        {OBJECTIVES.map((o) => (
          <li key={o} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <span className="text-muted-foreground">{o}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-xl font-semibold">The enterprise lifecycle</h2>
      <p className="mt-4 text-muted-foreground">
        Each enterprise follows a structured journey. In <strong>Milestone 1 (M1)</strong> the farmer
        makes their contribution, a budget is allocated, funds are drawn down, and a milestone report
        is reviewed and approved. <strong>Milestone 2 (M2)</strong> repeats these steps for the next
        phase of investment. Once M2 is complete and approved, the enterprise
        <strong> graduates</strong> — the goal being a farm that can stand on its own.
      </p>
      <p className="mt-4 text-muted-foreground">
        Throughout, field staff record contributions, budget allocation, fund depletion and visits —
        giving a live picture of where every enterprise stands.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Implemented by 4D Climate Solutions</h2>
      <p className="mt-4 text-muted-foreground">
        4D Climate Solutions leads implementation and monitoring for the central region, working
        directly with farmers, field supervisors and M&amp;E officers.
      </p>
      <p className="mt-6 text-sm italic text-muted-foreground">
        [Placeholder text — replace with your approved programme description.]
      </p>
    </div>
  );
}
