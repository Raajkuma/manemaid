// App-wide animated pop-ups: confirmations (with optional reason), success and error.
// Every submit / accept / reject / cancel in the app goes through here.
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ZoomInRotate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { errorMessage } from '@/lib/format';
import { errorFeedback, successFeedback, warningFeedback } from '@/lib/feedback';
import { colors, fonts, radius, shadow, space, type Tone } from '@/lib/theme';

import { Button, Field, Icon3D, Muted, Row, type IconName } from './ui';

type ConfirmOptions = {
  title: string;
  message?: string;
  icon?: IconName;
  tone?: Tone;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Ask for a reason / note. 'required' blocks confirm until text is entered. */
  reason?: 'required' | 'optional';
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Runs while the pop-up shows a spinner. Throw to show the error inline and keep it open. */
  onConfirm?: (text: string) => Promise<unknown> | unknown;
  /** Shown as an animated success state after onConfirm succeeds. */
  success?: { title: string; message?: string };
};

type MessageOptions = { title: string; message?: string; icon?: IconName };

type PopupApi = {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  success: (o: MessageOptions) => void;
  error: (title: string, e?: unknown) => void;
  info: (o: MessageOptions & { tone?: Tone }) => void;
};

type State =
  | { id: number; kind: 'confirm'; o: ConfirmOptions; resolve: (ok: boolean) => void }
  | { id: number; kind: 'success' | 'error' | 'info'; o: MessageOptions & { tone?: Tone } }
  | null;

const PopupContext = createContext<PopupApi | null>(null);

export function usePopup(): PopupApi {
  const v = use(PopupContext);
  if (!v) throw new Error('usePopup must be used inside <PopupProvider>');
  return v;
}

export function PopupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const seq = useRef(0);
  const next = () => ++seq.current;

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        if (o.destructive) warningFeedback();
        setState({ id: next(), kind: 'confirm', o, resolve });
      }),
    [],
  );
  const success = useCallback((o: MessageOptions) => {
    successFeedback();
    setState({ id: next(), kind: 'success', o });
  }, []);
  const error = useCallback((title: string, e?: unknown) => {
    errorFeedback();
    setState({ id: next(), kind: 'error', o: { title, message: e === undefined ? undefined : errorMessage(e) } });
  }, []);
  const info = useCallback((o: MessageOptions & { tone?: Tone }) => setState({ id: next(), kind: 'info', o }), []);

  const api: PopupApi = { confirm, success, error, info };

  return (
    <PopupContext value={api}>
      {children}
      {state ? <PopupCard key={state.id} state={state} close={() => setState(null)} /> : null}
    </PopupContext>
  );
}

