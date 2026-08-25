export type DeliveryState = 'prepared' | 'approved' | 'dispatched' | 'provider-acknowledged' | 'verified-received' | 'failed' | 'unknown';

export interface DeliveryEvent {
  id: string;
  actionId: string;
  state: DeliveryState;
  at: string;
  provider?: string;
  providerMessageId?: string;
  detail?: string;
}

const allowed: Record<DeliveryState, DeliveryState[]> = {
  prepared:['approved','failed'],
  approved:['dispatched','failed'],
  dispatched:['provider-acknowledged','failed','unknown'],
  'provider-acknowledged':['verified-received','failed','unknown'],
  'verified-received':[],
  failed:[],
  unknown:['provider-acknowledged','verified-received','failed']
};

export class DeliveryLedger {
  private readonly events = new Map<string, DeliveryEvent[]>();

  record(event: DeliveryEvent) {
    if (!event.id || !event.actionId) throw new Error('delivery event id and actionId required');
    if (!event.at || Number.isNaN(Date.parse(event.at))) throw new Error('valid delivery event timestamp required');
    const history = this.events.get(event.actionId) ?? [];
    if (history.some(existing => existing.id === event.id)) throw new Error('duplicate delivery event');
    const current = history.at(-1)?.state;
    if (current && !allowed[current].includes(event.state)) throw new Error(`invalid delivery transition ${current} -> ${event.state}`);
    if (!current && event.state !== 'prepared') throw new Error('delivery lifecycle must begin at prepared');
    if (['provider-acknowledged','verified-received'].includes(event.state) && !event.providerMessageId) throw new Error(`${event.state} requires providerMessageId`);
    history.push(structuredClone(event));
    this.events.set(event.actionId, history);
    return structuredClone(event);
  }

  history(actionId: string) { return (this.events.get(actionId) ?? []).map(event => structuredClone(event)); }
  state(actionId: string) { return this.events.get(actionId)?.at(-1)?.state; }
  isConfirmed(actionId: string) { return this.state(actionId) === 'verified-received'; }
  all() { return [...this.events.values()].flatMap(events => events.map(event => structuredClone(event))); }
}
