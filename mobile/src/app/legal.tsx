import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Body, Card, Chip, ChipGroup, Heading, Icon3D, Muted, Row, Screen, type IconName } from '@/components/ui';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '@/content/legal';
import { colors, fonts, space, type Tone } from '@/lib/theme';

const TONES: Tone[] = ['primary', 'blue', 'orange', 'green', 'primary', 'danger', 'blue', 'orange', 'green'];

export default function Legal() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'terms' | 'privacy'>(params.tab === 'privacy' ? 'privacy' : 'terms');
  const sections = tab === 'terms' ? TERMS : PRIVACY;

  return (
    <Screen width="form" edges={[]}>
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name={tab === 'terms' ? 'document-text' : 'shield-checkmark'} tone={tab === 'terms' ? 'primary' : 'green'} size={56} float />
        <View style={{ flex: 1 }}>
          <Heading>{tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Heading>
          <Muted>Last updated {LEGAL_UPDATED}</Muted>
        </View>
      </Row>
      <ChipGroup>
        <Chip label="Terms of Service" icon="document-text-outline" selected={tab === 'terms'} onPress={() => setTab('terms')} />
        <Chip label="Privacy Policy" icon="shield-checkmark-outline" selected={tab === 'privacy'} onPress={() => setTab('privacy')} />
      </ChipGroup>

      <Animated.View key={tab} entering={FadeIn.duration(250)}>
        {sections.map((s, i) => (
          <Card key={s.title} index={i}>
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
