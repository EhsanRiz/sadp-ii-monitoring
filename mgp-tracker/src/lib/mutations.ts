import { supabase } from './supabase';
import { STAGE, type StageKey } from './stages';
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
