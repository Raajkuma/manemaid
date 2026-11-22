import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, Dialog, EmptyState, ErrorBox, Field, Input, Loading, PageHeader, Select, Switch, Textarea, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Template = Tables<'scope_templates'>;

function Editor({ value, categories, onClose }: { value: Template | 'new'; categories: { code: string; name: string }[]; onClose: () => void }) {
  const t = value === 'new' ? null : value;
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [title, setTitle] = useState(t?.title ?? '');
  const [body, setBody] = useState(t?.body ?? '');
  const [category, setCategory] = useState(t?.category_code ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim()) return setErr('Add a title and the scope text.');
    setBusy(true);
    try {
      const row = { title: title.trim(), body: body.trim(), category_code: category || null };
      if (t) unwrap(await supabase.from('scope_templates').update(row).eq('id', t.id).select().single());
      else unwrap(await supabase.from('scope_templates').insert(row).select().single());
      await qc.invalidateQueries();
      toast(t ? 'Template saved' : 'Template added');
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={t ? 'Edit template' : 'New template'} wide footer={
      <>
        {t ? <Button variant="ghost" icon="trash" className="mr-auto text-bad" onClick={() => confirm({
          title: 'Delete this template?', message: 'Quotes already sent are not affected.', confirmLabel: 'Delete', danger: true,
          onConfirm: async () => { unwrap(await supabase.from('scope_templates').delete().eq('id', t.id).select()); await qc.invalidateQueries(); toast('Template deleted'); onClose(); },
        })}>Delete</Button> : null}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={() => void save()}>Save template</Button>
      </>
    }>
      <div className="space-y-4">
        <Field label="Title" htmlFor="t-title" required><Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Daily home cleaning" /></Field>
        <Field label="Service" htmlFor="t-cat" hint="Shown first when quoting this service.">
          <Select id="t-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Any service</option>
            {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Scope of work" htmlFor="t-body" required><Textarea id="t-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-32" /></Field>
        {err ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p> : null}
      </div>
    </Dialog>
  );
}

export function Templates() {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const q = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const [t, c] = await Promise.all([
        supabase.from('scope_templates').select('*').order('sort_order').order('created_at'),
        supabase.from('service_categories').select('code, name').order('sort_order'),
      ]);
      return { templates: unwrap(t) as Template[], categories: unwrap(c) };
    },
  });
  const names = Object.fromEntries((q.data?.categories ?? []).map((c) => [c.code, c.name]));

  return (
    <>
      <PageHeader title="Scope templates" subtitle="Reusable scopes for the Send quotation dropdown (app and console)." actions={<Button icon="plus" onClick={() => setEditing('new')}>New template</Button>} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.templates.length ? (
        <Card><EmptyState icon="file" title="No templates yet" body="Create reusable scopes for faster quotations." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.templates.map((t) => (
            <Card key={t.id} className={`flex gap-3 p-4 ${t.active ? '' : 'opacity-60'}`}>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(t)}>
                <p className="font-semibold hover:text-brand-500">{t.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted">{t.body}</p>
                <div className="mt-2 flex gap-1.5">
                  <Badge tone="brand">{t.category_code ? names[t.category_code] ?? t.category_code : 'Any service'}</Badge>
                  {!t.active ? <Badge tone="neutral">Hidden</Badge> : null}
                </div>
              </button>
              <div className="flex flex-col items-end gap-2">
                <Switch checked={t.active} label={t.active ? `Hide ${t.title}` : `Show ${t.title}`} onChange={async (on) => {
                  const { error } = await supabase.from('scope_templates').update({ active: on }).eq('id', t.id);
                  if (error) toast(error.message, 'bad');
                  await qc.invalidateQueries();
                }} />
                <button type="button" aria-label={`Edit ${t.title}`} onClick={() => setEditing(t)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2"><Icon name="edit" size={16} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && q.data ? <Editor key={editing === 'new' ? 'new' : editing.id} value={editing} categories={q.data.categories} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
