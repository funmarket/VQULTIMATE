import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from '../d01_auth';
import type { VibeGuardian } from '../d07_trails/types';

export interface GuardianRegistration {
  guardianType: 'pro' | 'local';
  city: string;
  bio: string;
  pricingType?: 'hourly' | 'flat';
  rate?: number;
  linkedTrailIds: string[];
  selfie: Blob;
}
type PublicProfile = {id:string;handle:string;display_name:string|null;photo_url:string|null};
type GuardianRow = {profile_id:string;guardian_type:'pro'|'local';city:string;bio:string;pricing_mode:'hourly'|'flat'|null;rate:number|null;currency:string;linked_trail_ids:string[];selfie_captured_at:string};
async function profileMap():Promise<Map<string,PublicProfile>> {
  const {data,error}=await supabase.from('profiles').select('id,handle,display_name,photo_url');
  if(error) throw new Error('Could not resolve Guardian profiles: '+error.message);
  return new Map((data||[]).map((p:PublicProfile)=>[p.id,p]));
}
function toGuardian(row:GuardianRow, profiles:Map<string,PublicProfile>):VibeGuardian {
  const profile=profiles.get(row.profile_id);
  if(!profile) throw new Error('Registered Guardian has no real profile: '+row.profile_id);
  return {
    id:profile.id,name:profile.display_name||profile.handle,handle:'@'+profile.handle.replace(/^@/,''),
    avatarUrl:profile.photo_url||'',avatar_url:profile.photo_url||'',
    selfieCapturedAt:row.selfie_captured_at,type:row.guardian_type,
    city:row.city,bio:row.bio,
    pricingType:row.pricing_mode||undefined,
    hourlyRate:row.pricing_mode==='hourly'?Number(row.rate):undefined,
    flatRate:row.pricing_mode==='flat'?Number(row.rate):undefined,
    currency:row.currency,
    offeredTrailId:row.linked_trail_ids?.[0],
    curated_trail_ids:row.linked_trail_ids||[]
  };
}
export async function fetchVibeGuardians():Promise<VibeGuardian[]> {
  const [{data,error},profiles]=await Promise.all([
    supabase.from('guardian_profiles').select('*').order('selfie_captured_at',{ascending:false}),
    profileMap()
  ]);
  if(error) throw new Error('Could not load real Guardian directory: '+error.message);
  return (data||[]).map(r=>toGuardian(r as GuardianRow,profiles));
}
export async function registerGuardian(input:GuardianRegistration):Promise<VibeGuardian> {
  const profile=await getCurrentUserProfile();
  if(!profile) throw new Error('Sign in to become a Guardian.');
  if(input.guardianType==='pro' && profile.accountType!=='pro') throw new Error('Pro Guardian registration requires an eligible Pro profile.');
  if(input.selfie.type!=='image/jpeg'||!input.selfie.size) throw new Error('A fresh front-camera selfie is required.');
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user) throw new Error('Your authenticated session is unavailable.');
  const path=auth.user.id+'/guardians/'+crypto.randomUUID()+'.jpg';
  const {error:uploadError}=await supabase.storage.from('media').upload(path,input.selfie,{contentType:'image/jpeg',upsert:false});
  if(uploadError) throw new Error('Selfie upload failed: '+uploadError.message);
  const {data,error}=await supabase.rpc('vq_register_guardian',{
    p_profile_id:profile.id,p_guardian_type:input.guardianType,
    p_city:input.city,p_bio:input.bio,
    p_pricing_mode:input.guardianType==='pro'?input.pricingType:null,
    p_rate:input.guardianType==='pro'?input.rate:null,
    p_linked_trail_ids:input.linkedTrailIds,p_selfie_path:path
  });
  if(error||!data) throw new Error('Guardian registration was not saved: '+(error?.message||'No result'));
  return toGuardian(data as GuardianRow,await profileMap());
}
