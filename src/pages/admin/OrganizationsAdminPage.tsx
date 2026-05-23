import { useOrganizations } from '@/lib/catalogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Organizations are seeded by migration 110 (4D + RSDA) and intentionally
 * read-only. Adding a new partner needs an explicit, audited decision —
 * not a click in an admin panel.
 */
export function OrganizationsAdminPage() {
  const { data, isLoading, error } = useOrganizations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Implementing partners. Read-only — adding a partner requires a schema-level decision.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>Seeded by migration 110_seed_organizations.sql.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2 pr-4">
                    <Badge variant="secondary">{o.code}</Badge>
                  </td>
                  <td className="py-2 pr-4">{o.name}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
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
