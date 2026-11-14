/**
 * Public "Partners & Contact" page. Placeholder copy — written to be edited.
 * Only 4D Climate Solutions is named; add others / contact details as approved.
 */
import { Mail, MapPin, Phone } from 'lucide-react';

export function PartnersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">Partners &amp; contact</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
        Who's behind the programme
      </h1>

      <section className="mt-8 rounded-xl border bg-background p-6">
        <div className="flex items-center gap-3">
          <img src="/logo-4d-mark.png" alt="" className="h-10 w-10" />
          <div>
            <h2 className="font-semibold">4D Climate Solutions</h2>
            <p className="text-sm text-muted-foreground">Implementation &amp; monitoring partner</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          4D Climate Solutions implements and monitors SADP-II across Lesotho's central region,
          working directly with smallholder farmers and field teams.
        </p>
      </section>

      <p className="mt-6 text-sm italic text-muted-foreground">
        [Add any additional partners or funders here, once confirmed.]
      </p>

      <h2 className="mt-12 text-xl font-semibold">Get in touch</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <MapPin className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-medium">Location</div>
          <div className="text-sm text-muted-foreground">Maseru, Lesotho</div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <Mail className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-medium">Email</div>
          <div className="text-sm italic text-muted-foreground">[add email]</div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <Phone className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-medium">Phone</div>
          <div className="text-sm italic text-muted-foreground">[add phone]</div>
        </div>
      </div>
    </div>
  );
}
