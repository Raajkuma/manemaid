import { Link } from 'react-router';

import { Icon, type IconName } from '@/components/icons';
import { useSession } from '@/lib/session';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'tag', title: 'Offers in minutes', body: 'Create, schedule and switch off customer offers yourself. Customers see them the next time they open the app — no app update.' },
  { icon: 'calendar', title: 'Bookings at a glance', body: 'See enquiries, claimed offers and live services in one place.' },
  { icon: 'shield', title: 'Safe by design', body: 'Phone-number sign-in, role-based access, and every change recorded in an activity log.' },
];

export function Landing() {
  const { session, isStaff } = useSession();
  const signedIn = !!session && isStaff;

  return (
    <div className="min-h-full bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-9" />
          <span className="font-display text-lg font-extrabold">ManeMaid</span>
        </div>
        <Link
          to={signedIn ? '/agency' : '/login'}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Icon name={signedIn ? 'grid' : 'login'} size={17} />
          {signedIn ? 'Open console' : 'Staff sign in'}
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:pt-16">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 px-6 py-14 text-white sm:px-12 sm:py-20">
          <div className="absolute -top-24 -right-16 size-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 left-10 size-52 rounded-full bg-white/10" />
          <div className="relative max-w-2xl">
            <p className="text-sm font-semibold tracking-widest text-white/75 uppercase">Agency console</p>
            <h1 className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">Run ManeMaid from your browser.</h1>
            <p className="mt-4 text-lg text-white/85">
              Publish offers, follow bookings and keep the customer app up to date — all without waiting for a developer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={signedIn ? '/agency' : '/login'} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-brand-700 hover:bg-brand-50">
                {signedIn ? 'Open console' : 'Sign in with your phone'}
                <Icon name="chevron" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-accent-soft text-brand-500">
              <Icon name={f.icon} size={21} />
            </div>
            <h2 className="text-lg font-bold">{f.title}</h2>
            <p className="mt-1.5 text-[15px] text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        For ManeMaid agency staff and developers. Customers: please use the ManeMaid mobile app.
      </footer>
    </div>
  );
}
