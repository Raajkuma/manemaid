import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Body, Card, Chip, ChipGroup, Heading, Icon3D, Muted, Row, Screen, type IconName } from '@/components/ui';
import { LEGAL_UPDATED, PRIVACY, TERMS, type LegalSection } from '@/content/legal';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space, type Tone } from '@/lib/theme';

const TONES: Tone[] = ['primary', 'blue', 'orange', 'green', 'primary', 'danger', 'blue', 'orange', 'green'];

/**
 * Text published from the web portal: "## Heading" starts a section, blank lines split
 * paragraphs. Anything before the first heading becomes an "Overview" section.
 */
export function parseLegal(body: string): LegalSection[] {
  const sections: LegalSection[] = [];
  let current: LegalSection | null = null;
  for (const block of body.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = block.trim().split('\n');
    if (!lines[0]) continue;
    if (lines[0].startsWith('## ')) {
      current = { title: lines[0].slice(3).trim(), icon: 'document-text', body: [] };
      sections.push(current);
      const rest = lines.slice(1).join(' ').trim();
      if (rest) current.body.push(rest);
    } else {
      if (!current) {
        current = { title: 'Overview', icon: 'document-text', body: [] };
        sections.push(current);
      }
      current.body.push(lines.join(' ').trim());
    }
  }
  return sections;
}

export default function Legal() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'terms' | 'privacy'>(params.tab === 'privacy' ? 'privacy' : 'terms');
  // Latest version published from the portal (readable before sign-in); built-in text otherwise.
  const q = useLiveQuery(
    async () => {
      const { data, error } = await supabase.from('legal_documents').select('doc_type, version, body, published_at').order('version', { ascending: false });
      if (error) return { terms: null, privacy: null };
      const pick = (t: string) => (data ?? []).find((d) => d.doc_type === t) ?? null;
      return { terms: pick('terms'), privacy: pick('privacy') };
    },
    { key: 'legal' },
  );
  const published = q.data?.[tab] ?? null;
  const parsed = published ? parseLegal(published.body) : [];
  const sections = parsed.length ? parsed : tab === 'terms' ? TERMS : PRIVACY;
  const updated = published && parsed.length ? formatDate(published.published_at) : LEGAL_UPDATED;

  return (
    <Screen edges={[]}>
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name={tab === 'terms' ? 'document-text' : 'shield-checkmark'} tone={tab === 'terms' ? 'primary' : 'green'} size={56} float />
        <View style={{ flex: 1 }}>
          <Heading>{tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Heading>
          <Muted>Last updated {updated}</Muted>
        </View>
      </Row>
      <ChipGroup>
        <Chip label="Terms of Service" icon="document-text-outline" selected={tab === 'terms'} onPress={() => setTab('terms')} />
        <Chip label="Privacy Policy" icon="shield-checkmark-outline" selected={tab === 'privacy'} onPress={() => setTab('privacy')} />
      </ChipGroup>

      <Animated.View key={tab} entering={FadeIn.duration(250)}>
        {sections.map((s, i) => (
          <Card key={`${i}-${s.title}`} index={i}>
            <Row style={{ gap: space.md, marginBottom: space.sm }}>
              <Icon3D name={s.icon as IconName} tone={TONES[i % TONES.length]} size={36} />
              <Text style={{ flex: 1, fontFamily: fonts.heading, fontSize: 16, color: colors.ink }}>
                {i + 1}. {s.title}
              </Text>
            </Row>
            {s.body.map((p, j) => (
              <Body key={j} style={{ fontSize: 14, marginTop: j ? space.sm : 0 }}>
                {p}
              </Body>
            ))}
          </Card>
        ))}
      </Animated.View>
      <Muted style={{ textAlign: 'center', marginTop: space.md }}>
        Questions? Raise a request in Support and choose “Privacy” or “Something else”.
      </Muted>
    </Screen>
  );
}
