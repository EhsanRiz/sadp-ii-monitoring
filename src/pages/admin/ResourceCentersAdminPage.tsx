import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDistricts, useResourceCenters } from '@/lib/catalogs';
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

export function ResourceCentersAdminPage() {
  const { data: districts } = useDistricts();
  const { data: rcs, isLoading } = useResourceCenters();
  const qc = useQueryClient();

  const [districtId, setDistrictId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!districtId) throw new Error('Pick a district.');
      if (!name.trim()) throw new Error('Name is required.');
      const { error: err } = await supabase
        .from('resource_centers')
        .insert({ district_id: districtId, name: name.trim() });
      if (err) throw err;
    },
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['resource_centers'] });
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
        <h1 className="text-2xl font-semibold tracking-tight">Resource Centers</h1>
        <p className="text-sm text-muted-foreground">
          A single RC can serve enterprises in multiple Community Councils — they&apos;re siblings
          under District, not nested.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add RC</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-1.5">
              <Label htmlFor="dist">District</Label>
              <Select value={districtId} onValueChange={setDistrictId}>
                <SelectTrigger id="dist">
                  <SelectValue placeholder="Select district…" />
                </SelectTrigger>
                <SelectContent>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add'}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All resource centers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2">District</th>
              </tr>
            </thead>
            <tbody>
              {rcs?.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{r.name}</td>
                  <td className="py-2 text-muted-foreground">
                    {districts?.find((d) => d.id === r.district_id)?.name ?? '—'}
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
