import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, Dialog, ErrorBox, Field, Input, Loading, PageHeader, Switch, Textarea, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { timeAgo } from '@/lib/format';
import type { Json } from '@/lib/database.types';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Row = Tables<'app_config'>;

const GROUPS: { prefix: string; title: string; body: string }[] = [
  { prefix: 'features.', title: 'Feature switches', body: 'Turn parts of the customer app on or off instantly.' },
  { prefix: 'content.', title: 'App text', body: 'Wording shown in the customer app.' },
  { prefix: 'app.', title: 'App version & maintenance', body: 'Force updates and pause the customer app. Shown before sign-in too.' },
];

function useSave() {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  return async (key: string, value: Json) => {
    try {
      if (value === null) throw new Error('A setting cannot be empty (null).');
      unwrap(await supabase.from('app_config').update({ value }).eq('key', key).select().single());
      await qc.invalidateQueries({ queryKey: ['app-config'] });
      toast('Saved — open apps update right away');
    } catch (e) {
      toast(errorMessage(e), 'bad');
      throw e;
    }
  };
}

function TextSetting({ row }: { row: Row }) {
  const save = useSave();
  const [v, setV] = useState(String(row.value ?? ''));
  const [busy, setBusy] = useState(false);
  const dirty = v !== String(row.value ?? '');
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input value={v} onChange={(e) => setV(e.target.value)} aria-label={row.key} />
      <Button variant="secondary" disabled={!dirty || !v.trim()} loading={busy} onClick={async () => { setBusy(true); try { await save(row.key, v.trim()); } finally { setBusy(false); } }}>
        Save
      </Button>
    </div>
  );
}

function MaintenanceSetting({ row }: { row: Row }) {
  const save = useSave();
  const cur = (row.value ?? {}) as { enabled?: boolean; message?: string };
  const [msg, setMsg] = useState(cur.message ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{cur.enabled ? 'Maintenance is ON' : 'Maintenance is off'}</p>
          <p className="text-xs text-muted">Customers see a maintenance screen. Agency staff and developers can still sign in.</p>
        </div>
        <Switch checked={!!cur.enabled} label="Maintenance mode" onChange={(on) => void save(row.key, { enabled: on, message: msg })} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Maintenance message" className="min-h-16" />
        <Button variant="secondary" disabled={msg === (cur.message ?? '') || !msg.trim()} loading={busy} onClick={async () => { setBusy(true); try { await save(row.key, { enabled: !!cur.enabled, message: msg.trim() }); } finally { setBusy(false); } }}>
          Save
        </Button>
      </div>
    </div>
  );
}

function CardsSetting({ row }: { row: Row }) {
  const save = useSave();
  const initial = (Array.isArray(row.value) ? row.value : []) as { title: string; body: string }[];
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);
  const valid = items.every((i) => i.title.trim() && i.body.trim());
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="flex gap-2 rounded-xl border border-line p-3">
          <div className="flex-1 space-y-2">
            <Input value={it.title} placeholder="Title" aria-label={`Card ${idx + 1} title`} onChange={(e) => setItems((x) => x.map((y, j) => (j === idx ? { ...y, title: e.target.value } : y)))} />
            <Textarea value={it.body} placeholder="Text" aria-label={`Card ${idx + 1} text`} className="min-h-14" onChange={(e) => setItems((x) => x.map((y, j) => (j === idx ? { ...y, body: e.target.value } : y)))} />
          </div>
          <button type="button" aria-label={`Remove card ${idx + 1}`} className="self-start rounded-lg p-1.5 text-muted hover:bg-bad-soft hover:text-bad" onClick={() => setItems((x) => x.filter((_, j) => j !== idx))}>
            <Icon name="trash" size={17} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" icon="plus" onClick={() => setItems((x) => [...x, { title: '', body: '' }])}>Add card</Button>
        <Button variant="secondary" disabled={!dirty || !valid || items.length === 0} loading={busy} onClick={async () => { setBusy(true); try { await save(row.key, items.map((i) => ({ title: i.title.trim(), body: i.body.trim() }))); } finally { setBusy(false); } }}>
          Save cards
        </Button>
      </div>
    </div>
  );
}

