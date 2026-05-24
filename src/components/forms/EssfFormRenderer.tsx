/**
 * ESSF form renderer. Reads the schema from src/forms/essfSchema.ts and a
 * responses object (the contents of essf_submissions.responses jsonb).
 *
 * Three tables in order:
 *   1. Site Sensitivity (5 issues × Low/Medium/High clickable cards, color-coded)
 *   2. Completeness (8 questions × Yes/No/N-A colored pills)
 *   3. Environmental & Social Checklist (24 Y/N questions in 4 groups, colored pills)
 *
 * `readOnly` disables all inputs (used when status is 'approved').
 */
import {
  ESSF_SITE_SENSITIVITY,
  ESSF_COMPLETENESS,
  ESSF_CHECKLIST,
  type EssfResponses,
} from '@/forms/essfSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import { ListChecks } from 'lucide-react';

interface EssfFormRendererProps {
  responses: EssfResponses;
  onChange: (next: EssfResponses) => void;
  readOnly?: boolean;
}

const RATING_TONE: Record<'low' | 'medium' | 'high', StatusPillTone> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
};

const YN_TONE = { yes: 'success', no: 'destructive', n_a: 'neutral' } as const;

export function EssfFormRenderer({ responses, onChange, readOnly = false }: EssfFormRendererProps) {
  // Overall progress strip
  const totalQuestions =
    ESSF_SITE_SENSITIVITY.issues.length +
    ESSF_COMPLETENESS.questions.length +
    ESSF_CHECKLIST.groups.reduce((s, g) => s + g.questions.length, 0);
  const filled =
    ESSF_SITE_SENSITIVITY.issues.filter((i) => responses.site_sensitivity?.[i.id]).length +
    ESSF_COMPLETENESS.questions.filter((q) => responses.completeness?.[q.id]).length +
    ESSF_CHECKLIST.groups.reduce(
      (s, g) => s + g.questions.filter((q) => responses.checklist?.[q.id]).length,
      0,
    );
  const pct = totalQuestions ? Math.round((filled / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-tint-success/50 to-background border-success/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <ListChecks className="h-4 w-4 text-success" />
              Form progress
            </span>
            <span className="tabular-nums text-muted-foreground">
              {filled} / {totalQuestions} answered · {pct}%
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

      <SiteSensitivityTable responses={responses} onChange={onChange} readOnly={readOnly} />
      <CompletenessTable responses={responses} onChange={onChange} readOnly={readOnly} />
      <ChecklistTable responses={responses} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Site Sensitivity — clickable descriptor cards, color-coded by rating
// ----------------------------------------------------------------------------
function SiteSensitivityTable({ responses, onChange, readOnly }: EssfFormRendererProps) {
  const setRating = (issueId: string, rating: 'low' | 'medium' | 'high') => {
    onChange({
      ...responses,
      site_sensitivity: { ...(responses.site_sensitivity ?? {}), [issueId]: rating },
    });
  };
  const CELL_STYLES: Record<'low' | 'medium' | 'high', { selected: string }> = {
    low:    { selected: 'border-success bg-success/10 ring-2 ring-success/20' },
    medium: { selected: 'border-warning bg-warning/10 ring-2 ring-warning/20' },
    high:   { selected: 'border-destructive bg-destructive/5 ring-2 ring-destructive/20' },
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">1.0 Site Selection — Sensitivity</CardTitle>
        <CardDescription>
          For each issue, pick a sensitivity rating based on the descriptors. Higher
          ratings don&apos;t necessarily mean the site is unsuitable — they indicate
          where more substantial mitigation may be required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 w-[20%]">Issue</th>
                {ESSF_SITE_SENSITIVITY.ratings.map((r) => (
                  <th key={r} className="py-2 pr-3 w-[26%] capitalize">{r}</th>
                ))}
                <th className="py-2 pr-3 w-[10%]">Selected</th>
              </tr>
            </thead>
            <tbody>
              {ESSF_SITE_SENSITIVITY.issues.map((issue) => {
                const selected = responses.site_sensitivity?.[issue.id];
                return (
                  <tr key={issue.id} className="border-b align-top">
                    <td className="py-3 pr-3 font-medium">{issue.label}</td>
                    {ESSF_SITE_SENSITIVITY.ratings.map((rating) => {
                      const isSelected = selected === rating;
                      return (
                        <td key={rating} className="py-3 pr-3">
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => !readOnly && setRating(issue.id, rating)}
                            className={cn(
                              'w-full text-left text-xs p-2 rounded border transition-all',
                              isSelected
                                ? CELL_STYLES[rating].selected
                                : 'border-input hover:border-primary/40 hover:bg-muted/40',
                              readOnly && 'opacity-70 cursor-default',
                            )}
                          >
                            {issue.descriptors[rating]}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 pr-3 text-center">
                      {selected ? (
                        <StatusPill tone={RATING_TONE[selected]} active onSelect={() => {}} disabled showIconWhenActive={false}>
                          {selected}
                        </StatusPill>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Completeness — Y / N / N-A colored pills
// ----------------------------------------------------------------------------
function CompletenessTable({ responses, onChange, readOnly }: EssfFormRendererProps) {
  const setAnswer = (qId: string, val: 'yes' | 'no' | 'n_a') => {
    onChange({
      ...responses,
      completeness: { ...(responses.completeness ?? {}), [qId]: val },
    });
  };
  const LABELS = { yes: 'Yes', no: 'No', n_a: 'N/A' } as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">2.0 Completeness of Sub-projects Application</CardTitle>
        <CardDescription>
          Does the sub-project application document contain, as appropriate, the following?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {ESSF_COMPLETENESS.questions.map((q) => {
            const selected = responses.completeness?.[q.id];
            return (
              <li key={q.id} className="py-3 flex items-start gap-3 justify-between">
                <span className="text-sm flex-1">{q.label}</span>
                <div className="flex gap-1.5 shrink-0">
                  {(['yes', 'no', 'n_a'] as const).map((opt) => (
                    <StatusPill
                      key={opt}
                      tone={YN_TONE[opt]}
                      active={selected === opt}
                      disabled={readOnly}
                      onSelect={() => setAnswer(q.id, opt)}
                    >
                      {LABELS[opt]}
                    </StatusPill>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 24-q Checklist — Y/N colored pills, grouped A/B/C/D
// ----------------------------------------------------------------------------
function ChecklistTable({ responses, onChange, readOnly }: EssfFormRendererProps) {
  const setAnswer = (qId: string, val: 'yes' | 'no') => {
    onChange({
      ...responses,
      checklist: { ...(responses.checklist ?? {}), [qId]: val },
    });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">3.0 Environmental and Social Checklist</CardTitle>
        <CardDescription>
          Will the sub-project trigger any of the following? Answer Yes or No for each item.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {ESSF_CHECKLIST.groups.map((group) => {
          const groupFilled = group.questions.filter((q) => responses.checklist?.[q.id]).length;
          return (
            <div key={group.id} className="border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold">
                  {group.id}. {group.title}
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {groupFilled} / {group.questions.length}
                </span>
              </div>
              <ul className="mt-3 divide-y">
                {group.questions.map((q) => {
                  const selected = responses.checklist?.[q.id];
                  return (
                    <li key={q.id} className="py-2 flex items-start justify-between gap-3">
                      <span className="text-sm flex-1">{q.label}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <StatusPill
                          tone="success"
                          active={selected === 'yes'}
                          disabled={readOnly}
                          onSelect={() => setAnswer(q.id, 'yes')}
                        >
                          Yes
                        </StatusPill>
                        <StatusPill
                          tone="destructive"
                          active={selected === 'no'}
                          disabled={readOnly}
                          onSelect={() => setAnswer(q.id, 'no')}
                        >
                          No
                        </StatusPill>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs italic text-muted-foreground">{group.footer}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
