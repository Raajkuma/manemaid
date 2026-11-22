import { ScrollView, Text } from 'react-native';

import { Pressable3D } from '@/components/ui';
import { DAY_SHORT } from '@/lib/format';
import { addDaysISO } from '@/lib/promotions';
import { colors, fonts, radius, space } from '@/lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Horizontal strip of day chips (no date-picker dependency). Dates are YYYY-MM-DD. */
export function DayStrip({
  value,
  onChange,
  from,
  days = 60,
  label,
}: {
  value: string;
  onChange: (date: string) => void;
  from: string;
  days?: number;
  label: string;
}) {
  const list = Array.from({ length: days }, (_, i) => addDaysISO(from, i));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}
      accessibilityLabel={label}
    >
      {list.map((d) => {
        const date = new Date(`${d}T12:00:00Z`);
        const selected = d === value;
        return (
          <Pressable3D
            key={d}
            onPress={() => onChange(d)}
            accessibilityLabel={`${label}: ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`}
            accessibilityState={{ selected }}
            tilt={8}
            style={{
              width: 58,
              alignItems: 'center',
              paddingVertical: space.sm,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: selected ? colors.primary : colors.line,
              backgroundColor: selected ? colors.primary : colors.surface,
            }}
          >
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: selected ? 'rgba(255,255,255,0.85)' : colors.muted }}>
              {DAY_SHORT[date.getUTCDay()]}
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: selected ? '#fff' : colors.ink }}>{date.getUTCDate()}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: selected ? 'rgba(255,255,255,0.85)' : colors.muted }}>
              {MONTHS[date.getUTCMonth()]}
            </Text>
          </Pressable3D>
        );
      })}
    </ScrollView>
  );
}
