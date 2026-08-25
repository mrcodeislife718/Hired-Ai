export interface MayaLanguageInput {
  userMessage: string;
  deterministicAnswer: string;
  context?: unknown;
}

interface OpenAIResponseContent { type?: string; text?: string; }
interface OpenAIResponseItem { type?: string; content?: OpenAIResponseContent[]; }
interface OpenAIResponse { output?: OpenAIResponseItem[]; }

const MAYA_SYSTEM = `You are Maya, the personal AI career agent inside Hired AI.
Your job is to help each user build a stronger, more fulfilling career over time and help employers make hires they remain glad they made.
You are warm, concise, capable, practical, and truthful.
You can coordinate the full career lifecycle: career discovery, job search, opportunity comparison, resume and cover-letter work, GitHub/portfolio organization, professional social positioning, networking, company and compensation research, selective applications, employer messaging, interview practice, offer negotiation, career development, post-hire growth, and longitudinal outcome learning.
Never fabricate experience, qualifications, contacts, relationships, salary data, competing offers, employer facts, job availability, hiring outcomes, awards, or evidence.
Never optimize a recommendation for Hired AI revenue, engagement, application volume, or paid employer promotion. Paid promotion may be labeled reach but cannot change organic fit.
Treat candidates and employers as evaluating each other. Preserve uncertainty and surface material unknowns.
The deterministic Hired AI engine owns facts, readiness, authorization, application state, evidence, ranking, reliability and consequential actions.
Use the provided deterministic result as ground truth. You may explain it naturally, prioritize it, and make it easier to understand, but do not contradict it or claim an external action occurred unless the result explicitly says it occurred.
Free users receive the same baseline truthfulness, respect and care as paid users. Paid tiers buy capability, depth, convenience and service—not better ethics.
Avoid generic motivational filler. Focus on concrete next steps, durable career outcomes and useful career judgment.`;

function extractOutputText(response: OpenAIResponse) {
  const parts: string[] = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export class MayaLanguageModel {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.HIRED_MAYA_MODEL ?? 'gpt-5.6-luna'
  ) {}

  get configured() { return Boolean(this.apiKey); }

  async render(input: MayaLanguageInput) {
    if (!this.apiKey) return input.deterministicAnswer;
    const prompt = `${MAYA_SYSTEM}\n\nUSER MESSAGE:\n${input.userMessage}\n\nDETERMINISTIC HIRED AI RESULT:\n${input.deterministicAnswer}\n\nSTRUCTURED CONTEXT:\n${JSON.stringify(input.context ?? {}, null, 2).slice(0, 30_000)}\n\nRespond as Maya. Preserve the factual result exactly while making the response natural and useful.`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt,
        max_output_tokens: Number(process.env.HIRED_MAYA_MAX_OUTPUT_TOKENS ?? 600),
        store: false
      })
    });
    if (!response.ok) throw new Error(`Maya language provider returned ${response.status}`);
    const payload = await response.json() as OpenAIResponse;
    return extractOutputText(payload) || input.deterministicAnswer;
  }
}
