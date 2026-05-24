/**
 * Inspection (compliance monitoring) form renderer. Reads the universal
 * schema from src/forms/inspectionSchema.ts.
 *
 * 21 aspects across 3 phases. Per aspect:
 *   - status radio: C / N-C / P-C / N/A
 *   - comment textarea (free text)
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
import { cn } from '@/lib/utils';

interface InspectionFormRendererProps {
  responses: InspectionResponses;
  onChange: (next: InspectionResponses) => void;
  readOnly?: boolean;
}

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspection notes (optional)</CardTitle>
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

      {INSPECTION_PHASES.map((phase) => (
        <Card key={phase.id}>
          <CardHeader>
            <CardTitle className="text-base">{phase.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {phase.aspects.map((aspect) => {
              const current = responses.aspects?.[aspect.id];
              return (
                <div key={aspect.id} className="border-b last:border-b-0 pb-4 space-y-2">
                  <Label className="text-sm">{aspect.label}</Label>
                  <div className="flex flex-wrap gap-2">
                    {INSPECTION_STATUSES.map((s) => {
                      const isSelected = current?.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={readOnly}
                          onClick={() => !readOnly && setAspectStatus(aspect.id, s)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            isSelected
                              ? statusColorClasses(s)
                              : 'border-input bg-background hover:border-primary/40',
                            readOnly && 'opacity-70 cursor-default',
                          )}
                        >
                          {INSPECTION_STATUS_LABELS[s]}
                        </button>
                      );
                    })}
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
      ))}
    </div>
  );
}

function statusColorClasses(s: (typeof INSPECTION_STATUSES)[number]): string {
  switch (s) {
    case 'c':
      return 'border-green-700 bg-green-50 text-green-800';
    case 'nc':
      return 'border-red-700 bg-red-50 text-red-800';
    case 'pc':
      return 'border-amber-600 bg-amber-50 text-amber-900';
    case 'na':
      return 'border-slate-400 bg-slate-50 text-slate-700';
  }
}