function PopupCard({ state, close }: { state: NonNullable<State>; close: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string; message?: string } | null>(null);
  const settled = useRef(false);

  // 3D flip-in of the card.
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withSpring(1, { damping: 13, stiffness: 160, mass: 0.7 }));
  }, [p]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.get(), [0, 0.4, 1], [0, 1, 1]),
    transform: [
      { perspective: 900 },
      { rotateX: `${interpolate(p.get(), [0, 1], [-38, 0])}deg` },
      { scale: interpolate(p.get(), [0, 1], [0.85, 1]) },
      { translateY: interpolate(p.get(), [0, 1], [40, 0]) },
    ],
  }));

  const finish = (ok: boolean) => {
    if (state.kind === 'confirm' && !settled.current) {
      settled.current = true;
      state.resolve(ok);
    }
    close();
  };

  // Success screens close themselves.
  const showingSuccess = state.kind === 'success' || !!done;
  useEffect(() => {
    if (!showingSuccess) return;
    const id = setTimeout(() => finish(true), 2200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingSuccess]);

  async function onConfirm() {
    if (state.kind !== 'confirm' || busy) return;
    const o = state.o;
    if (o.reason === 'required' && !text.trim()) {
      setInlineError('Please add a short reason.');
      errorFeedback();
      return;
    }
    setBusy(true);
    setInlineError(null);
    try {
      await o.onConfirm?.(text.trim());
      if (o.success) {
        successFeedback();
        setDone(o.success);
      } else {
        finish(true);
      }
    } catch (e) {
      errorFeedback();
      setInlineError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Back button / tap outside. After a successful action this still counts as "done".
  const dismiss = () => {
    if (busy) return;
    finish(showingSuccess || state.kind !== 'confirm');
  };

  let body: ReactNode;
  if (showingSuccess) {
    const msg = done ?? state.o;
    body = <SuccessBody title={msg.title} message={msg.message} onDone={() => finish(true)} />;
  } else if (state.kind === 'confirm') {
    const o = state.o;
    const tone: Tone = o.tone ?? (o.destructive ? 'danger' : 'primary');
    body = (
      <>
        <View style={s.iconWrap}>
          <Icon3D name={o.icon ?? (o.destructive ? 'alert' : 'help')} tone={tone} size={68} float />
        </View>
        <Text style={s.title}>{o.title}</Text>
        {o.message ? <Muted style={s.message}>{o.message}</Muted> : null}
        {o.reason ? (
          <View style={{ alignSelf: 'stretch', marginTop: space.md }}>
            <Field
              label={o.reasonLabel ?? (o.reason === 'required' ? 'Reason' : 'Note (optional)')}
              required={o.reason === 'required'}
              value={text}
              onChangeText={(v) => {
                setText(v);
                if (inlineError) setInlineError(null);
              }}
              placeholder={o.reasonPlaceholder}
              multiline
              autoFocus
            />
          </View>
        ) : null}
        {inlineError ? (
          <Animated.View entering={FadeIn} style={s.inlineError}>
            <Text style={s.inlineErrorText}>{inlineError}</Text>
          </Animated.View>
        ) : null}
        <Row style={{ alignSelf: 'stretch', marginTop: space.md }}>
          <Button label={o.cancelLabel ?? 'Not now'} variant="secondary" disabled={busy} onPress={() => finish(false)} style={{ flex: 1 }} />
          <Button
            label={o.confirmLabel ?? 'Confirm'}
            variant={o.destructive ? 'danger' : 'primary'}
            loading={busy}
            onPress={onConfirm}
            style={{ flex: 1.3 }}
          />
        </Row>
      </>
    );
  } else {
    const o = state.o;
    const isError = state.kind === 'error';
    body = (
      <>
        <View style={s.iconWrap}>
          <Icon3D name={o.icon ?? (isError ? 'close' : 'information')} tone={isError ? 'danger' : (o.tone ?? 'primary')} size={68} float />
        </View>
        <Text style={s.title}>{o.title}</Text>
        {o.message ? <Muted style={s.message}>{o.message}</Muted> : null}
        <Button label="OK" variant={isError ? 'secondary' : 'primary'} onPress={() => finish(true)} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
      </>
    );
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
    <Animated.View entering={FadeIn.duration(160)} style={s.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Dismiss" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.center} pointerEvents="box-none">
        <Animated.View style={[s.card, shadow(3), cardStyle]} accessibilityViewIsModal>
          {body}
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
    </Modal>
  );
}

function SuccessBody({ title, message, onDone }: { title: string; message?: string; onDone: () => void }) {
  // Expanding rings behind a spinning-in check.
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.set(withDelay(150, withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }), 2)));
  }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.get(), [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(ring.get(), [0, 1], [0.8, 1.9]) }],
  }));
  return (
    <>
      <View style={[s.iconWrap, { height: 110, justifyContent: 'center' }]}>
        <Animated.View style={[s.ring, ringStyle]} />
        <Animated.View entering={ZoomInRotate.springify().damping(10)}>
          <Icon3D name="checkmark" tone="green" size={80} />
        </Animated.View>
      </View>
      <Text style={s.title}>{title}</Text>
      {message ? <Muted style={s.message}>{message}</Muted> : null}
      <Button label="Done" variant="success" onPress={onDone} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
    </>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(27,31,59,0.55)' },
  center: { flex: 1, justifyContent: 'center', padding: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    // Phones: full width. Desktop browser: a dialog, not a page-wide banner.
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  iconWrap: { alignItems: 'center', marginBottom: space.md, marginTop: -space.sm },
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: colors.green },
  title: { fontFamily: fonts.heading, fontSize: 21, color: colors.ink, textAlign: 'center', letterSpacing: -0.2 },
  message: { textAlign: 'center', marginTop: 6, fontSize: 14 },
  inlineError: { alignSelf: 'stretch', backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: space.md, marginTop: space.sm },
  inlineErrorText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 14 },
});
