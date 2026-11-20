// ManeMaid UI kit: depth, motion and type for every screen.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapFeedback } from '@/lib/feedback';
import { colors, fonts, gradients, radius, shadow, space, toneColors, type Tone } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const SPRING = { damping: 14, stiffness: 220, mass: 0.6 } as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Staggered entrance for list items (capped so long lists stay snappy). */
export function enter(index = 0) {
  return FadeInDown.delay(Math.min(index, 6) * 60).springify().damping(18);
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

export function Display({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} style={[t.display, style]}>{children}</Text>;
}
export function Heading({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} accessibilityRole="header" style={[t.heading, style]}>{children}</Text>;
}
export function Strong({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} style={[t.strong, style]}>{children}</Text>;
}
export function Body({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} style={[t.body, style]}>{children}</Text>;
}
export function Muted({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} style={[t.muted, style]}>{children}</Text>;
}

// ---------------------------------------------------------------------------
// Motion primitives
// ---------------------------------------------------------------------------
/** Press with a springy 3D tilt + haptic tap. */
export function Pressable3D({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  tilt = 5,
  accessibilityLabel,
  accessibilityState,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  tilt?: number;
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean; busy?: boolean };
}) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { scale: 1 - p.get() * 0.035 }, { rotateX: `${p.get() * tilt}deg` }],
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPressIn={() => p.set(withSpring(1, SPRING))}
      onPressOut={() => p.set(withSpring(0, SPRING))}
      onPress={
        onPress
          ? () => {
              tapFeedback();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
      style={[style, a]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Gradient-lit, tilted icon tile. Appears instantly (no pop-in); can gently float. */
export function Icon3D({
  name,
  tone = 'primary',
  size = 48,
  float = false,
  gradient,
}: {
  name: IconName;
  tone?: Tone;
  size?: number;
  float?: boolean;
  /** Deprecated: icons no longer animate in on page load. Kept so existing calls still compile. */
  delay?: number;
  gradient?: readonly [string, string, ...string[]];
}) {
  const f = useSharedValue(0);
  useEffect(() => {
    if (!float) return;
    f.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [float, f]);
  const a = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { translateY: -2.5 * f.get() },
      { rotateX: '8deg' },
      { rotateY: `${-5 + 10 * f.get()}deg` },
    ],
  }));
  const colorsFor = gradient ?? gradients[tone];
  const r = size * 0.32;
  return (
    <Animated.View style={[{ width: size, height: size }, a]}>
      <View style={[{ flex: 1, borderRadius: r, backgroundColor: colorsFor[colorsFor.length - 1] }, shadow(2, colorsFor[colorsFor.length - 1])]}>
        <LinearGradient
          colors={colorsFor}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ flex: 1, borderRadius: r, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        >
          <View
            style={{
              position: 'absolute',
              top: -size * 0.3,
              left: -size * 0.15,
              width: size * 0.95,
              height: size * 0.65,
              borderRadius: size,
              backgroundColor: 'rgba(255,255,255,0.28)',
            }}
          />
          <View
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: size * 0.16, backgroundColor: 'rgba(0,0,0,0.12)' }}
          />
          <Ionicons name={name} size={size * 0.5} color="#fff" />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({
  children,
  refreshing,
  onRefresh,
  footer,
  hero,
  edges = ['top'],
  overlapHero = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  hero?: ReactNode;
  edges?: ('top' | 'bottom')[];
  /**
   * Pull the content up over the bottom of the hero so the first white card "floats" on it.
   * Turn off when the content starts with chips, buttons or a field label: those collide
   * with the gradient instead of floating on it.
   */
  overlapHero?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={hero ? [] : edges}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.xxl * 2 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={hero ? '#fff' : colors.primary}
                colors={[colors.primary]}
                progressViewOffset={hero ? 40 : 0}
              />
            ) : undefined
          }
        >
          {hero}
          <View style={[styles.content, hero && overlapHero ? { marginTop: -space.xl } : null]}>{children}</View>
        </ScrollView>
        {footer ? (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Gradient header with floating light orbs. Content below overlaps it for depth. */
export function Hero({
  eyebrow,
  title,
  subtitle,
  right,
  children,
  underHeader,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  /** Leave room for a transparent navigation header (back button) on top. */
  underHeader?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const f = useSharedValue(0);
  useEffect(() => {
    f.set(withRepeat(withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [f]);
  const orb = useAnimatedStyle(() => ({ transform: [{ translateY: 10 * f.get() }, { translateX: -8 * f.get() }] }));
  return (
    <LinearGradient
      colors={gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + (underHeader ? 56 : space.lg) }]}
    >
      <Animated.View style={[styles.orb, { top: -60, right: -40, width: 200, height: 200 }, orb]} />
      <View style={[styles.orb, { bottom: -50, left: -30, width: 140, height: 140, opacity: 0.6 }]} />
      <Animated.View entering={FadeInDown.springify().damping(18)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.heroTitle} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </Animated.View>
      {children ? <View style={{ marginTop: space.lg }}>{children}</View> : null}
    </LinearGradient>
  );
}

export function Title({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={{ marginBottom: space.lg }}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Heading style={{ fontSize: 24 }}>{title}</Heading>
      {subtitle ? <Muted style={{ marginTop: 4, fontSize: 14 }}>{subtitle}</Muted> : null}
    </Animated.View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  index,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Position in a list: enables the staggered entrance. */
  index?: number;
  /** Colored accent edge for cards that need attention. */
  tone?: Tone;
}) {
  const accent = tone ? { borderColor: toneColors[tone].fg, borderWidth: 1.5 } : null;
  const body = onPress ? (
    <Pressable3D onPress={onPress} accessibilityLabel={accessibilityLabel} style={[styles.card, shadow(1), accent, style]}>
      {children}
    </Pressable3D>
  ) : (
    <View style={[styles.card, shadow(1), accent, style]}>{children}</View>
  );
  return <Animated.View entering={index !== undefined ? enter(index) : undefined}>{body}</Animated.View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm }, style]}>{children}</View>;
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? <Text style={styles.kvValue}>{value}</Text> : value}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />;
}

