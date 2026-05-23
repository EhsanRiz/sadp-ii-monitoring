import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEnterprises, type EnterpriseListFilters } from '@/lib/enterprises';
import type { DrillingStatus, EsmpStatus, Milestone1ReportStatus } from '@/types/database';
import { useDistricts, useEnterpriseTypes, useResourceCenters } from '@/lib/catalogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, FileText } from 'lucide-react';

const ESMP_LABEL: Record<string, string> = {
  not_started: 'Not started',
  pending_app_completion: 'In app, in progress',
  completed_uploaded: 'Uploaded (scanned)',
  completed_in_app: 'Completed in app',
};

const ESMP_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  not_started: 'destructive',
  pending_app_completion: 'outline',
  completed_uploaded: 'secondary',
  completed_in_app: 'default',
};

export function EnterprisesListPage() {
  const [searchParams] = useSearchParams();
  const initialFilters = useMemo<EnterpriseListFilters>(
    () => ({
      organizationCode: searchParams.get('orgCode') ?? null,
      esmpStatus: (searchParams.get('esmp') as EsmpStatus) ?? null,
      milestone1Status: (searchParams.get('m1') as Milestone1ReportStatus) ?? null,
      drillingStatus: (searchParams.get('drilling') as DrillingStatus) ?? null,
      completeness:
        (searchParams.get('completeness') as 'minimal' | 'cover_page_ready') ?? null,
    }),
    // Only seed once from URL; user can clear afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [filters, setFilters] = useState<EnterpriseListFilters>(initialFilters);
  const { data: districts } = useDistricts();
  const { data: types } = useEnterpriseTypes();
  const { data: rcs } = useResourceCenters(filters.districtId ?? null);
  const { data: enterprises, isLoading, error } = useEnterprises(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enterprises</h1>
          <p className="text-sm text-muted-foreground">
            {enterprises ? `${enterprises.length} shown` : 'Loading…'}
          </p>
        </div>
        <Button asChild>
          <Link to="/enterprises/new">
            <Plus className="mr-2 h-4 w-4" />
            New enterprise
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Beneficiary or applicant name…"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>District</Label>
              <Select
                value={filters.districtId ?? '__all'}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    districtId: v === '__all' ? null : v,
                    resourceCenterId: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All districts</SelectItem>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resource Center</Label>
              <Select
                value={filters.resourceCenterId ?? '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, resourceCenterId: v === '__all' ? null : v })
                }
                disabled={!filters.districtId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All RCs</SelectItem>
                  {rcs?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={filters.enterpriseTypeId ? String(filters.enterpriseTypeId) : '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, enterpriseTypeId: v === '__all' ? null : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All types</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ESMP status</Label>
              <Select
                value={filters.esmpStatus ?? '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, esmpStatus: v === '__all' ? null : (v as EsmpStatus) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {Object.entries(ESMP_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Beneficiary</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">District</th>
                  <th className="py-2 pr-4">Round</th>
                  <th className="py-2 pr-4">Completeness</th>
                  <th className="py-2 pr-4">ESMP</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {enterprises?.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/40">
                    <td className="py-2 pr-4 font-medium">{e.beneficiary_short_name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {types?.find((t) => t.id === e.enterprise_type_id)?.name ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {districts?.find((d) => d.id === e.district_id)?.name ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">R{e.round_id}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={e.registration_completeness === 'cover_page_ready' ? 'default' : 'outline'}>
                        {e.registration_completeness === 'cover_page_ready' ? 'Cover-page ready' : 'Minimal'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={ESMP_VARIANT[e.esmp_status] ?? 'outline'}>
                        {ESMP_LABEL[e.esmp_status] ?? e.esmp_status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/enterprises/${e.id}`}>
                          <FileText className="mr-2 h-4 w-4" /> Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {enterprises && enterprises.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-muted-foreground" colSpan={7}>
                      No enterprises match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
