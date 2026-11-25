import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { useT, type L } from '../i18n';
import { company } from '../company';
import { useQuote, quoteAsText } from '../quote';
import { confettiBurst } from '../fx/core';
import { Magnetic } from '../fx/components';

export type RequestKind = 'offerte' | 'inmeten' | 'vraag';

const TX = {
  kind: ['Waarmee kunnen we helpen?', 'How can we help?', 'W czym możemy pomóc?'],
  kinds: {
    offerte: ['Offerte', 'Quote', 'Wycena'],
    inmeten: ['Inmeetafspraak', 'Survey visit', 'Wizyta pomiarowa'],
    vraag: ['Vraag', 'Question', 'Pytanie'],
  },
  name: ['Naam', 'Name', 'Imię i nazwisko'],
  email: ['E-mailadres', 'Email address', 'Adres e-mail'],
  phone: ['Telefoonnummer', 'Phone number', 'Numer telefonu'],
  postcode: ['Postcode', 'Postcode', 'Kod pocztowy'],
  city: ['Plaats', 'Town / city', 'Miejscowość'],
  count: ['Aantal deuren (ongeveer)', 'Number of doors (roughly)', 'Liczba drzwi (około)'],
  message: ['Je bericht', 'Your message', 'Wiadomość'],
  messagePh: [
    'Bijvoorbeeld: 6 binnendeuren vervangen, kozijnen blijven zitten. Voorkeur voor een afspraak op vrijdag.',
    'For example: replacing 6 interior doors, frames stay. Preferably an appointment on a Friday.',
    'Na przykład: wymiana 6 drzwi wewnętrznych, futryny zostają. Najlepiej termin w piątek.',
  ],
  listIncluded: ['Je offertelijst wordt meegestuurd', 'Your quote list will be included', 'Twoja lista zostanie dołączona'],
  items: ['posities', 'items', 'pozycji'],
  consent: [
    'Ik ga akkoord met het verwerken van mijn gegevens om deze aanvraag te beantwoorden.',
    'I agree to my details being processed to answer this request.',
    'Zgadzam się na przetwarzanie moich danych w celu odpowiedzi na to zapytanie.',
  ],
  send: ['Verstuur aanvraag', 'Send request', 'Wyślij zapytanie'],
  sending: ['Bezig met versturen…', 'Sending…', 'Wysyłanie…'],
  doneTitle: ['Dank je, we hebben je aanvraag.', 'Thank you — we have your request.', 'Dziękujemy — mamy Twoje zapytanie.'],
  doneText: [
    'We nemen contact met je op om de details door te nemen en een inmeetafspraak te plannen.',
    'We will get in touch to go through the details and plan a survey visit.',
    'Skontaktujemy się, aby omówić szczegóły i umówić pomiar.',
  ],
  mailTitle: ['Je e-mailprogramma is geopend.', 'Your email app has been opened.', 'Otworzyliśmy Twój program pocztowy.'],
  mailText: [
    'Het bericht staat voor je klaar — druk daar op verzenden. Lukt dat niet, mail of bel ons dan rechtstreeks.',
    'The message is ready for you — just press send there. If that does not work, email or call us directly.',
    'Wiadomość jest gotowa — wystarczy kliknąć „wyślij”. Jeśli się nie uda, napisz lub zadzwoń bezpośrednio.',
  ],
  again: ['Nog een aanvraag', 'Send another', 'Kolejne zapytanie'],
} satisfies Record<string, L | Record<string, L>>;

const input =
  'w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-amber-500 focus:bg-zinc-900';
const label = 'block text-[11px] uppercase tracking-[0.3em] text-white/55 mb-2';