/** A tappable settings-style row with a 3D icon. */
export function MenuRow({
  icon,
  tone = 'primary',
  title,
  subtitle,
  onPress,
  right,
  index,
}: {
  icon: IconName;
  tone?: Tone;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  index?: number;
}) {
  return (
    <Card onPress={onPress} index={index} accessibilityLabel={title} style={{ paddingVertical: space.md }}>
      <Row style={{ gap: space.md }}>
        <Icon3D name={icon} tone={tone} size={40} />
        <View style={{ flex: 1 }}>
          <Strong style={{ fontSize: 15 }}>{title}</Strong>
          {subtitle ? <Muted numberOfLines={2}>{subtitle}</Muted> : null}
        </View>
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
      </Row>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const isDisabled = !!(disabled || loading);
  const solid = variant === 'primary' || variant === 'success';
  const fg = solid ? '#fff' : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.primary : colors.ink;
  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[styles.buttonLabel, { color: fg }, small && { fontSize: 14 }]}>{label}</Text>
    </>
  );
  const height = small ? 40 : 52;
  return (
    <Pressable3D
      onPress={onPress}
      disabled={isDisabled}
      tilt={8}
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      style={[{ opacity: isDisabled ? 0.5 : 1, borderRadius: radius.md }, solid && !isDisabled && shadow(2, variant === 'success' ? colors.green : colors.primary), style]}
    >
      {solid ? (
        <LinearGradient
          colors={variant === 'success' ? gradients.green : gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, { minHeight: height }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            { minHeight: height },
            variant === 'secondary' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
            variant === 'danger' && { backgroundColor: colors.dangerSoft },
            variant === 'ghost' && { paddingHorizontal: space.sm },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable3D>
  );
}

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  icon,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null; required?: boolean; icon?: IconName }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <FieldLabel label={label} required={required} />
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: colors.primary, backgroundColor: '#FCFBFF' },
          !!error && { borderColor: colors.danger },
          input.multiline && { alignItems: 'flex-start' },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.muted} style={{ marginTop: input.multiline ? 12 : 0 }} /> : null}
        <TextInput
          placeholderTextColor="#A6AABD"
          accessibilityLabel={required ? `${label}, required` : label}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, input.multiline && { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 }, style]}
        />
      </View>
      {error ? (
        <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </Animated.View>
      ) : hint ? (
        <Muted style={{ marginTop: 6 }}>{hint}</Muted>
      ) : null}
    </View>
  );
}

export type SelectOption = { value: string; label: string; description?: string; icon?: IconName };

