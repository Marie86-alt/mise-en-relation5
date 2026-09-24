import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ErrorService from '@/src/services/errorService';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/constants/themes';

interface Props {
  children: ReactNode;
  theme: ThemeColors;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorService.logError(
      'REACT_ERROR',
      error.message,
      errorInfo.componentStack ?? undefined,
      'critical'
    );
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { theme } = this.props;

    if (this.state.hasError) {
      const styles = createStyles(theme);

      return (
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Une erreur est survenue</Text>
            <Text style={styles.errorMessage}>
              L&apos;application n&apos;a pas pu afficher cet écran correctement. Veuillez réessayer.
            </Text>

            <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
              <Text style={styles.resetButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
      padding: 20,
    },
    errorBox: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 8,
      padding: 24,
      alignItems: 'center',
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    errorMessage: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 24,
    },
    resetButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
      minWidth: 140,
      alignItems: 'center',
    },
    resetButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return <ErrorBoundaryClass theme={theme}>{children}</ErrorBoundaryClass>;
}
