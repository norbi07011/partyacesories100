import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '../i18n';
import { useDocumentTitle } from '../ui';
import { modelById } from '../data/doors';
import { Door } from '../components/Door';

const NotFound = () => {
  const t = useT();
  useDocumentTitle('404');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
      <Door model={modelById('linde')} wire className="h-56 w-auto mb-10 opacity-80" />
      <p className="text-amber-300 text-xs font-bold uppercase tracking-[0.4em] mb-4">404</p>
      <h1 className="font-display text-5xl md:text-7xl text-white mb-5">{t(['Achter deze deur zit niets', 'Nothing behind this door', 'Za tymi drzwiami nic nie ma'])}</h1>
      <p className="text-zinc-400 text-lg mb-10 max-w-md">{t(['De pagina die je zoekt bestaat niet of is verhuisd.', 'The page you are looking for does not exist or has moved.', 'Strona, której szukasz, nie istnieje lub została przeniesiona.'])}</p>
      <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
        {t(['Terug naar home', 'Back to home', 'Wróć na stronę główną'])} <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
};

export default NotFound;
