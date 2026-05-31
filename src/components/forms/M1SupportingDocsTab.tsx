/**
 * M1 Phase 3b — Supporting Documents tab.
 *
 * Multi-file uploader tagged by `kind`. Rows are grouped by kind so a long
 * list of bank statements + invoices stays readable. Read-only when the M1
 * submission is approved.
 *
 * Allowed file types: PDF, PNG, JPEG (enforced both client-side and via the
 * bucket's `allowed_mime_types`).
 */
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  formatBytes,
  M1_DOC_KIND_LABELS,
  M1_DOC_KIND_ORDER,
  openM1SupportingDoc,
  useM1SupportingDocs,
  useRemoveM1SupportingDoc,
  useUpdateM1SupportingDoc,
  useUploadM1SupportingDoc,
} from '@/lib/m1';
import { formatDateDMY } from '@/lib/utils';
import type { M1DocKind, M1SupportingDocumentRow } from '@/types/database';

const ALLOWED_TYPES = 'application/pdf,image/png,image/jpeg';

type Props = {
  enterpriseId: string;
  readOnly: boolean;
};

export function M1SupportingDocsTab({ enterpriseId, readOnly }: Props) {
  const docs = useM1SupportingDocs(enterpriseId);
  const upload = useUploadM1SupportingDoc(enterpriseId);
  const update = useUpdateM1SupportingDoc(enterpriseId);
  const remove = useRemoveM1SupportingDoc(enterpriseId);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Kind selected for the NEXT upload. Persisted across uploads so a user
  // dropping in 12 receipts doesn't have to set the kind 12 times.
  const [pendingKind, setPendingKind] = useState<M1DocKind>('receipt');
  const [pendingNotes, setPendingNotes] = useState<string>('');

  const grouped = useMemo(() => {
    const map: Record<M1DocKind, M1SupportingDocumentRow[]> = {
      bank_statement: [],
      transaction_history: [],
      invoice: [],
      receipt: [],
      audit_trail: [],
      contract: [],
      other: [],
    };
    for (const doc of docs.data ?? []) {
      (map[doc.kind] ??= []).push(doc);
    }
    return map;
  }, [docs.data]);

  const totalCount = docs.data?.length ?? 0;
  const totalBytes = (docs.data ?? []).reduce((sum, d) => sum + (d.size_bytes ?? 0), 0);

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    let success = 0;
    let fail = 0;
    for (const file of list) {
      try {
        await upload.mutateAsync({
          file,
          kind: pendingKind,
          notes: pendingNotes,
        });
        success += 1;
      } catch (err) {
        fail += 1;
        toast.error(`Upload failed for ${file.name}`, {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (success > 0) {
      toast.success(
        `Uploaded ${success} ${success === 1 ? 'document' : 'documents'}` +
          (fail > 0 ? ` · ${fail} failed` : ''),
      );
    }
    // Reset the picker so the same file can be chosen again later.
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Clear the per-batch notes so the next batch doesn't accidentally re-use them.
    setPendingNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Supporting documents
          </CardTitle>
          <CardDescription>
            Attach bank statements, transaction histories, invoices, receipts, audit trails,
            contracts, and other evidence. PDFs, PNGs, and JPEGs are accepted (up to 100&nbsp;MB
            per file). Files are stored privately in the <code>m1-supporting-docs</code> bucket
            and embedded into the M1 PDF report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly ? (
            <p className="text-sm text-muted-foreground">
              This M1 report is approved — supporting documents are locked. Reopen the report
              to add or remove files.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pending-kind">Kind for next upload</Label>
                  <Select
                    value={pendingKind}
                    onValueChange={(v) => setPendingKind(v as M1DocKind)}
                  >
                    <SelectTrigger id="pending-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {M1_DOC_KIND_ORDER.map((k) => (
                        <SelectItem key={k} value={k}>
                          {M1_DOC_KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pending-notes">Notes (optional, applied to this batch)</Label>
                  <Input
                    id="pending-notes"
                    placeholder="e.g. Q1 statements, ABSA account"
                    value={pendingNotes}
                    onChange={(e) => setPendingNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_TYPES}
                  className="hidden"
                  onChange={(e) => void handleFilesChosen(e.target.files)}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={upload.isPending}
                  variant="default"
                >
                  {upload.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {upload.isPending ? 'Uploading…' : 'Add files'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tip — set the kind once, then drop multiple files at the same time.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* List card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Attached files</CardTitle>
            <CardDescription>
              {totalCount === 0
                ? 'No supporting documents attached yet.'
                : `${totalCount} ${totalCount === 1 ? 'file' : 'files'} · ${formatBytes(
                    totalBytes,
                  )} total`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {docs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.isError ? (
            <p className="text-sm text-destructive">
              Failed to load: {docs.error instanceof Error ? docs.error.message : 'unknown'}
            </p>
          ) : totalCount === 0 ? (
            <EmptyState
              icon={Paperclip}
              title="No documents yet"
              description="Use the Add files button above to attach supporting evidence for this M1 report."
            />
          ) : (
            <div className="space-y-6">
              {M1_DOC_KIND_ORDER.filter((k) => grouped[k].length > 0).map((k) => (
                <div key={k} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{M1_DOC_KIND_LABELS[k]}</h4>
                    <Badge variant="secondary">{grouped[k].length}</Badge>
                  </div>
                  <ul className="divide-y rounded-md border">
                    {grouped[k].map((doc) => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        readOnly={readOnly}
                        onUpdateKind={(kind) => update.mutate({ id: doc.id, kind })}
                        onUpdateNotes={(notes) => update.mutate({ id: doc.id, notes })}
                        onOpen={() => void openDoc(doc.storage_path)}
                        onRemove={() => {
                          if (
                            window.confirm(
                              `Remove ${doc.original_filename ?? 'this file'}? This deletes the file from storage. Cannot be undone.`,
                            )
                          ) {
                            remove.mutate({ id: doc.id, storage_path: doc.storage_path });
                          }
                        }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** One row in the attached-files list. */
function DocRow({
  doc,
  readOnly,
  onUpdateKind,
  onUpdateNotes,
  onOpen,
  onRemove,
}: {
  doc: M1SupportingDocumentRow;
  readOnly: boolean;
  onUpdateKind: (kind: M1DocKind) => void;
  onUpdateNotes: (notes: string) => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(doc.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const isImage = doc.storage_path.match(/\.(png|jpe?g)$/i);
  const Icon = isImage ? ImageIcon : FileText;

  return (
    <li className="flex flex-wrap items-start gap-3 p-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-[12rem]">
        <button
          type="button"
          onClick={onOpen}
          className="font-medium text-left text-primary hover:underline"
          title="Open in a new tab"
        >
          {doc.original_filename ?? doc.storage_path.split('/').pop()}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatBytes(doc.size_bytes ?? 0)} · uploaded {formatDateDMY(doc.uploaded_at)}
        </p>
        {/* Notes — read-only display, click to edit */}
        {editingNotes ? (
          <div className="mt-2 space-y-1.5">
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={2}
              className="text-xs"
              placeholder="Notes about this document"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onUpdateNotes(notesDraft);
                  setEditingNotes(false);
                }}
              >
                Save notes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNotesDraft(doc.notes ?? '');
                  setEditingNotes(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : doc.notes ? (
          <p
            className="text-xs text-muted-foreground italic mt-1 cursor-text"
            onClick={() => !readOnly && setEditingNotes(true)}
            title={readOnly ? undefined : 'Click to edit notes'}
          >
            “{doc.notes}”
          </p>
        ) : (
          !readOnly && (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className="text-xs text-muted-foreground underline mt-1"
            >
              Add notes
            </button>
          )
        )}
      </div>
      {!readOnly && (
        <Select value={doc.kind} onValueChange={(v) => onUpdateKind(v as M1DocKind)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {M1_DOC_KIND_ORDER.map((k) => (
              <SelectItem key={k} value={k}>
                {M1_DOC_KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!readOnly && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Remove this file"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}

async function openDoc(storagePath: string) {
  try {
    await openM1SupportingDoc(storagePath);
  } catch (err) {
    toast.error('Could not open document', {
      description: err instanceof Error ? err.message : String(err),
    });
  }
}
