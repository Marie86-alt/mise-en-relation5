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
    let message = 'Erreur reseau inconnue.';

    if (error?.message?.includes('Network')) {
      message = 'Impossible de se connecter au serveur. Verifiez votre connexion.';
    } else if (error?.code === 'TIMEOUT') {
      message = 'La requete a expire. Reessayez.';
    } else if (error?.status === 404) {
      message = 'Ressource non trouvee.';
    } else if (error?.status === 500) {
      message = 'Erreur serveur. Reessayez plus tard.';
    }

    this.logError('NETWORK_ERROR', error?.message ?? message, error?.code, 'error');
    return message;
  }

  static handleFirebaseError(error: any) {
    let message = 'Une erreur est survenue. Veuillez reessayer.';

    if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/invalid-credential'
    ) {
      message = 'Email ou mot de passe incorrect.';
    } else if (error?.code === 'auth/email-already-in-use') {
      message = 'Cette adresse email est deja utilisee.';
    } else if (error?.code === 'auth/weak-password') {
      message = 'Le mot de passe est trop faible.';
    } else if (error?.code === 'auth/invalid-email') {
      message = 'Adresse email invalide.';
    } else if (error?.code === 'permission-denied') {
      message = 'Action non autorisee.';
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
