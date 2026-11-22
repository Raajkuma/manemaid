import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { useUnread } from '@/pages/agency/Inbox';
import { ROLE_LABEL } from '@/lib/format';
import { RealtimeSync } from '@/lib/realtime';
import { formatPhone } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { currentTheme, setTheme } from '@/lib/theme';

import { Icon, type IconName } from './icons';
import { Badge, cx } from './ui';

type Item = { to: string; label: string; icon: IconName; badge?: 'unread' };

// Same areas as the app's agency login (Work queue, Support, Staff, Inbox, Account + tools).
const AGENCY: Item[] = [
  { to: '/agency', label: 'Overview', icon: 'grid' },
  { to: '/agency/queue', label: 'Work queue', icon: 'inbox' },
  { to: '/agency/support', label: 'Support', icon: 'chat' },
  { to: '/agency/staff', label: 'Staff', icon: 'users' },
  { to: '/agency/inbox', label: 'Inbox', icon: 'bell', badge: 'unread' },
  { to: '/agency/offers', label: 'Offers', icon: 'tag' },
  { to: '/agency/greetings', label: 'Greetings', icon: 'sparkles' },
  { to: '/agency/templates', label: 'Templates', icon: 'file' },
  { to: '/agency/settings', label: 'Agency settings', icon: 'settings' },
  { to: '/agency/account', label: 'Account', icon: 'home' },
];

const DEVELOPER: Item[] = [
  { to: '/dev/activity', label: 'Activity log', icon: 'activity' },
  { to: '/dev/sign-ins', label: 'Sign-ins', icon: 'login' },
  { to: '/dev/errors', label: 'App errors', icon: 'bug' },
  { to: '/dev/config', label: 'Configuration', icon: 'sliders' },
  { to: '/dev/services', label: 'Services & areas', icon: 'map' },
  { to: '/dev/access', label: 'Staff access', icon: 'shield' },
  { to: '/dev/legal', label: 'Terms & privacy', icon: 'book' },
  { to: '/dev/supabase', label: 'Supabase', icon: 'database' },
];

function NavItem({ item, onNavigate, unread }: { item: Item; onNavigate: () => void; unread: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/agency'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition',
          isActive ? 'bg-accent-soft text-brand-600 dark:text-brand-300' : 'text-ink-soft hover:bg-surface-2',
        )
      }
    >
      <Icon name={item.icon} size={18} />
      <span className="flex-1">{item.label}</span>
      {item.badge === 'unread' && unread > 0 ? (
        <span className="min-w-5 rounded-full bg-bad px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>
      ) : null}
    </NavLink>
  );
}

export function ConsoleLayout() {
  const { profile, role, isDeveloper, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState(currentTheme());
  const loc = useLocation();
  const navigate = useNavigate();
  const unread = useUnread().data ?? 0;

  useEffect(() => setOpen(false), [loc.pathname]);

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <img src="/favicon.svg" alt="" className="size-9" />
        <div>
          <p className="font-display text-[17px] leading-tight font-extrabold">ManeMaid</p>
          <p className="text-xs text-muted">{isDeveloper ? 'Developer console' : 'Agency console'}</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Agency</p>
        {AGENCY.map((i) => (
          <NavItem key={i.to} item={i} unread={unread} onNavigate={() => setOpen(false)} />
        ))}
      </div>
      {isDeveloper ? (
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Developer</p>
          {DEVELOPER.map((i) => (
            <NavItem key={i.to} item={i} unread={unread} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      ) : null}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      <RealtimeSync />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85%] bg-surface shadow-pop">{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-ink-soft hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="flex-1" />
          <button
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-2"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              setTheme(next);
              setThemeState(next);
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight font-semibold">{profile?.full_name || formatPhone(profile?.phone)}</p>
            <p className="text-xs text-muted">{formatPhone(profile?.phone)}</p>
          </div>
          <Badge tone={role === 'developer' ? 'info' : 'brand'}>{ROLE_LABEL[role ?? ''] ?? role}</Badge>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-2"
            onClick={async () => {
              await signOut();
              navigate('/login', { replace: true });
            }}
          >
            <Icon name="logout" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
