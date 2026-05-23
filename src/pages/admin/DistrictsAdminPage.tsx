import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDistricts, useOrganizations } from '@/lib/catalogs';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DistrictsAdminPage() {
  const { data: orgs } = useOrganizations();
  const { data: districts, isLoading } = useDistricts();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Pick an organization.');
      if (!name.trim()) throw new Error('District name is required.');
      const { error: err } = await supabase.from('districts').insert({
        organization_id: orgId,
        name: name.trim(),
        code: code.trim() || null,
      });
      if (err) throw err;
    },
    onSuccess: () => {
      setName('');
      setCode('');
      qc.invalidateQueries({ queryKey: ['districts'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Districts</h1>
        <p className="text-sm text-muted-foreground">
          District ownership is exclusive: each row belongs to exactly one organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add district</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] items-end">
            <div className="space-y-1.5">
              <Label htmlFor="org">Organization</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger id="org">
                  <SelectValue placeholder="Select org…" />
                </SelectTrigger>
                <SelectContent>
                  {orgs?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.code} — {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code (optional)</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add district'}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All districts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2">Organization</th>
              </tr>
            </thead>
            <tbody>
              {districts?.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{d.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{d.code ?? '—'}</td>
                  <td className="py-2 text-muted-foreground">
                    {orgs?.find((o) => o.id === d.organization_id)?.code ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
