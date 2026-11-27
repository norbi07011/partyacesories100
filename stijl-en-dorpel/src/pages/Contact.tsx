import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useT, type L } from '../i18n';
import { useDocumentTitle } from '../ui';
import { company } from '../company';
import { QuoteForm } from '../components/QuoteForm';
import { PageHero, Badge } from '../components/PageHero';
import { Reveal } from '../fx/components';

const TX = {
  badge: ['Contact', 'Contact', 'Kontakt'],
  title: ['Zeg het maar', 'Tell us what you need', 'Napisz, czego potrzebujesz'],
  sub: [
    'Een offerte, een inmeetafspraak of gewoon een vraag over een klemmende deur. We denken graag mee.',
    'A quote, a survey or just a question about a sticking door. We are happy to help.',
    'Wycena, pomiar albo zwykłe pytanie o zacinające się drzwi. Chętnie pomożemy.',
  ],
  call: ['Bellen', 'Call', 'Telefon'],
  mail: ['Mailen', 'Email', 'E-mail'],
  whatsapp: ['WhatsApp', 'WhatsApp', 'WhatsApp'],
  whatsappText: ['Stuur een foto van je deur', 'Send a photo of your door', 'Wyślij zdjęcie drzwi'],
  visit: ['Adres', 'Address', 'Adres'],
  hours: ['Bereikbaar', 'Opening hours', 'Godziny'],
} satisfies Record<string, L>;

const Contact = () => {
  const t = useT();
  useDocumentTitle(t(TX.badge));
  const cards = [
    { icon: Phone, label: t(TX.call), value: company.phoneDisplay, href: company.phoneHref },
    { icon: Mail, label: t(TX.mail), value: company.email, href: `mailto:${company.email}` },
    { icon: MessageCircle, label: t(TX.whatsapp), value: t(TX.whatsappText), href: company.whatsappHref },
    { icon: MapPin, label: t(TX.visit), value: `${company.street}, ${company.postcode} ${company.city}` },
    { icon: Clock, label: t(TX.hours), value: company.hours },
  ];
  return (
    <>
      <PageHero badge={<Badge>{t(TX.badge)}</Badge>} title={t(TX.title)} subtitle={t(TX.sub)} minH="min-h-[56svh]" image="hall" imagePosition="68% 40%" />
      <section className="pb-28">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
          <Reveal stagger={0.08} className="border-t border-white/10">
            {cards.map((c) => {
              const inner = (
                <>
                  <span className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300"><c.icon className="w-5 h-5" /></span>
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.3em] text-white/45 mb-1">{c.label}</span>
                    <span className="block text-white text-lg break-words">{c.value}</span>
                  </span>
                </>
              );
              return c.href ? (
                <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex items-center gap-5 py-6 border-b border-white/10 hover:bg-white/[0.03] transition-colors">{inner}</a>
              ) : (
                <div key={c.label} className="flex items-center gap-5 py-6 border-b border-white/10">{inner}</div>
              );
            })}
          </Reveal>
          <QuoteForm defaultKind="vraag" />
        </div>
      </section>
    </>
  );
};

export default Contact;
