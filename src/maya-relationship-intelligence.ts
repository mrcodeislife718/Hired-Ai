export interface RelationshipHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export type ConversationTone = 'direct' | 'casual' | 'formal' | 'detailed' | 'concise' | 'encouraging' | 'neutral';
export type RelationshipMoment = 'win' | 'setback' | 'uncertainty' | 'decision' | 'continuation' | 'neutral';

export interface MayaRelationshipIntelligence {
  tone: ConversationTone[];
  moment: RelationshipMoment;
  activeThreads: string[];
  explicitPreferences: string[];
  concreteMilestones: string[];
  unresolvedCommitments: string[];
  continuityEvidence: string[];
  responseGuidance: string[];
  memoryPolicy: {
    sourceBound: true;
    noInventedMemory: true;
    noSensitiveInference: true;
    userCanCorrect: true;
  };
}

function unique(values: string[], limit = 8) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, limit);
}

function historyFromContext(context: unknown): RelationshipHistoryMessage[] {
  if (!context || typeof context !== 'object') return [];
  const history = (context as { history?: unknown }).history;
  if (!Array.isArray(history)) return [];
  return history.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return [];
    return [{
      role,
      content: content.slice(0, 12_000),
      createdAt: typeof (item as { createdAt?: unknown }).createdAt === 'string' ? (item as { createdAt: string }).createdAt : undefined,
      metadata: (item as { metadata?: unknown }).metadata && typeof (item as { metadata?: unknown }).metadata === 'object'
        ? (item as { metadata: Record<string, unknown> }).metadata
        : undefined
    }];
  }).slice(-40);
}

function detectTone(userMessages: string[], currentMessage: string): ConversationTone[] {
  const corpus = [...userMessages.slice(-8), currentMessage].join('\n').toLowerCase();
  const tones: ConversationTone[] = [];
  if (/\b(direct|straight|just tell me|no fluff|skip the fluff|bottom line)\b/.test(corpus)) tones.push('direct');
  if (/\b(casual|talk to me normally|like a friend|friend|relaxed)\b/.test(corpus)) tones.push('casual');
  if (/\b(formal|professional tone|professionally)\b/.test(corpus)) tones.push('formal');
  if (/\b(detailed|deep dive|thorough|explain fully|walk me through)\b/.test(corpus)) tones.push('detailed');
  if (/\b(concise|brief|short|keep it short)\b/.test(corpus)) tones.push('concise');
  if (/\b(encourage|encouragement|keep me motivated)\b/.test(corpus)) tones.push('encouraging');
  return tones.length ? unique(tones) as ConversationTone[] : ['neutral'];
}

function detectMoment(currentMessage: string): RelationshipMoment {
  const lower = currentMessage.toLowerCase();
  if (/\b(got the job|got an offer|offer came|promoted|promotion|interview went well|made it to|accepted|hired)\b/.test(lower)) return 'win';
  if (/\b(rejected|rejection|didn.?t get|failed|ghosted|laid off|fired|bad interview|went badly)\b/.test(lower)) return 'setback';
  if (/\b(not sure|unsure|confused|worried|nervous|should i|what do you think)\b/.test(lower)) return 'uncertainty';
  if (/\b(choose|decide|accept|decline|counter|apply|quit|leave|stay)\b/.test(lower)) return 'decision';
  if (/\b(continue|next step|pick up|where we left off|now that|what next)\b/.test(lower)) return 'continuation';
  return 'neutral';
}

function activeThreads(history: RelationshipHistoryMessage[], currentMessage: string) {
  const corpus = [...history.slice(-12).map(item => item.content), currentMessage].join('\n').toLowerCase();
  const threads: string[] = [];
  const candidates: Array<[RegExp, string]> = [
    [/\bresume|cv\b/, 'resume'],
    [/\binterview|screening call|phone screen\b/, 'interview'],
    [/\bapplication|apply|submitted\b/, 'application'],
    [/\boffer|negotiat|counteroffer|compensation\b/, 'offer-negotiation'],
    [/\bpromotion|raise|advance|manager|leadership\b/, 'advancement'],
    [/\bcareer change|transition|pivot|switch careers\b/, 'career-transition'],
    [/\bnetwork|referral|recruiter|hiring manager|linkedin\b/, 'relationships'],
    [/\bportfolio|github|work sample\b/, 'proof-portfolio'],
    [/\brejection|rejected|ghosted\b/, 'outcome-learning']
  ];
  for (const [pattern, label] of candidates) if (pattern.test(corpus)) threads.push(label);
  return unique(threads, 6);
}

