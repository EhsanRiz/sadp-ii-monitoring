/**
 * Public landing page for the SADP-II / 4D Climate Solutions site.
 * Placeholder copy — written to be edited. 4D only; no other partner named.
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, ArrowRight, Sprout, Map, LineChart } from 'lucide-react';

const STAGES = [
  { label: 'M1', title: 'First milestone', body: 'Farmer contribution, budget allocation and fund depletion, reviewed and approved.' },
  { label: 'M2', title: 'Second milestone', body: 'The same steps for the next phase of investment, building toward a self-sustaining enterprise.' },
  { label: '🎓', title: 'Graduation', body: 'Milestones complete — the enterprise has finished the programme journey.' },
];

const DISTRICTS = ['Maseru', 'Berea', 'Thaba-Tseka'];

export function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-tint-success/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-primary">
            <Sprout className="h-3.5 w-3.5" /> Smallholder Agriculture Development Project II
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl" style={{ textWrap: 'balance' }}>
            Growing climate-smart smallholder enterprises across central Lesotho
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            4D Climate Solutions supports and monitors agricultural enterprises through every
            milestone — from first investment to graduation — in Maseru, Berea and Thaba-Tseka.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard"><LogIn className="mr-2 h-4 w-4" /> Monitoring login</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/about">About the programme <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {[
            { k: '164', v: 'enterprises supported' },
            { k: '3', v: 'central districts' },
            { k: 'M1 → M2', v: 'milestone journey' },
            { k: 'Round 3', v: 'current cohort' },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-3xl font-bold tabular-nums text-primary">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The journey */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">The enterprise journey</h2>
          <p className="mt-3 text-muted-foreground">
            Every enterprise moves through the same path. We track its stage, its contributions
            and its funds at each step — so support reaches farmers when they need it.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STAGES.map((s) => (
            <div key={s.title} className="rounded-xl border bg-background p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary">
                {s.label}
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Districts + CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Map className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Where we work</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Central region of Lesotho</h2>
            <p className="mt-3 text-muted-foreground">
              4D Climate Solutions covers three districts in the central region.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {DISTRICTS.map((d) => (
                <span key={d} className="rounded-full border bg-background px-3 py-1.5 text-sm font-medium">{d}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-background p-6">
            <div className="flex items-center gap-2 text-primary">
              <LineChart className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">For staff</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">Field monitoring, online or offline</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Staff record visits, contributions and reports from the field — the app works
              offline on a tablet and syncs when back online.
            </p>
            <Button asChild className="mt-5">
              <Link to="/dashboard"><LogIn className="mr-2 h-4 w-4" /> Open the monitoring app</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
