import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import ErrorService from '@/src/services/errorService';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/constants/themes';

interface Props {
    children: ReactNode;
    theme: ThemeColors;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

class ErrorBoundaryClass extends React.Component<Props, State> {
    constructor(props: Props) {
          super(props);
          this.state = { hasError: false, errorMessage: '' };
    }

  static getDerivedStateFromError(error: Error): State {
        return {
                hasError: true,
                errorMessage: error.message,
        };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        ErrorService.logError(
                'REACT_ERROR',
                error.message,
                errorInfo.componentStack,
                'critical'
              );
  }

  handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
        const { theme } = this.props;

        if (this.state.hasError) {
                const dynamicStyles = StyleSheet.create({
                    container: {
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: theme.background,
                          padding: 20,
                    },
                    errorBox: {
                          backgroundColor: '#fff5f5',
                          borderColor: '#feb2b2',
                          borderWidth: 2,
                          borderRadius: 12,
                          padding: 24,
                          alignItems: 'center',
                    },
                    errorIcon: {
                          fontSize: 48,
                          marginBottom: 16,
                    },
                    errorTitle: {
                          fontSize: 20,
                          fontWeight: 'bold',
                          color: '#742a2a',
                          marginBottom: 12,
                          textAlign: 'center',
                    },
                    errorMessage: {
                          fontSize: 16,
                          color: '#975a5a',
                          marginBottom: 24,
                          textAlign: 'center',
                          lineHeight: 24,
                    },
                    resetButton: {
                          backgroundColor: theme.primary,
                          paddingVertical: 12,
                          paddingHorizontal: 32,
                          borderRadius: 8,
                          marginBottom: 16,
                    },
                    resetButtonText: {
                          color: '#ffffff',
                          fontSize: 16,
                          fontWeight: '600',
                    },
                    devMessage: {
                          fontSize: 11,
                          color: theme.textSecondary,
                          fontStyle: 'italic',
                          marginTop: 12,
                    },
                });

                return (
                          <View style={dynamicStyles.container}>
                                      <View style={dynamicStyles.errorBox}>
                                                    <Text style={dynamicStyles.errorIcon}>⚠️</Text>
                                                    <Text style={dynamicStyles.errorTitle}>Une erreur est survenue</Text>
                                                    <Text style={dynamicStyles.errorMessage}>{this.state.errorMessage}</Text>

                                                    <TouchableOpacity style={dynamicStyles.resetButton} onPress={this.handleReset}>
                                                                    <Text style={dynamicStyles.resetButtonText}>Réessayer</Text>
                                                    </TouchableOpacity>

                                        {__DEV__ && (
                                          <Text style={dynamicStyles.devMessage}>
                                                            (En développement: {this.state.errorMessage})
                                          </Text>
                                        )}
                                      </View>
                          </View>
                        );
        }

      return this.props.children;
  }
}

// Wrapper fonctionnel pour utiliser le hook useTheme
export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return <ErrorBoundaryClass theme={theme}>{children}</ErrorBoundaryClass>;
}

