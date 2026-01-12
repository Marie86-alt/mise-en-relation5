// src/services/errorService.ts
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

  /**
     * Enregistre une erreur et l'envoie à Sentry (production)
     */
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

      // Log en console en développement
      if (__DEV__) {
              console.log(`[${severity.toUpperCase()}] ${code}: ${message}`, context);
      }
  }

  /**
     * Affiche une alerte utilisateur
     */
  static showAlert(title: string, message: string, buttons?: any[]) {
        Alert.alert(title, message, buttons || [{ text: 'OK' }]);
  }

  /**
     * Traite les erreurs réseau
     */
  static handleNetworkError(error: any) {
        let message = 'Erreur réseau inconnue';

      if (error.message?.includes('Network')) {
              message = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
      } else if (error.code === 'TIMEOUT') {
              message = 'La requête a expiré. Réessayez.';
      } else if (error.status === 404) {
              message = 'Ressource non trouvée.';
      } else if (error.status === 500) {
              message = 'Erreur serveur. Réessayez plus tard.';
      }

      this.logError('NETWORK_ERROR', message, error.code, 'error');
        return message;
  }

  /**
     * Traite les erreurs Firebase
     */
  static handleFirebaseError(error: any) {
        let message = 'Erreur Firebase';

      if (error.code === 'auth/user-not-found') {
              message = 'Utilisateur non trouvé.';
      } else if (error.code === 'auth/wrong-password') {
              message = 'Mot de passe incorrect.';
      } else if (error.code === 'auth/email-already-in-use') {
              message = 'Cet email est déjà utilisé.';
      } else if (error.code === 'auth/weak-password') {
              message = 'Le mot de passe est trop faible.';
      } else {
              message = error.message || message;
      }

      this.logError('FIREBASE_ERROR', message, error.code, 'error');
        return message;
  }

  /**
     * Récupère l'historique des erreurs
   */
                  static getErrors(): AppError[] {
                        return [...this.errors];
                  }

  /**
     * Efface l'historique
                   */
  static clearErrors() {
                    this.errors = [];
  }
  }

    export default ErrorService;
