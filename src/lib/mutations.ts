import { supabase } from './supabase';
import { STAGE, type StageKey } from './stages';
import { LIFECYCLE_META, type LifecycleStage } from './lifecycle';
import { serializeFinances, type EnterpriseFinances } from './stage-finances';
import { deriveAutoStage } from './auto-stage';
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
 * Save the money record (enterprise contract + per-milestone data) for an
 * enterprise. Optionally advances the lifecycle stage and/or sets the board
 * stage (auto-move) in the same write, so the row never flickers between saves.
 */
export async function saveStageFinances(
  trackingId: string,
  name: string,
  finances: EnterpriseFinances,
  opts: { lifecycleStage?: LifecycleStage; stage?: StageKey } = {},
): Promise<boolean> {
  const patch: { stage_finances: Record<string, unknown>; lifecycle_stage?: LifecycleStage; stage?: StageKey } = {
    stage_finances: serializeFinances(finances),
  };
  if (opts.lifecycleStage) patch.lifecycle_stage = opts.lifecycleStage;
  if (opts.stage) patch.stage = opts.stage;
  const { error } = await supabase.from('mgp_tracking').update(patch).eq('id', trackingId);
  if (error) {
    toast.err(errMsg(error));
    return false;
  }
  toast.ok(`${name} — finances saved`);
  return true;
}

/**
 * Re-derive the board stage from the enterprise's current finances + SADP
 * queries and apply it if it changed (the auto-move). Reads fresh so it is
 * race-free after any finance or query mutation. Silent — no toast.
 */
export async function syncAutoStage(trackingId: string): Promise<void> {
  const [{ data: t }, { data: acts }] = await Promise.all([
    supabase.from('mgp_tracking').select('stage, lifecycle_stage, stage_finances').eq('id', trackingId).single(),
    supabase.from('mgp_actions').select('kind, status, sadp_received_date, sadp_sent_back_date').eq('tracking_id', trackingId),
  ]);
  if (!t) return;
  const next = deriveAutoStage(t.stage_finances, t.lifecycle_stage as LifecycleStage, acts ?? []);
  if (next && next !== t.stage) {
    await supabase.from('mgp_tracking').update({ stage: next }).eq('id', trackingId);
  }
}
