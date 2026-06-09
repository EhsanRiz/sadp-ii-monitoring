/**
 * /admin/geography — Super-admin page for editing Resource Center GPS
 * coordinates. RCs are grouped by district. Each row exposes lat/lng inputs
 * + a "Use my current location" capture button + a per-row Save action.
 *
 * Why a dedicated page (not inline on EnterpriseDetailPage):
 *   - RC coords are catalog data shared across many enterprises; one user
 *     editing them shouldn't be hidden inside an enterprise edit screen.
 *   - Bulk visibility — see all RCs and which ones still lack coordinates.
 *   - Permission scope — restricted to super_admin via the App.tsx route
 *     guard.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDistricts, useResourceCenters } from '@/lib/catalogs';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crosshair, Save, MapPin } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';
import type { ResourceCenterRow } from '@/types/database';

interface RowDraft {
  gps_lat: string;
  gps_lng: string;
}

/** Build the initial editable draft for a given RC row. */
function initialDraft(rc: ResourceCenterRow): RowDraft {
  return {
    gps_lat: rc.gps_lat != null ? String(rc.gps_lat) : '',
    gps_lng: rc.gps_lng != null ? String(rc.gps_lng) : '',
  };
}

export function AdminGeographyPage() {
  const { data: districts } = useDistricts();
  const { data: rcs, isLoading } = useResourceCenters();
  const qc = useQueryClient();

  // Per-row draft state, keyed by RC id. Initialised lazily as RCs arrive,
  // so the user can type a new value and we know what to PATCH on Save.
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  // Hydrate drafts whenever the RC list changes (fresh fetch or after a save).
  useEffect(() => {
    if (!rcs) return;
    setDrafts((prev) => {
      const next: Record<string, RowDraft> = { ...prev };
      for (const r of rcs) {
        if (!(r.id in next)) next[r.id] = initialDraft(r);
      }
      return next;
    });
  }, [rcs]);

  /** Group RCs by district id so we can render one section per district. */
  const grouped = useMemo(() => {
    const out = new Map<string, ResourceCenterRow[]>();
    for (const r of rcs ?? []) {
      const arr = out.get(r.district_id) ?? [];
      arr.push(r);
      out.set(r.district_id, arr);
    }
    return out;
  }, [rcs]);

  const saveOne = useMutation({
    mutationFn: async ({ id, gps_lat, gps_lng }: { id: string; gps_lat: number | null; gps_lng: number | null }) => {
      const { error } = await supabase
        .from('resource_centers')
        .update({
          gps_lat,
          gps_lng,
          gps_captured_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource_centers'] });
    },
  });

  function setDraft(id: string, patch: Partial<RowDraft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function captureForRow(id: string) {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported on this device');
      return;
    }
    const tid = toast.loading('Reading your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(tid);
        setDraft(id, {
          gps_lat: pos.coords.latitude.toFixed(6),
          gps_lng: pos.coords.longitude.toFixed(6),
        });
        toast.success(`Captured ±${Math.round(pos.coords.accuracy)} m — click Save to persist`);
      },
      (err) => {
        toast.dismiss(tid);
        toast.error('Could not read location', { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function onSave(rc: ResourceCenterRow) {
    const d = drafts[rc.id];
    if (!d) return;
    const latStr = d.gps_lat.trim();
    const lngStr = d.gps_lng.trim();
    if ((latStr === '') !== (lngStr === '')) {
      toast.error('Enter both lat and lng, or leave both empty');
      return;
    }
    const lat = latStr === '' ? null : Number(latStr);
    const lng = lngStr === '' ? null : Number(lngStr);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }
    saveOne.mutate(
      { id: rc.id, gps_lat: lat, gps_lng: lng },
      {
        onSuccess: () => toast.success(`Saved coords for ${rc.name}`),
        onError: (e: Error) => toast.error('Save failed', { description: e.message }),
      },
    );
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const totalRcs = rcs?.length ?? 0;
  const withCoords = rcs?.filter((r) => r.gps_lat != null && r.gps_lng != null).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Geography — Resource Center coordinates
        </h1>
        <p className="text-sm text-muted-foreground">
          Set WGS84 lat/lng for each Resource Center. These coordinates are read by the
          enterprise Details page so the team can see where their RC sits relative to the
          enterprise. Use a phone on-site for best accuracy — the "Use my current location"
          button reads the device's GPS to six decimal places.
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Badge variant="secondary">
            {withCoords} / {totalRcs} RCs have coordinates
          </Badge>
        </div>
      </div>

      {(districts ?? []).map((d) => {
        const rows = grouped.get(d.id) ?? [];
        if (rows.length === 0) return null;
        return (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle className="text-base">{d.name}</CardTitle>
              <CardDescription>{rows.length} Resource Center{rows.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y">
                {rows.map((rc) => {
                  const draft = drafts[rc.id] ?? initialDraft(rc);
                  const dirty =
                    draft.gps_lat !== (rc.gps_lat != null ? String(rc.gps_lat) : '') ||
                    draft.gps_lng !== (rc.gps_lng != null ? String(rc.gps_lng) : '');
                  return (
                    <li key={rc.id} className="py-3 grid gap-3 md:grid-cols-[1fr_140px_140px_auto_auto] md:items-end">
                      <div>
                        <div className="text-sm font-medium">{rc.name}</div>
                        {rc.gps_captured_at && (
                          <div className="text-[11px] text-muted-foreground">
                            Last set: {formatDateDMY(rc.gps_captured_at)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`lat-${rc.id}`} className="text-[11px]">Lat (°)</Label>
                        <Input
                          id={`lat-${rc.id}`}
                          type="number"
                          step="0.000001"
                          inputMode="decimal"
                          placeholder="-29.310245"
                          value={draft.gps_lat}
                          onChange={(e) => setDraft(rc.id, { gps_lat: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`lng-${rc.id}`} className="text-[11px]">Lng (°)</Label>
                        <Input
                          id={`lng-${rc.id}`}
                          type="number"
                          step="0.000001"
                          inputMode="decimal"
                          placeholder="27.482167"
                          value={draft.gps_lng}
                          onChange={(e) => setDraft(rc.id, { gps_lng: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => captureForRow(rc.id)}
                        title="Use my current location"
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!dirty || saveOne.isPending}
                        onClick={() => onSave(rc)}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
