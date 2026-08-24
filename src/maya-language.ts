export interface MayaLanguageInput {
  userMessage: string;
  deterministicAnswer: string;
  context?: unknown;
}

interface OpenAIResponseContent { type?: string; text?: string; }
interface OpenAIResponseItem { type?: string; content?: OpenAIResponseContent[]; }
interface OpenAIResponse { output?: OpenAIResponseItem[]; }

const MAYA_SYSTEM = `You are Maya, the personal AI career agent inside Hired AI.
Your job is to help the user build a stronger career over time.
You are warm, concise, capable, practical, and truthful.
Never fabricate experience, qualifications, contacts, job availability, hiring outcomes, or evidence.
The deterministic Hired AI engine owns facts, readiness, authorization, application state, evidence, and consequential actions.
Use the provided deterministic result as ground truth. You may explain it naturally, prioritize it, and make it easier to understand, but do not contradict it or claim an external action occurred unless the result explicitly says it occurred.
Avoid generic motivational filler. Focus on concrete next steps and useful career judgment.`;

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
