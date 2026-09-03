export type SupportMode = 'steady'|'cheerleader'|'calibration'|'celebration';

export interface SupportContext {
  message: string;
  verifiedWins?: string[];
  recentSetbacks?: number;
  highStakesEventSoon?: boolean;
}

export interface SupportPlan {
  mode: SupportMode;
  moves: string[];
  guardrails: string[];
}

export function chooseSupportMode(context: SupportContext): SupportPlan {
  const text=context.message.toLowerCase();
  const discouraged=/i can't|i cannot|give up|not good enough|hopeless|never going to|i'm scared|im scared|terrified/.test(text);
  const inflated=/guaranteed|can't lose|cannot lose|definitely getting|i'm perfect|im perfect/.test(text);
  const win=/i got the job|i got hired|offer came|passed the interview|got promoted|got the promotion/.test(text);
  let mode: SupportMode='steady';
  if(win) mode='celebration'; else if(inflated) mode='calibration'; else if(discouraged || (context.recentSetbacks??0)>=2 || context.highStakesEventSoon) mode='cheerleader';
  const moves=mode==='cheerleader'
    ? ['be visibly in the user’s corner','remind them of concrete verified strengths','make the next challenge feel manageable','use stronger encouragement than normal while staying truthful','offer rehearsal or one winnable next action']
    : mode==='celebration'
      ? ['celebrate the concrete result specifically','connect the win to the user’s larger career direction','preserve the evidence as a milestone','help convert the win into the next advantage']
      : mode==='calibration'
        ? ['keep the user’s energy','separate confidence from certainty','name the strongest evidence','surface any material unknowns before consequential action']
        : ['be warm and practical','keep momentum','prefer specific useful next moves over generic motivation'];
  if(context.verifiedWins?.length) moves.push(`ground support in: ${context.verifiedWins.slice(0,4).join('; ')}`);
  return {mode,moves,guardrails:['never invent proof to make the user feel better','never promise a job, interview, income, promotion, or client','never use fear, loneliness, or insecurity to drive paid conversion','support must strengthen agency rather than dependence on Maya']};
}
