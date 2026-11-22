import { Icon, type IconName } from '@/components/icons';
import { Card, PageHeader } from '@/components/ui';
import { DASHBOARD_URL } from '@/lib/supabase';

const LINKS: { icon: IconName; title: string; body: string; path: string }[] = [
  { icon: 'database', title: 'Table editor', body: 'Browse and fix any row directly.', path: '/project/default/editor' },
  { icon: 'file', title: 'SQL editor', body: 'Run queries and one-off fixes.', path: '/project/default/sql/new' },
  { icon: 'users', title: 'Authentication', body: 'Users, phone providers, SMS settings.', path: '/project/default/auth/users' },
  { icon: 'image', title: 'Storage', body: 'Photos and offer images.', path: '/project/default/storage/buckets' },
  { icon: 'activity', title: 'Logs', body: 'API, database and auth logs.', path: '/project/default/logs/explorer' },
];

export function SupabasePage() {
  const base = DASHBOARD_URL?.replace(/\/$/, '') ?? null;
  const hosted = !!base?.includes('supabase.com');
  return (
    <>
      <PageHeader title="Supabase" subtitle="Raw database access lives in the Supabase dashboard, not in this console." />
      <Card className="mb-6 flex gap-4 p-5">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn"><Icon name="lock" size={20} /></div>
        <div className="text-sm text-ink-soft">
          <p className="font-semibold text-ink">Why it isn't built into this page</p>
          <p className="mt-1">
            Full database control needs Supabase's secret (service-role) key. Anything in a web page can be read by whoever opens it,
            so that key must never be in this console. Everything day-to-day — offers, settings, services, areas, staff access,
            legal text — is editable here safely through role-checked functions. For SQL, backups and auth settings, use the dashboard
            with your Supabase login.
          </p>
        </div>
      </Card>
      {base ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((l) => (
            <a key={l.title} href={`${base}${hosted ? l.path.replace('/project/default', '') : l.path}`} target="_blank" rel="noreferrer" className="group">
              <Card className="h-full p-5 transition group-hover:border-brand-300">
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-brand-500"><Icon name={l.icon} size={19} /></div>
                  <Icon name="external" size={16} className="text-muted" />
                </div>
                <p className="font-semibold">{l.title}</p>
                <p className="text-sm text-muted">{l.body}</p>
              </Card>
            </a>
          ))}
        </div>
      ) : (
        <Card className="p-5 text-sm text-muted">Set <code>VITE_SUPABASE_DASHBOARD_URL</code> in <code>.env.local</code> to show dashboard links here.</Card>
      )}
    </>
  );
}
