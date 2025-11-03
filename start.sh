#!/bin/bash

echo "🚀 Démarrage de A La Case Nout Gramoun"
echo "======================================"

# Fonction pour vérifier si un service tourne
check_service() {
    if pgrep -f "$1" > /dev/null; then
        echo "✅ $2 est en cours d'exécution"
        return 0
    else
        echo "❌ $2 n'est pas en cours d'exécution"
        return 1
    fi
}

# Vérifier les services
echo ""
echo "📊 État des services:"
check_service "uvicorn" "Backend (FastAPI)"
check_service "expo start" "Frontend (Expo)"

# URLs
echo ""
echo "🌐 URLs d'accès:"
echo "  • Backend API: http://localhost:8001/api/"
echo "  • Frontend Web: http://localhost:3000"
echo "  • Health Check: http://localhost:8001/api/health"

echo ""
echo "📱 Pour tester sur mobile:"
echo "  1. Installez Expo Go sur votre téléphone"
echo "  2. Scannez le QR code qui s'affiche"

echo ""
echo "🔧 Commandes utiles:"
echo "  • Redémarrer backend: sudo supervisorctl restart backend"
echo "  • Redémarrer frontend: sudo supervisorctl restart expo"
echo "  • Voir logs backend: tail -f /var/log/supervisor/backend.err.log"
echo "  • Voir logs frontend: tail -f /var/log/supervisor/expo.out.log"