function explicitPreferences(history: RelationshipHistoryMessage[], currentMessage: string) {
  const userText = [...history.filter(item => item.role === 'user').slice(-20).map(item => item.content), currentMessage];
  const preferences: string[] = [];
  for (const text of userText) {
    const sentences = text.split(/(?<=[.!?])\s+/).map(value => value.trim());
    for (const sentence of sentences) {
      if (/\b(i prefer|i want you to|please (?:be|keep|don.?t|do not)|don.?t .* me|always .* with me|talk to me|keep it|be direct)\b/i.test(sentence)) {
        preferences.push(sentence.slice(0, 260));
      }
    }
  }
  return unique(preferences, 6);
}

function concreteMilestones(history: RelationshipHistoryMessage[]) {
  const milestones: string[] = [];
  for (const item of history.filter(entry => entry.role === 'user')) {
    if (/\b(got an offer|got the job|hired|promoted|promotion|interview scheduled|made it to|accepted the offer|started the job)\b/i.test(item.content)) {
      milestones.push(item.content.slice(0, 260));
    }
  }
  return unique(milestones.slice(-8), 5);
}

function unresolvedCommitments(history: RelationshipHistoryMessage[]) {
  const recent = history.slice(-14);
  const commitments: string[] = [];
  for (const item of recent) {
    if (item.role !== 'assistant') continue;
    const sentences = item.content.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (/\b(next|we should|we need to|after that|then we|remaining|still need|waiting for|once .* then)\b/i.test(sentence)) {
        commitments.push(sentence.trim().slice(0, 260));
      }
    }
  }
  return unique(commitments, 5);
}

function continuityEvidence(history: RelationshipHistoryMessage[]) {
  return history.slice(-6).map(item => `${item.role}: ${item.content.slice(0, 220)}`);
}

export function buildMayaRelationshipIntelligence(input: {
  userMessage: string;
  context?: unknown;
}): MayaRelationshipIntelligence {
  const history = historyFromContext(input.context);
  const userMessages = history.filter(item => item.role === 'user').map(item => item.content);
  const tone = detectTone(userMessages, input.userMessage);
  const moment = detectMoment(input.userMessage);
  const threads = activeThreads(history, input.userMessage);
  const preferences = explicitPreferences(history, input.userMessage);
  const milestones = concreteMilestones(history);
  const commitments = unresolvedCommitments(history);

  const guidance: string[] = [
    'Continue the active work instead of re-onboarding the user.',
    'Reference prior context only when supported by the supplied conversation evidence.',
    'Prefer one or two genuinely useful continuity references over repeated callbacks.',
    'Do not turn relationship context into factual career evidence unless the deterministic engine separately verifies it.'
  ];
  if (moment === 'setback') guidance.push('Acknowledge the setback briefly, avoid generic reassurance, then diagnose the next useful move.');
  if (moment === 'win') guidance.push('Recognize the specific verified win and connect it to the next career decision without over-celebrating.');
  if (moment === 'uncertainty' || moment === 'decision') guidance.push('Be candid about tradeoffs and give a recommendation when the evidence supports one.');
  if (tone.includes('direct')) guidance.push('Lead with the answer and keep framing tight.');
  if (tone.includes('detailed')) guidance.push('Explain the reasoning and consequences, not just the conclusion.');
  if (tone.includes('concise')) guidance.push('Keep the response compact unless a consequential decision requires more detail.');

  return {
    tone,
    moment,
    activeThreads: threads,
    explicitPreferences: preferences,
    concreteMilestones: milestones,
    unresolvedCommitments: commitments,
    continuityEvidence: continuityEvidence(history),
    responseGuidance: unique(guidance, 10),
    memoryPolicy: {
      sourceBound: true,
      noInventedMemory: true,
      noSensitiveInference: true,
      userCanCorrect: true
    }
  };
}
