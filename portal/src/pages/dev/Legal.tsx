import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge, Button, Card, ChoiceChips, ErrorBox, Field, Input, Loading, PageHeader, Textarea, useFeedback } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Doc = Tables<'legal_documents'>;
type DocType = 'terms' | 'privacy';
const LABEL: Record<DocType, string> = { terms: 'Terms of Service', privacy: 'Privacy Policy' };

export function Legal() {
  const qc = useQueryClient();
  const { confirm, toast } = useFeedback();
  const [type, setType] = useState<DocType>('terms');
  const q = useQuery({
    queryKey: ['legal'],
    queryFn: async () => unwrap(await supabase.from('legal_documents').select('*').order('version', { ascending: false })) as Doc[],
  });
  const docs = (q.data ?? []).filter((d) => d.doc_type === type);
  const latest = docs[0] ?? null;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const key = `${type}:${latest?.id ?? 'none'}`;
  if (!q.isLoading && loadedFor !== key) {
    setLoadedFor(key);
    setTitle(latest?.title ?? LABEL[type]);
    setBody(latest?.body ?? '');
  }

  function publish() {
    if (!title.trim() || body.trim().length < 20) return toast('Add a title and the full text before publishing', 'bad');
    const version = (latest?.version ?? 0) + 1;
    confirm({
      title: `Publish version ${version}?`,
      message: `Customers will see this ${LABEL[type]} in the app immediately. Earlier versions are kept for the record.`,
      confirmLabel: 'Publish',
      onConfirm: async () => {
        unwrap(await supabase.from('legal_documents').insert({ doc_type: type, version, title: title.trim(), body: body.trim() }).select().single());
        await qc.invalidateQueries({ queryKey: ['legal'] });
        toast(`${LABEL[type]} v${version} published`);
      },
    });
  }

  return (
    <>
      <PageHeader title="Terms & privacy" subtitle="The legal texts shown in the app. Publishing creates a new version; old versions are kept." />
      <div className="mb-5">
        <ChoiceChips<DocType> value={type} onChange={setType} options={[{ value: 'terms', label: 'Terms of Service' }, { value: 'privacy', label: 'Privacy Policy' }]} />
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Card className="space-y-4 p-5">
            {!latest ? (
              <p className="rounded-xl bg-info-soft px-3 py-2 text-sm text-info">
                No custom version yet — the app shows its built-in {LABEL[type]}. Write the full text below to replace it.
              </p>
            ) : null}
            <Field label="Title" htmlFor="l-title" required><Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Text" htmlFor="l-body" required hint="Use a blank line between paragraphs. Lines starting with “## ” become headings.">
              <Textarea id="l-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[420px] text-sm leading-relaxed" />
            </Field>
            <div className="flex justify-end">
              <Button icon="check" onClick={publish} disabled={latest ? title === latest.title && body === latest.body : false}>Publish new version</Button>
            </div>
          </Card>
          <Card className="h-fit p-5">
            <p className="mb-3 text-sm font-semibold">Version history</p>
            {docs.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
              <ul className="space-y-2.5 text-sm">
                {docs.map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>v{d.version} {i === 0 ? <Badge tone="ok">Current</Badge> : null}</span>
                    <span className="text-xs text-muted">{formatDateTime(d.published_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