function JsonSetting({ row }: { row: Row }) {
  const save = useSave();
  const [v, setV] = useState(JSON.stringify(row.value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Textarea value={v} onChange={(e) => { setV(e.target.value); setErr(null); }} className="min-h-24 font-mono text-xs" aria-label={row.key} />
      {err ? <p className="text-sm text-bad">{err}</p> : null}
      <div className="flex justify-end">
        <Button variant="secondary" loading={busy} disabled={v === JSON.stringify(row.value, null, 2)} onClick={async () => {
          let parsed: Json;
          try { parsed = JSON.parse(v) as Json; } catch { setErr('That is not valid JSON.'); return; }
          setBusy(true);
          try { await save(row.key, parsed); } finally { setBusy(false); }
        }}>Save</Button>
      </div>
    </div>
  );
}

function SettingEditor({ row }: { row: Row }) {
  const save = useSave();
  if (typeof row.value === 'boolean') {
    return <Switch checked={row.value} label={row.key} onChange={(on) => void save(row.key, on)} />;
  }
  if (row.key === 'app.maintenance') return <MaintenanceSetting row={row} />;
  if (row.key === 'content.why_manemaid') return <CardsSetting row={row} />;
  if (typeof row.value === 'string') return <TextSetting row={row} />;
  return <JsonSetting row={row} />;
}

function AddSetting({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('true');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(key)) {
      setErr('Use a dotted lower-case key, e.g. features.referrals or content.footer_note');
      return;
    }
    let parsed: Json;
    try { parsed = JSON.parse(value) as Json; } catch { setErr('Value must be valid JSON: true, "text", 42, {...} or [...]'); return; }
    if (parsed === null) { setErr('A setting cannot be null.'); return; }
    setBusy(true);
    try {
      unwrap(await supabase.from('app_config').insert({ key, value: parsed, description: description.trim() || null, is_public: isPublic }).select().single());
      await qc.invalidateQueries({ queryKey: ['app-config'] });
      toast('Setting added');
      setKey(''); setValue('true'); setDescription(''); setIsPublic(false); setErr(null);
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add a setting" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void add()} loading={busy}>Add setting</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">New settings need app code that reads them. Use this when a developer has added support for a new key.</p>
        <Field label="Key" htmlFor="k" required><Input id="k" value={key} onChange={(e) => setKey(e.target.value.trim())} placeholder="features.referrals" /></Field>
        <Field label="Value (JSON)" htmlFor="v" required><Textarea id="v" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-16 font-mono text-xs" /></Field>
        <Field label="Description" htmlFor="d"><Input id="d" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <label className="flex items-center justify-between gap-3 text-sm"><span>Readable before sign-in</span><Switch checked={isPublic} onChange={setIsPublic} label="Readable before sign-in" /></label>
        {err ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p> : null}
      </div>
    </Dialog>
  );
}

export function Configuration() {
  const [adding, setAdding] = useState(false);
  const q = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => unwrap(await supabase.from('app_config').select('*').order('key')) as Row[],
  });
  const rows = q.data ?? [];
  const known = GROUPS.map((g) => g.prefix);
  const other = rows.filter((r) => !known.some((p) => r.key.startsWith(p)));

  return (
    <>
      <PageHeader
        title="Configuration"
        subtitle="Live settings the apps read at runtime. Saving updates open apps immediately — no new app release."
        actions={<Button variant="secondary" icon="plus" onClick={() => setAdding(true)}>Add setting</Button>}
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-6">
          {[...GROUPS, ...(other.length ? [{ prefix: '', title: 'Other settings', body: 'Custom keys.' }] : [])].map((g) => {
            const list = g.prefix ? rows.filter((r) => r.key.startsWith(g.prefix)) : other;
            if (!list.length) return null;
            return (
              <Card key={g.title}>
                <div className="border-b border-line px-5 py-4">
                  <h2 className="font-bold">{g.title}</h2>
                  <p className="text-sm text-muted">{g.body}</p>
                </div>
                <ul className="divide-y divide-line">
                  {list.map((r) => (
                    <li key={r.key} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-[13px] font-semibold">{r.key}</code>
                          {r.is_public ? <Badge tone="warn" dot={false}>public</Badge> : null}
                        </div>
                        {r.description ? <p className="mt-1 text-sm text-muted">{r.description}</p> : null}
                        <p className="mt-1 text-xs text-muted">Updated {timeAgo(r.updated_at)}</p>
                      </div>
                      <SettingEditor key={`${r.key}-${r.updated_at}`} row={r} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
      <AddSetting open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
