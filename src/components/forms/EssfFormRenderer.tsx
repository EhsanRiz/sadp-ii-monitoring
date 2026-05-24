/**
 * ESSF form renderer. Reads the schema from src/forms/essfSchema.ts and a
 * responses object (the contents of essf_submissions.responses jsonb).
 *
 * Three tables in order:
 *   1. Site Sensitivity (5 issues × Low/Medium/High radio)
 *   2. Completeness (8 questions × Yes/No/N-A radio)
 *   3. Environmental & Social Checklist (24 Y/N questions in 4 groups)
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
import { cn } from '@/lib/utils';

interface EssfFormRendererProps {
  responses: EssfResponses;
  onChange: (next: EssfResponses) => void;
  readOnly?: boolean;
}

export function EssfFormRenderer({ responses, onChange, readOnly = false }: EssfFormRendererProps) {
  return (
    <div className="space-y-6">
      <SiteSensitivityTable responses={responses} onChange={onChange} readOnly={readOnly} />
      <CompletenessTable responses={responses} onChange={onChange} readOnly={readOnly} />
      <ChecklistTable responses={responses} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Site Sensitivity — radio per row (Low / Medium / High)
// ----------------------------------------------------------------------------
function SiteSensitivityTable({ responses, onChange, readOnly }: EssfFormRendererProps) {
  const setRating = (issueId: string, rating: 'low' | 'medium' | 'high') => {
    onChange({
      ...responses,
      site_sensitivity: { ...(responses.site_sensitivity ?? {}), [issueId]: rating },
    });
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
                              'w-full text-left text-xs p-2 rounded border transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-input hover:border-primary/40',
                              readOnly && 'opacity-70 cursor-default',
                            )}
                          >
                            {issue.descriptors[rating]}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 pr-3 text-center font-medium capitalize">
                      {selected ?? '—'}
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
// Completeness — Y/N/N-A per question
// ----------------------------------------------------------------------------
function CompletenessTable({ responses, onChange, readOnly }: EssfFormRendererProps) {
  const setAnswer = (qId: string, val: 'yes' | 'no' | 'n_a') => {
    onChange({
      ...responses,
      completeness: { ...(responses.completeness ?? {}), [qId]: val },
    });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">2.0 Completeness of Sub-projects Application</CardTitle>
        <CardDescription>
          Does the sub-project application document contain, as appropriate, the following?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 w-[70%]">Item</th>
              <th className="py-2 px-2 text-center w-[10%]">Yes</th>
              <th className="py-2 px-2 text-center w-[10%]">No</th>
              <th className="py-2 px-2 text-center w-[10%]">N/A</th>
            </tr>
          </thead>
          <tbody>
            {ESSF_COMPLETENESS.questions.map((q) => {
              const selected = responses.completeness?.[q.id];
              return (
                <tr key={q.id} className="border-b">
                  <td className="py-2 pr-3">{q.label}</td>
                  {(['yes', 'no', 'n_a'] as const).map((opt) => (
                    <td key={opt} className="text-center py-2">
                      <input
                        type="radio"
                        name={`comp-${q.id}`}
                        disabled={readOnly}
                        checked={selected === opt}
                        onChange={() => setAnswer(q.id, opt)}
                        className="cursor-pointer accent-primary disabled:cursor-default"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 24-q Checklist — Y/N grouped A/B/C/D
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
        {ESSF_CHECKLIST.groups.map((group) => (
          <div key={group.id} className="border rounded-md p-3 bg-muted/30">
            <Label className="text-sm font-semibold">
              {group.id}. {group.title}
            </Label>
            <table className="w-full text-sm mt-3">
              <tbody>
                {group.questions.map((q) => {
                  const selected = responses.checklist?.[q.id];
                  return (
                    <tr key={q.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">{q.label}</td>
                      {(['yes', 'no'] as const).map((opt) => (
                        <td key={opt} className="text-center py-2 w-[60px]">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`chk-${q.id}`}
                              disabled={readOnly}
                              checked={selected === opt}
                              onChange={() => setAnswer(q.id, opt)}
                              className="accent-primary disabled:cursor-default"
                            />
                            <span className="text-xs capitalize">{opt}</span>
                          </label>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs italic text-muted-foreground">{group.footer}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