export function QuoteForm({ defaultKind = 'offerte', includeList = true, prefill = '' }: { defaultKind?: RequestKind; includeList?: boolean; prefill?: string }) {
  const t = useT();
  const { items, clear } = useQuote();
  const [kind, setKind] = useState<RequestKind>(defaultKind);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'mail'>('idle');
  const withList = includeList && items.length > 0;
  const listText = withList ? quoteAsText(items, t) : '';

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get('bot-field')) return; // honeypot
    setState('sending');
    const fields: Record<string, string> = { 'form-name': 'offerte', soort: kind, offertelijst: listText };
    data.forEach((v, k) => { if (typeof v === 'string') fields[k] = v; });

    let ok = false;
    try {
      // Works out of the box on Netlify (Netlify Forms). Elsewhere it falls back to e-mail below.
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields).toString(),
      });
      const type = res.headers.get('content-type') ?? '';
      ok = res.ok && res.status !== 404 && import.meta.env.PROD && !type.includes('json');
    } catch {
      ok = false;
    }

    if (ok) {
      setState('sent');
      if (withList) clear();
      confettiBurst(window.innerWidth / 2, window.innerHeight / 2, { count: 90 });
      return;
    }
    const body = [
      `${t(TX.kinds[kind])}`,
      '',
      `${t(TX.name)}: ${fields.naam ?? ''}`,
      `${t(TX.email)}: ${fields.email ?? ''}`,
      `${t(TX.phone)}: ${fields.telefoon ?? ''}`,
      `${t(TX.postcode)}: ${fields.postcode ?? ''} ${fields.plaats ?? ''}`,
      fields.aantal ? `${t(TX.count)}: ${fields.aantal}` : '',
      '',
      fields.bericht ?? '',
      listText ? `\n— ${t(TX.listIncluded)} —\n${listText}` : '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    window.location.href = `mailto:${company.email}?subject=${encodeURIComponent(`${t(TX.kinds[kind])} — ${fields.naam ?? ''}`)}&body=${encodeURIComponent(body)}`;
    setState('mail');
  };

  if (state === 'sent' || state === 'mail') {
    const mail = state === 'mail';
    return (
      <div className="bb-glass-card rounded-[2rem] p-10 md:p-14 text-center" role="status">
        {mail ? <Mail className="w-12 h-12 text-amber-300 mx-auto mb-6" /> : <CheckCircle2 className="w-12 h-12 text-amber-300 mx-auto mb-6" />}
        <h3 className="font-display text-3xl md:text-4xl text-white mb-4">{t(mail ? TX.mailTitle : TX.doneTitle)}</h3>
        <p className="text-zinc-400 max-w-md mx-auto mb-8">{t(mail ? TX.mailText : TX.doneText)}</p>
        {mail && (
          <p className="text-amber-200 mb-8">
            <a className="underline underline-offset-4" href={`mailto:${company.email}`}>{company.email}</a> · <a className="underline underline-offset-4" href={company.phoneHref}>{company.phoneDisplay}</a>
          </p>
        )}
        <button onClick={() => setState('idle')} className="px-7 py-3 rounded-full border border-zinc-700 hover:border-amber-500 text-white text-sm font-medium transition-colors">
          {t(TX.again)}
        </button>
      </div>
    );
  }

  return (
    <form name="offerte" onSubmit={onSubmit} className="bb-glass-card rounded-[2rem] p-6 md:p-10 space-y-6">
      <p className="hidden"><label>Niet invullen: <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>

      <fieldset>
        <legend className={label}>{t(TX.kind)}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TX.kinds) as RequestKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${kind === k ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-amber-500/50 hover:text-white'}`}
            >
              {t(TX.kinds[k])}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={label} htmlFor="qf-naam">{t(TX.name)} *</label>
          <input id="qf-naam" name="naam" required autoComplete="name" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="qf-email">{t(TX.email)} *</label>
          <input id="qf-email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="qf-tel">{t(TX.phone)}</label>
          <input id="qf-tel" name="telefoon" type="tel" autoComplete="tel" className={input} />
        </div>
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
          <div>
            <label className={label} htmlFor="qf-pc">{t(TX.postcode)}</label>
            <input id="qf-pc" name="postcode" autoComplete="postal-code" placeholder="1234 AB" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="qf-plaats">{t(TX.city)}</label>
            <input id="qf-plaats" name="plaats" autoComplete="address-level2" className={input} />
          </div>
        </div>
      </div>

      {kind !== 'vraag' && !withList && (
        <div>
          <label className={label} htmlFor="qf-aantal">{t(TX.count)}</label>
          <input id="qf-aantal" name="aantal" type="number" min={1} max={99} inputMode="numeric" className={`${input} max-w-[160px]`} />
        </div>
      )}

      <div>
        <label className={label} htmlFor="qf-bericht">{t(TX.message)}</label>
        <textarea id="qf-bericht" name="bericht" rows={5} defaultValue={prefill} placeholder={t(TX.messagePh)} className={`${input} resize-y`} />
      </div>

      {withList && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <p className="text-amber-200 text-sm font-medium mb-2">{t(TX.listIncluded)} · {items.length} {t(TX.items)}</p>
          <pre className="text-zinc-400 text-xs whitespace-pre-wrap font-sans leading-relaxed">{listText}</pre>
        </div>
      )}

      <label className="flex items-start gap-3 text-sm text-zinc-400 cursor-pointer">
        <input type="checkbox" required className="mt-1 w-4 h-4 accent-amber-500" />
        <span>{t(TX.consent)}</span>
      </label>

      <Magnetic strength={0.25}>
        <button
          type="submit"
          disabled={state === 'sending'}
          className="group inline-flex items-center gap-4 pl-8 pr-2.5 py-2.5 bg-amber-200 text-black font-semibold tracking-wide rounded-full hover:bg-white transition-colors disabled:opacity-60"
        >
          {t(state === 'sending' ? TX.sending : TX.send)}
          <span className="w-11 h-11 rounded-full bg-black text-amber-200 flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-500">
            <ArrowRight className="w-5 h-5" />
          </span>
        </button>
      </Magnetic>
    </form>
  );
}
