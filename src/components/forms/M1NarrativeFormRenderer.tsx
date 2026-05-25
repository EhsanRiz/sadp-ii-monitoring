/**
 * M1 Narrative form — 7 free-text sections.
 *
 * Sections are defined in src/forms/m1NarrativeSchema.ts. The form is a
 * plain stack of labelled textareas; no per-field validation beyond
 * length (deliberately permissive — supervisor knows what's relevant).
 *
 * readOnly disables every textarea (used when the submission is in
 * 'approved' state or while loading).
 */
import { M1_NARRATIVE_SECTIONS, type M1NarrativeResponses } from '@/forms/m1NarrativeSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

interface M1NarrativeFormRendererProps {
  responses: M1NarrativeResponses;
  onChange: (next: M1NarrativeResponses) => void;
  readOnly?: boolean;
}

export function M1NarrativeFormRenderer({
  responses,
  onChange,
  readOnly = false,
}: M1NarrativeFormRendererProps) {
  const totalSections = M1_NARRATIVE_SECTIONS.length;
  const filled = M1_NARRATIVE_SECTIONS.filter((s) => (responses[s.id] ?? '').trim().length > 0).length;
  const pct = totalSections ? Math.round((filled / totalSections) * 100) : 0;

  const setSection = (id: string, value: string) => {
    onChange({ ...responses, [id]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-tint-info/50 to-background border-info/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4 text-info" />
              Narrative progress
            </span>
            <span className="tabular-nums text-muted-foreground">
              {filled} / {totalSections} sections filled · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-info transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">II. Narrative Progress Report</CardTitle>
          <CardDescription>
            Seven sections describing Milestone&nbsp;1 progress in plain prose. Section headings
            mirror the printed M1 template — fill what's relevant; brief answers ("No problems
            in M1") are fine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {M1_NARRATIVE_SECTIONS.map((section) => {
            const v = responses[section.id] ?? '';
            return (
              <div key={section.id} className="space-y-1.5">
                <Label htmlFor={`m1-${section.id}`} className="text-sm font-semibold">
                  {section.number} {section.title}
                </Label>
                {section.helper && (
                  <p className="text-xs text-muted-foreground">{section.helper}</p>
                )}
                <Textarea
                  id={`m1-${section.id}`}
                  value={v}
                  onChange={(e) => setSection(section.id, e.target.value)}
                  disabled={readOnly}
                  placeholder={readOnly ? '' : 'Type or paste the narrative for this section…'}
                  rows={4}
                  className="resize-y"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
