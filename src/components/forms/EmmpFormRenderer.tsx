/**
 * EMMP form renderer — schema-driven. Reads the JSON schema from
 * emmp_templates.schema and renders sections → rows.
 *
 * Each row has:
 *   - activity (label only)
 *   - impacts:     checkboxes (multi)
 *   - mitigations: checkboxes (multi)
 *   - monitoring:  checkboxes (multi)
 *   - person_implement (text)
 *   - person_monitor   (text)
 *   - timeframe        (text)
 *
 * The responses object stores:
 *   { "<row_id>.i<n>": true|false, ..., "<row_id>.person_implement": "...", etc. }
 *
 * Defaults from the template (e.g. "NOT APPLICABLE", "FARMER") are shown as
 * placeholders in the inputs and pre-filled when the row is first touched.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface EmmpItem {
  id: string;
  label: string;
}

interface EmmpRow {
  id: string;
  activity_id: string | null;
  activity: string;
  impacts: EmmpItem[];
  mitigations: EmmpItem[];
  monitoring: EmmpItem[];
  default_person_implement: string | null;
  default_person_monitor: string | null;
  default_timeframe: string | null;
}

interface EmmpSection {
  id: string;
  title: string;
  rows: EmmpRow[];
}

export interface EmmpSchema {
  title: string;
  version: string;
  kind: 'emmp';
  sections: EmmpSection[];
}

interface EmmpFormRendererProps {
  schema: EmmpSchema;
  responses: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function EmmpFormRenderer({ schema, responses, onChange, readOnly = false }: EmmpFormRendererProps) {
  const setField = (key: string, value: unknown) => {
    onChange({ ...responses, [key]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{schema.title}</CardTitle>
          <CardDescription>
            {schema.version} · Environmental Management and Monitoring Plan. Check each impact
            that applies, then any mitigations and monitoring parameters in use. Fill in the
            person responsible and the time frame for each row.
          </CardDescription>
        </CardHeader>
      </Card>

      {schema.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.rows.map((row) => (
              <EmmpRowEditor
                key={row.id}
                row={row}
                responses={responses}
                setField={setField}
                readOnly={readOnly}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface EmmpRowEditorProps {
  row: EmmpRow;
  responses: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
  readOnly: boolean;
}

function EmmpRowEditor({ row, responses, setField, readOnly }: EmmpRowEditorProps) {
  return (
    <div className="border rounded-md p-4 bg-muted/20 space-y-4">
      <div className="text-sm font-semibold tracking-tight">{row.activity}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <ItemList
          title="Possible impacts"
          items={row.impacts}
          responses={responses}
          setField={setField}
          readOnly={readOnly}
        />
        <ItemList
          title="Mitigating measures"
          items={row.mitigations}
          responses={responses}
          setField={setField}
          readOnly={readOnly}
        />
        <ItemList
          title="Monitoring parameters"
          items={row.monitoring}
          responses={responses}
          setField={setField}
          readOnly={readOnly}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3 pt-2 border-t">
        <Field
          label="Person responsible to implement"
          k={`${row.id}.person_implement`}
          placeholder={row.default_person_implement ?? 'e.g. FARMER'}
          responses={responses}
          setField={setField}
          readOnly={readOnly}
        />
        <Field
          label="Person responsible to monitor"
          k={`${row.id}.person_monitor`}
          placeholder={row.default_person_monitor ?? 'e.g. SADP2 OFFICERS'}
          responses={responses}
          setField={setField}
          readOnly={readOnly}
        />
        <Field
          label="Time frame"
          k={`${row.id}.timeframe`}
          placeholder={row.default_timeframe ?? 'e.g. THROUGHOUT'}
          responses={responses}
          setField={setField}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

interface ItemListProps {
  title: string;
  items: EmmpItem[];
  responses: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
  readOnly: boolean;
}

function ItemList({ title, items, responses, setField, readOnly }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div>
        <Label className="text-xs font-medium text-muted-foreground">{title}</Label>
        <div className="text-xs italic text-muted-foreground mt-2">No items.</div>
      </div>
    );
  }
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{title}</Label>
      <div className="mt-2 space-y-1.5">
        {items.map((it) => {
          const checked = Boolean(responses[it.id]);
          return (
            <label
              key={it.id}
              className={cn(
                'flex items-start gap-2 text-xs cursor-pointer',
                readOnly && 'cursor-default',
              )}
            >
              <input
                type="checkbox"
                disabled={readOnly}
                checked={checked}
                onChange={(e) => setField(it.id, e.target.checked)}
                className="mt-0.5 accent-primary disabled:cursor-default"
              />
              <span className={cn(checked && 'font-medium')}>{it.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  k: string;
  placeholder: string;
  responses: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
  readOnly: boolean;
}

function Field({ label, k, placeholder, responses, setField, readOnly }: FieldProps) {
  const value = (responses[k] as string | undefined) ?? '';
  const looksLikeMultiline = value.length > 60 || placeholder.length > 50;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {looksLikeMultiline ? (
        <Textarea
          value={value}
          onChange={(e) => setField(k, e.target.value)}
          placeholder={placeholder}
          disabled={readOnly}
          rows={2}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => setField(k, e.target.value)}
          placeholder={placeholder}
          disabled={readOnly}
        />
      )}
    </div>
  );
}
