import { supabase } from './supabase';
import { STAGE, type StageKey } from './stages';
import { LIFECYCLE_META, type LifecycleStage } from './lifecycle';
import { serializeStageFinances, type StageFinancesMap } from './stage-finances';
import { errMsg } from './data';
import { toast } from '../components/ui';

export async function changeStage(trackingId: string, name: string, stage: StageKey, note: string | null): Promise<boolean> {
  const { error } = await supabase.from('mgp_tracking').update({ stage, note: note || null }).eq('id', trackingId);
  if (error) {
    toast.err(errMsg(error));
    return false;
  }
  toast.ok(`${name} → ${STAGE[stage].short}`);
  return true;
}

export async function placeEnterprise(enterpriseId: string, name: string, stage: StageKey): Promise<boolean> {
  const { error } = await supabase.from('mgp_tracking').insert({ enterprise_id: enterpriseId, stage });
  if (error) {
    toast.err(errMsg(error));
    return false;
  }
  toast.ok(`${name} placed in ${STAGE[stage].short}`);
  return true;
}

/** Move an enterprise along the M1 → M2 → Graduation lifecycle. */
export async function setLifecycleStage(trackingId: string, name: string, stage: LifecycleStage): Promise<boolean> {
  const { error } = await supabase.from('mgp_tracking').update({ lifecycle_stage: stage }).eq('id', trackingId);
  if (error) {
    toast.err(errMsg(error));
    return false;
  }
  toast.ok(`${name} → ${LIFECYCLE_META[stage].full}`);
  return true;
}

/**
 * Save the per-milestone money for an enterprise. Optionally advances the
 * lifecycle stage in the same write (e.g. auto-graduate when the M2 report is
 * approved) so the row never flickers between two saves.
 */
export async function saveStageFinances(
  trackingId: string,
  name: string,
  finances: StageFinancesMap,
  lifecycleStage?: LifecycleStage,
): Promise<boolean> {
  const patch: { stage_finances: Record<string, unknown>; lifecycle_stage?: LifecycleStage } = {
    stage_finances: serializeStageFinances(finances),
  };
  if (lifecycleStage) patch.lifecycle_stage = lifecycleStage;
  const { error } = await supabase.from('mgp_tracking').update(patch).eq('id', trackingId);
  if (error) {
    toast.err(errMsg(error));
    return false;
  }
  toast.ok(`${name} — finances saved`);
  return true;
}
