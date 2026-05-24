import { Badge } from '@/components/ui/badge';
import type { SubmissionStatus } from '@/types/database';

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
};

const STATUS_VARIANT: Record<SubmissionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  submitted: 'secondary',
  approved: 'default',
};

export function StatusBadge({ status }: { status: SubmissionStatus | null | undefined }) {
  if (!status) return <Badge variant="outline">Not started</Badge>;
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
