/**
 * Inspection (compliance monitoring) form renderer. Reads the universal
 * schema from src/forms/inspectionSchema.ts.
 *
 * 21 aspects across 3 phases. Per aspect:
 *   - status pill: C / N-C / P-C / N/A (colored, click-to-select)
 *   - comment textarea (free text)
 * The card header shows a small per-phase completion counter so it's obvious
 * how much of the checklist is filled.
 */
import {
  INSPECTION_PHASES,
  INSPECTION_STATUSES,
  INSPECTION_STATUS_LABELS,
  type InspectionResponses,
} from '@/forms/inspectionSchema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill';
import { FileText, ListChecks } from 'lucide-react';

interface InspectionFormRendererProps {
  responses: InspectionResponses;
  onChange: (next: InspectionResponses) => void;
  readOnly?: boolean;
}

/** Map inspection status code → semantic pill tone. */
const STATUS_TONE: Record<(typeof INSPECTION_STATUSES)[number], StatusPillTone> = {
  c: 'success',
  pc: 'warning',
  nc: 'destructive',
  na: 'neutral',
};

export function InspectionFormRenderer({
  responses,
  onChange,
  readOnly = false,
}: InspectionFormRendererProps) {
  const setAspectStatus = (aspectId: string, status: (typeof INSPECTION_STATUSES)[number]) => {
    const prev = responses.aspects?.[aspectId] ?? {};
    onChange({
      ...responses,
      aspects: { ...(responses.aspects ?? {}), [aspectId]: { ...prev, status } },
    });
  };
  const setAspectComment = (aspectId: string, comment: string) => {
    const prev = responses.aspects?.[aspectId] ?? {};
    onChange({
      ...responses,
      aspects: { ...(responses.aspects ?? {}), [aspectId]: { ...prev, comment } },
    });
  };
  const setNotes = (notes: string) => onChange({ ...responses, notes });

  // Overall progress for the strip at the top of the form.
  const totalAspects = INSPECTION_PHASES.reduce((s, p) => s + p.aspects.length, 0);
  const filledAspects = INSPECTION_PHASES.reduce(
    (s, p) => s + p.aspects.filter((a) => responses.aspects?.[a.id]?.status).length,
    0,
  );
  const pct = totalAspects ? Math.round((filledAspects / totalAspects) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Sticky-feeling progress strip */}
      <Card className="bg-gradient-to-r from-tint-success/50 to-background border-success/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <ListChecks className="h-4 w-4 text-success" />
              Checklist progress
            </span>
            <span className="tabular-nums text-muted-foreground">
              {filledAspects} / {totalAspects} aspects · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Inspection notes (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="General observations from the visit, anything not covered by an aspect below."
            value={responses.notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            rows={3}
          />
        </CardContent>
      </Card>

      {INSPECTION_PHASES.map((phase) => {
        const filled = phase.aspects.filter((a) => responses.aspects?.[a.id]?.status).length;
        return (
          <Card key={phase.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{phase.title}</CardTitle>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {filled} / {phase.aspects.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {phase.aspects.map((aspect) => {
                const current = responses.aspects?.[aspect.id];
                return (
                  <div key={aspect.id} className="border-b last:border-b-0 pb-4 space-y-2">
                    <Label className="text-sm">{aspect.label}</Label>
                    <div className="flex flex-wrap gap-2">
                      {INSPECTION_STATUSES.map((s) => (
                        <StatusPill
                          key={s}
                          tone={STATUS_TONE[s]}
                          active={current?.status === s}
                          disabled={readOnly}
                          onSelect={() => setAspectStatus(aspect.id, s)}
                        >
                          {INSPECTION_STATUS_LABELS[s]}
                        </StatusPill>
                      ))}
                    </div>
                    <Textarea
                      value={current?.comment ?? ''}
                      onChange={(e) => setAspectComment(aspect.id, e.target.value)}
                      placeholder={aspect.comment_hint ?? 'Comment'}
                      disabled={readOnly}
                      rows={2}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
