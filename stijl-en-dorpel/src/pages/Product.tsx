import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../i18n';
import { useDocumentTitle } from '../ui';
import { useCatalog, CatBody, CatCard, groupLabel } from '../catalog';
import { useTransitionNavigate } from '../fx/Engine';
import NotFound from './NotFound';

/* One page per factory collection, so every product has its own address. */
const Product = () => {
  const t = useT();
  const { id } = useParams();
  const [params] = useSearchParams();
  const start = Math.max(0, Number(params.get('v')) || 0);
  const catalog = useCatalog();
  const go = useTransitionNavigate();
  const item = catalog.find((c) => c.id === id);
  useDocumentTitle(item ? `${item.name} · ${item.brand}` : undefined);

  if (!catalog.length) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!item) return <NotFound />;
  const related = catalog.filter((c) => c.id !== item.id && c.brand === item.brand && c.group === item.group).slice(0, 3);
  const tab = item.cat === 'entree' ? 'buiten' : item.cat;
  // "back" returns to the list exactly as the visitor left it (filters, loaded cards, scroll position)
  let back = '/producten';
  try { const m = JSON.parse(sessionStorage.getItem('sd-shop-v1') ?? 'null'); if (m?.key) { const qs = String(m.key).split('|')[0]; back = `/producten${qs ? `?${qs}` : ''}`; } } catch { /* ignore */ }

  return (
    <div className="pt-28 md:pt-36 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-white/45 mb-8">
          <Link to={back} className="inline-flex items-center gap-2 hover:text-amber-200"><ArrowLeft className="w-4 h-4" /> {t(['Terug naar de lijst', 'Back to the list', 'Wróć do listy'])}</Link>
          <span>/</span>
          <Link to={`/producten?cat=${tab}`} className="hover:text-amber-200">{item.brand} · {t(groupLabel(item.group))}</Link>
          <span>/</span>
          <span className="text-white/80">{item.name}</span>
        </nav>
        <CatBody key={`${item.id}-${start}`} item={item} start={start} page />

        {related.length > 0 && (
          <section className="mt-24 pt-14 border-t border-white/10">
            <h2 className="font-display text-4xl md:text-5xl text-white mb-10">{t(['Uit dezelfde serie', 'From the same range', 'Z tej samej serii'])}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => <CatCard key={r.id} item={r} open={(it) => go(`/product/${it.id}`)} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Product;
