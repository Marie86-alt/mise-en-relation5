// contexts/ToastContext.tsx
// Notifications non bloquantes (succès, info, erreur) affichées en haut de l'écran.
// Règle d'usage : un toast pour informer, une Alert uniquement quand l'utilisateur doit décider.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  /** Durée d'affichage en ms (par défaut 3 500, erreurs 5 000) */
  duration?: number;
}

interface ToastApi {
  show: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider');
  return ctx;
};

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

interface ActiveToast extends Required<Pick<ToastOptions, 'message' | 'type' | 'duration'>> {
  id: number;
  title?: string;
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const hide = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const show = useCallback((options: ToastOptions) => {
    clearTimer();
    const type = options.type ?? 'info';
    const duration = options.duration ?? (type === 'error' ? 5000 : 3500);
    const next: ActiveToast = {
      id: ++counterRef.current,
      message: options.message,
      title: options.title,
      type,
      duration,
    };
    setToast(next);
    // Lecteurs d'écran : annonce immédiate du contenu
    AccessibilityInfo.announceForAccessibility([options.title, options.message].filter(Boolean).join('. '));
    timerRef.current = setTimeout(() => setToast((t) => (t?.id === next.id ? null : t)), duration);
  }, []);

  useEffect(() => clearTimer, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      hide,
      success: (message, title) => show({ message, title, type: 'success' }),
      error: (message, title) => show({ message, title, type: 'error' }),
      info: (message, title) => show({ message, title, type: 'info' }),
      warning: (message, title) => show({ message, title, type: 'warning' }),
    }),
    [show, hide]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toast={toast} onDismiss={hide} />
    </ToastContext.Provider>
  );
};

function ToastViewport({ toast, onDismiss }: { toast: ActiveToast | null; onDismiss: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState<ActiveToast | null>(null);

  // Entrée : on mémorise le toast à afficher puis on anime ; sortie : on anime puis on démonte.
  useEffect(() => {
    if (toast) {
      setRendered(toast);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (rendered) {
      Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setRendered(null)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  if (!rendered) return null;

  const accent = {
    success: theme.success,
    error: theme.danger,
    info: theme.info,
    warning: theme.warning,
  }[rendered.type];

  return (
    <View pointerEvents="box-none" style={[styles.viewport, { top: insets.top + 8 }]}>
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        }}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={[rendered.title, rendered.message].filter(Boolean).join('. ')}
          accessibilityHint="Appuyez pour fermer"
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: accent, shadowColor: theme.shadow }]}
        >
          <Ionicons name={ICONS[rendered.type]} size={24} color={accent} />
          <View style={styles.textBlock}>
            {rendered.title ? (
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                {rendered.title}
              </Text>
            ) : null}
            <Text style={[styles.message, { color: rendered.title ? theme.textSecondary : theme.text }]} numberOfLines={4}>
              {rendered.message}
            </Text>
          </View>
          <Ionicons name="close" size={18} color={theme.textTertiary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, zIndex: 1000, elevation: 1000 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    minHeight: 56,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  textBlock: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 19 },
});