/** Dropdown that opens an animated bottom sheet. */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  required,
  error,
  footer,
}: {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ marginBottom: space.md }}>
      <FieldLabel label={label} required={required} />
      <Pressable3D
        onPress={() => setOpen(true)}
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        tilt={3}
        style={[styles.inputWrap, !!error && { borderColor: colors.danger }]}
      >
        {selected?.icon ? <Ionicons name={selected.icon} size={18} color={colors.primary} /> : null}
        <Text style={[styles.input, { paddingVertical: 14 }, !selected && { color: '#A6AABD' }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable3D>
      {error ? <Text style={[styles.error, { marginTop: 6 }]}>{error}</Text> : null}
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <FlatList
          data={options}
          keyExtractor={(o) => o.value}
          style={{ maxHeight: 420 }}
          renderItem={({ item, index }) => {
            const active = item.value === value;
            return (
              <Animated.View entering={enter(index)}>
                <Pressable3D
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  accessibilityState={{ selected: active }}
                  style={[styles.option, active && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
                >
                  {item.icon ? <Icon3D name={item.icon} size={36} tone={active ? 'primary' : 'neutral'} /> : null}
                  <View style={{ flex: 1 }}>
                    <Strong style={{ fontSize: 15 }}>{item.label}</Strong>
                    {item.description ? <Muted numberOfLines={2}>{item.description}</Muted> : null}
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable3D>
              </Animated.View>
            );
          }}
        />
        {footer}
      </Sheet>
    </View>
  );
}

/** Animated bottom sheet. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grabber} />
            <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
              <Heading style={{ fontSize: 18 }}>{title}</Heading>
              <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={colors.muted} />
              </Pressable>
            </Row>
            {children}
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable3D
      onPress={onPress}
      tilt={10}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipSelected, selected && shadow(1, colors.primary)]}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? '#fff' : colors.muted} /> : null}
      <Text style={[styles.chipLabel, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable3D>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.chipGroup}>{children}</View>;
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : <View style={[styles.badgeDot, { backgroundColor: c.fg }]} />}
      <Text style={[styles.badgeLabel, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, uri, size = 44, ring }: { name: string; uri?: string | null; size?: number; ring?: boolean }) {
  const initials =
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={250} />
  ) : (
    <LinearGradient colors={gradients.primary} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: fonts.heading, fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
  if (!ring) return <View style={shadow(1)}>{inner}</View>;
  return (
    <View style={[{ padding: 3, borderRadius: size, backgroundColor: '#fff' }, shadow(2)]}>{inner}</View>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function Loading() {
  // Static icon while a page loads (no animation).
  return (
    <View style={{ paddingVertical: space.xxl * 1.5, alignItems: 'center', gap: space.md }} accessibilityLabel="Loading">
      <Icon3D name="sparkles" size={52} />
      <Muted>Loading…</Muted>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
      <Icon3D name="cloud-offline" tone="danger" float />
      <Body style={{ textAlign: 'center' }}>{message}</Body>
      {onRetry ? <Button label="Try again" icon="refresh" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function EmptyState({ icon, title, body, action, tone = 'primary' }: { icon: IconName; title: string; body?: string; action?: ReactNode; tone?: Tone }) {
  return (
    <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
      <Icon3D name={icon} tone={tone} size={64} float />
      <Heading style={{ fontSize: 17, marginTop: space.sm }}>{title}</Heading>
      {body ? <Muted style={{ textAlign: 'center', maxWidth: 260 }}>{body}</Muted> : null}
      {action ? <View style={{ marginTop: space.sm, alignSelf: 'stretch' }}>{action}</View> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab bar icon: springs up and fills in when focused.
// ---------------------------------------------------------------------------
export function tabIcon(name: IconName) {
  const filled = name.replace('-outline', '') as IconName;
  function TabIcon({ color, size, focused }: { color: unknown; size: number; focused: boolean }) {
    const f = useSharedValue(focused ? 1 : 0);
    useEffect(() => {
      f.set(withSpring(focused ? 1 : 0, SPRING));
    }, [focused, f]);
    const a = useAnimatedStyle(() => ({
      transform: [{ perspective: 400 }, { translateY: -3 * f.get() }, { scale: 1 + 0.15 * f.get() }, { rotateY: `${(1 - f.get()) * 0}deg` }],
    }));
    return (
      <Animated.View style={a}>
        <Ionicons name={focused ? filled : name} color={String(color)} size={size} />
      </Animated.View>
    );
  }
  return TabIcon;
}

/** Tab bar styling that respects the device's bottom safe area (home bar / 3-button nav). */
export function useTabBarOptions() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: 0,
      // 52px for icon + label: at 44px the label was squeezed and cut off.
      height: 64 + insets.bottom,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, 6),
      ...shadow(3),
    },
  } as const;
}

export const stackOptions = {
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.ink, fontFamily: fonts.heading },
  headerStyle: { backgroundColor: colors.canvas },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.canvas },
  headerBackButtonDisplayMode: 'minimal',
  animation: 'slide_from_right',
} as const;

const t = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink, letterSpacing: -0.2 },
  strong: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
});

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.lg },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.sm,
    ...shadow(3),
  },
  hero: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl + space.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroEyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { fontFamily: fonts.display, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontFamily: fonts.body, fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 21 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  sectionTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.heading, letterSpacing: -0.2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7, gap: space.md },
  kvLabel: { color: colors.muted, fontSize: 14, fontFamily: fonts.body },
  kvValue: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold, flexShrink: 1, textAlign: 'right' },
  button: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonLabel: { fontSize: 16, fontFamily: fonts.bold },
  label: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, fontSize: 16, fontFamily: fonts.body, color: colors.ink, paddingVertical: 12 },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.medium },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipLabel: { color: colors.ink, fontSize: 14, fontFamily: fonts.medium },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: { fontSize: 12, fontFamily: fonts.bold },
  backdrop: { flex: 1, backgroundColor: 'rgba(27,31,59,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingTop: space.sm,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
  },
});
