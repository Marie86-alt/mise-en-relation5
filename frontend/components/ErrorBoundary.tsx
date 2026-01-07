import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import ErrorService from '@/src/services/errorService';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
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
        if (this.state.hasError) {
                return (
                          <View style={styles.container}>
                                      <View style={styles.errorBox}>
                                                    <Text style={styles.errorIcon}>⚠️</Text>
                                                    <Text style={styles.errorTitle}>Une erreur est survenue</Text>
                                                    <Text style={styles.errorMessage}>{this.state.errorMessage}</Text>

                                                    <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
                                                                    <Text style={styles.resetButtonText}>Réessayer</Text>
                                                    </TouchableOpacity>TouchableOpacity>

                                        {__DEV__ && (
                                          <Text style={styles.devMessage}>
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

const styles = StyleSheet.create({
    container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.light.background,
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
          backgroundColor: Colors.light.primary,
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
          color: '#999',
            fontStyle: 'italic',
                                                          marginTop: 12,
      },
});
