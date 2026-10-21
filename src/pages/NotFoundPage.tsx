// src/pages/NotFoundPage.tsx
import { Compass } from 'lucide-react';
import { Button } from '../components/ui';
import { useNavigate } from '../hooks/useRoute';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">We could not find that page</h1>
      <p className="mt-3 max-w-md text-gray-600">
        The link may be out of date, or the product you were looking for is no longer stocked.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate('home')}>Back to home</Button>
        <Button variant="secondary" onClick={() => navigate('new')}>
          Browse new arrivals
        </Button>
        <Button variant="ghost" onClick={() => navigate('help')}>
          <Compass className="h-4 w-4" /> Get help
        </Button>
      </div>
    </div>
  );
}
