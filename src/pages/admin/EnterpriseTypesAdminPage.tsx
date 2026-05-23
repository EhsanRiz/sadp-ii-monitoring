import { useEnterpriseTypes } from '@/lib/catalogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  crops: 'default',
  livestock: 'secondary',
  aquaculture: 'outline',
  processing: 'outline',
};

export function EnterpriseTypesAdminPage() {
  const { data, isLoading, error } = useEnterpriseTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enterprise types</h1>
        <p className="text-sm text-muted-foreground">
          Seeded catalog of 17 types in 4 categories. Read-only.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Types</CardTitle>
          <CardDescription>
            Categories drive Phase 2 ESMP template routing (crops, livestock, aquaculture, processing).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 w-16">ID</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2">Category</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="py-2 pr-4 text-muted-foreground">{t.id}</td>
                  <td className="py-2 pr-4 font-medium">{t.name}</td>
                  <td className="py-2 pr-4">
                    <code className="text-xs text-muted-foreground">{t.code}</code>
                  </td>
                  <td className="py-2 capitalize">
                    <Badge variant={CATEGORY_VARIANT[t.category] ?? 'outline'}>{t.category}</Badge>
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
