import { Alert } from 'react-native';

export interface AppError {
  code: string;
  message: string;
  context?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
}

class ErrorService {
  private static errors: AppError[] = [];

  static logError(
    code: string,
    message: string,
    context?: string,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'error'
  ) {
    const error: AppError = {
      code,
      message,
      context,
      severity,
      timestamp: new Date(),
    };

    this.errors.push(error);

    if (__DEV__) {
      console.log(`[${severity.toUpperCase()}] ${code}`, context);
    }
  }

  static showAlert(title: string, message: string, buttons?: any[]) {
    Alert.alert(title, message, buttons || [{ text: 'OK' }]);
  }

  static handleNetworkError(error: any) {
    let message = 'Erreur réseau inconnue.';

    if (error?.message?.includes('Network')) {
      message = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else if (error?.code === 'TIMEOUT') {
      message = 'La requête a expiré. Réessayez.';
    } else if (error?.status === 404) {
      message = 'Ressource non trouvée.';
    } else if (error?.status === 500) {
      message = 'Erreur serveur. Réessayez plus tard.';
    }

    this.logError('NETWORK_ERROR', error?.message ?? message, error?.code, 'error');
    return message;
  }

  static handleFirebaseError(error: any) {
    let message = 'Une erreur est survenue. Veuillez réessayer.';

    if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/invalid-credential'
    ) {
      message = 'E-mail ou mot de passe incorrect.';
    } else if (error?.code === 'auth/email-already-in-use') {
      message = 'Cette adresse e-mail est déjà utilisée.';
    } else if (error?.code === 'auth/weak-password') {
      message = 'Le mot de passe est trop faible (6 caractères minimum).';
    } else if (error?.code === 'auth/invalid-email') {
      message = 'Adresse e-mail invalide.';
    } else if (error?.code === 'auth/too-many-requests') {
      message = 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
    } else if (error?.code === 'auth/network-request-failed') {
      message = 'Connexion impossible. Vérifiez votre accès Internet.';
    } else if (error?.code === 'permission-denied') {
      message = 'Action non autorisée.';
    } else if (error?.code === 'unavailable') {
      message = 'Service temporairement indisponible.';
    }

    this.logError('FIREBASE_ERROR', error?.message ?? message, error?.code, 'error');
    return message;
  }

  static getErrors(): AppError[] {
    return [...this.errors];
  }

  static clearErrors() {
    this.errors = [];
  }
}

export default ErrorService;
