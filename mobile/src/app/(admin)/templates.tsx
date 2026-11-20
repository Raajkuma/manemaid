import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { usePopup } from '@/components/popup';
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Icon3D,
  Loading,
  Muted,
  Pressable3D,
  Row,
  Screen,
  Select,
  Sheet,
  Strong,
} from '@/components/ui';
import type { Tables } from '@/lib/database.types';
import { CATEGORY_ICON } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';

type Template = Tables<'scope_templates'>;
const ANY = '__any__';

export default function Templates() {
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [templates, categories] = await Promise.all([
        supabase.from('scope_templates').select('*').order('sort_order').order('created_at'),
        supabase.from('service_categories').select('code, name').order('sort_order'),
      ]);
      return { templates: unwrap(templates), categories: unwrap(categories) };
    },
    { key: 'templates' },
  );

  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>(ANY);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [saving, setSaving] = useState(false);

  const names = Object.fromEntries((q.data?.categories ?? []).map((c) => [c.code, c.name]));

  function openEditor(t: Template | 'new') {
    setEditing(t);
    setTitle(t === 'new' ? '' : t.title);
    setBody(t === 'new' ? '' : t.body);
    setCategory(t === 'new' ? ANY : (t.category_code ?? ANY));
    setErrors({});
  }

  async function save() {
    const e: typeof errors = {};
    if (!title.trim()) e.title = 'Give the template a name';
    if (body.trim().length < 5) e.body = 'Describe the scope of work';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const row = { title: title.trim(), body: body.trim(), category_code: category === ANY ? null : category };
    const res =
      editing === 'new'
        ? await supabase.from('scope_templates').insert({ ...row, sort_order: (q.data?.templates.length ?? 0) + 1 })
        : await supabase.from('scope_templates').update(row).eq('id', (editing as Template).id);
    setSaving(false);
    if (res.error) return popup.error('Could not save template', res.error);
    setEditing(null);
    popup.success({ title: editing === 'new' ? 'Template added' : 'Template updated' });
    void q.reload();
  }

  return (
    <Screen
      edges={[]}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="New template" icon="add" onPress={() => openEditor('new')} />}
    >
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name="document-text" tone="orange" float />
        <Muted style={{ flex: 1, fontSize: 14 }}>
          Templates appear in the Send quotation dropdown. Pick one, then edit the text for each customer if needed.
        </Muted>
      </Row>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !q.data?.templates.length ? (
        <EmptyState icon="document-text" tone="orange" title="No templates yet" body="Create reusable scopes for faster quotations." />
      ) : (
        q.data.templates.map((t, i) => (
          // Edit area and show/hide toggle are sibling buttons (no button inside a button on web).
          <Card key={t.id} index={i} style={!t.active ? { opacity: 0.6 } : undefined}>
            <Row style={{ alignItems: 'flex-start', gap: space.md }}>
              <Pressable3D style={{ flex: 1 }} tilt={4} onPress={() => openEditor(t)} accessibilityLabel={`Edit ${t.title}`}>
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
              <Icon3D name={(t.category_code && CATEGORY_ICON[t.category_code]) || 'document-text'} tone={t.active ? 'primary' : 'neutral'} size={40} />
              <View style={{ flex: 1, gap: 4 }}>
                <Strong style={{ fontSize: 15 }}>{t.title}</Strong>
                <Body style={{ fontSize: 14 }} numberOfLines={3}>
                  {t.body}
                </Body>
                <Row style={{ flexWrap: 'wrap' }}>
                  <Badge label={t.category_code ? (names[t.category_code] ?? t.category_code) : 'Any service'} tone="primary" />
                  {!t.active ? <Badge label="Hidden" tone="neutral" /> : null}
                </Row>
              </View>
              </Row>
              </Pressable3D>
              <Pressable3D
                accessibilityLabel={t.active ? `Hide ${t.title}` : `Show ${t.title}`}
                style={{ padding: 6 }}
                onPress={async () => {
                  const { error } = await supabase.from('scope_templates').update({ active: !t.active }).eq('id', t.id);
                  if (error) popup.error('Could not update', error);
                  void q.reload();
                }}
              >
                <Ionicons name={t.active ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
              </Pressable3D>
            </Row>
          </Card>
        ))
      )}

      <Sheet visible={!!editing} title={editing === 'new' ? 'New template' : 'Edit template'} onClose={() => setEditing(null)}>
        <Field label="Template name" required value={title} onChangeText={setTitle} placeholder="e.g. Weekend cleaning" error={errors.title} />
        <Select
          label="Service"
          value={category}
          onChange={setCategory}
          options={[
            { value: ANY, label: 'Any service', icon: 'apps' },
            ...(q.data?.categories ?? []).map((c) => ({ value: c.code, label: c.name, icon: CATEGORY_ICON[c.code] })),
          ]}
        />
        <Field label="Scope of work" required value={body} onChangeText={setBody} multiline placeholder="What the staff member will do" error={errors.body} />
        <View style={{ gap: space.sm }}>
          <Button label="Save template" icon="checkmark" onPress={save} loading={saving} />
          {editing && editing !== 'new' ? (
            <Button
              label="Delete template"
              icon="trash-outline"
              variant="danger"
              onPress={() => {
                const t = editing;
                setEditing(null);
                setTimeout(() => void popup.confirm({
                  title: `Delete "${t.title}"?`,
                  message: 'Existing quotations are not affected.',
                  icon: 'trash',
                  destructive: true,
                  confirmLabel: 'Delete',
                  onConfirm: async () => {
                    const { error } = await supabase.from('scope_templates').delete().eq('id', t.id);
                    if (error) throw new Error(error.message);
                    await q.reload();
                  },
                  success: { title: 'Template deleted' },
                }), 400);
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}
