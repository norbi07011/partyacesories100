import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Minus, Plus, Trash2 } from 'lucide-react';
import { useT, euro, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { PRODUCTS, modelById } from '../data/doors';
import { useQuote, itemPrice, itemTitle, describeDoor } from '../quote';
import { Door, ProductArt } from '../components/Door';
import { QuoteForm } from '../components/QuoteForm';
import { Kicker } from '../components/PageHero';

const TX = {
  title: ['Je offertelijst', 'Your quote list', 'Twoja lista wyceny'],
  sub: [
    'Alles wat je hebt uitgekozen op een rij. Verstuur de lijst en je ontvangt een offerte op maat.',
    'Everything you picked in one place. Send the list and you will receive a tailored quote.',
    'Wszystko, co wybrałeś, w jednym miejscu. Wyślij listę, a otrzymasz indywidualną wycenę.',
  ],
  empty: ['Je lijst is nog leeg', 'Your list is still empty', 'Lista jest jeszcze pusta'],
  emptyText: [
    'Kies een deur uit de collectie of stel er zelf een samen.',
    'Pick a door from the collection or configure your own.',
    'Wybierz drzwi z kolekcji albo skonfiguruj własne.',
  ],
  total: ['Richtprijs totaal', 'Guide price total', 'Cena orientacyjna łącznie'],
  clear: ['Lijst leegmaken', 'Clear list', 'Wyczyść listę'],
  remove: ['Verwijderen', 'Remove', 'Usuń'],
  edit: ['Opnieuw samenstellen', 'Configure again', 'Skonfiguruj ponownie'],
  send: ['Offerte aanvragen', 'Request your quote', 'Poproś o wycenę'],
  noPay: [
    'Je betaalt nu niets. Deuren zijn maatwerk: na het inmeten krijg je een definitieve offerte.',
    'You pay nothing now. Doors are made to measure: after the survey you receive a final quote.',
    'Teraz nic nie płacisz. Drzwi robimy na wymiar: po pomiarze otrzymasz ostateczną wycenę.',
  ],
} satisfies Record<string, L>;

const QuoteList = () => {
  const t = useT();
  useDocumentTitle(t(UI.nav.quote));
  const { items, total, setQty, remove, clear } = useQuote();

  return (
    <div className="pt-28 md:pt-36 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <header className="mb-12">
          <Kicker>{t(UI.nav.quote)}</Kicker>
          <h1 className="font-display text-5xl md:text-7xl text-white leading-[0.95] mb-5">{t(TX.title)}</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">{t(TX.sub)}</p>
        </header>

        {items.length === 0 ? (
          <div className="bb-glass-card rounded-[2rem] p-10 md:p-16 text-center">
            <ClipboardList className="w-12 h-12 text-amber-300/60 mx-auto mb-6" />
            <h2 className="font-display text-4xl text-white mb-3">{t(TX.empty)}</h2>
            <p className="text-zinc-400 mb-8">{t(TX.emptyText)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/deuren" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">{t(UI.viewDoors)} <ArrowRight className="w-5 h-5" /></Link>
              <Link to="/configurator" className="inline-flex items-center justify-center px-7 py-4 rounded-full border border-zinc-700 hover:border-amber-500 text-white font-bold transition-colors">{t(UI.configure)}</Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="border-t border-white/10">
              {items.map((it) => {
                const unit = itemPrice(it);
                const product = it.type === 'product' ? PRODUCTS.find((p) => p.id === it.productId) : undefined;
                return (
                  <li key={it.key} className="grid grid-cols-[72px_1fr] md:grid-cols-[96px_1fr_auto_auto] gap-x-5 gap-y-4 items-center py-6 border-b border-white/10">
                    <div className="h-28 md:h-32 flex items-center justify-center rounded-2xl bg-zinc-900/60 border border-white/10 p-2">
                      {it.type === 'door'
                        ? <Door model={modelById(it.config.model)} finish={it.config.finish} glass={it.config.glass} handle={it.config.handle} hinge={it.config.hinge} className="h-full w-auto max-w-full" />
                        : product && <ProductArt art={product.art} className="h-full w-auto" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl md:text-3xl text-white leading-tight">{itemTitle(it, t)}</h2>
                      {it.type === 'door' && <p className="text-zinc-500 text-sm leading-relaxed mt-1">{describeDoor(it.config, t).join(' · ')}</p>}
                      <div className="flex gap-4 mt-2 text-sm">
                        {it.type === 'door' && <Link to={`/configurator?model=${it.config.model}&finish=${it.config.finish}`} className="text-amber-300/80 hover:text-amber-200 underline underline-offset-4">{t(TX.edit)}</Link>}
                        <button onClick={() => remove(it.key)} className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-red-300 transition-colors"><Trash2 className="w-3.5 h-3.5" /> {t(TX.remove)}</button>
                      </div>
                    </div>
                    <div className="col-start-2 md:col-start-auto inline-flex items-center rounded-full border border-zinc-700 w-max">
                      <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="−" className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-300"><Minus className="w-4 h-4" /></button>
                      <span className="w-7 text-center text-white tabular-nums">{it.qty}</span>
                      <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="+" className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-300"><Plus className="w-4 h-4" /></button>
                    </div>
                    <p className="col-start-2 md:col-start-auto md:text-right text-amber-200 text-xl tabular-nums md:min-w-[110px]">{euro(unit * it.qty)}</p>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-end justify-between gap-6 py-8">
              <button onClick={clear} className="text-zinc-500 hover:text-white text-sm underline underline-offset-4">{t(TX.clear)}</button>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mb-1">{t(TX.total)}</p>
                <p className="font-display text-6xl bb-text-gold leading-none">{euro(total)}</p>
                <p className="text-white/40 text-xs mt-3 max-w-sm ml-auto">{t(UI.indicative)}</p>
              </div>
            </div>

            <section className="mt-10 pt-14 border-t border-white/10">
              <h2 className="font-display text-4xl md:text-5xl text-white mb-3">{t(TX.send)}</h2>
              <p className="text-zinc-400 mb-8 max-w-2xl">{t(TX.noPay)}</p>
              <QuoteForm defaultKind="offerte" />
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default QuoteList;
