from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

# --- NOUVEAU : Stripe ---
import stripe

# Chemin du projet et .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# --- Stripe config ---
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
if not stripe.api_key:
    logger.warning("⚠️ STRIPE_SECRET_KEY non défini - les paiements ne fonctionneront pas")

# --- Firebase Admin SDK ---
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("⚠️ firebase-admin non installé. Installez avec: pip install firebase-admin")

db = None

if FIREBASE_AVAILABLE:
    try:
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        if not firebase_project_id:
            raise ValueError("FIREBASE_PROJECT_ID n'est pas défini")

        service_account_path = ROOT_DIR / "service-account.json"

        if service_account_path.exists():
            cred = credentials.Certificate(str(service_account_path))
            firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase initialisé avec service-account.json")
        else:
            firebase_admin.initialize_app()
            logger.info("✅ Firebase initialisé avec credentials par défaut")

        db = firestore.client()
        logger.info(f"✅ Firestore connecté au projet: {firebase_project_id}")

    except Exception as e:
        logger.error(f"❌ Erreur lors de l'initialisation de Firebase: {e}")
        logger.warning("⚠️ L'application démarrera sans base de données")
else:
    logger.warning("⚠️ Firebase Admin SDK non disponible")

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Démarrage de l'application")
    yield
    logger.info("🛑 Arrêt de l'application")
    if FIREBASE_AVAILABLE:
        try:
            firebase_admin.delete_app(firebase_admin.get_app())
            logger.info("✅ Firebase Admin fermé proprement")
        except:
            pass

# App FastAPI
app = FastAPI(
    title="API Mise en Relation - A La Case Nout Gramoun",
    description="API pour l'application de mise en relation",
    version="1.0.0",
    lifespan=lifespan,
)

# Router /api
api_router = APIRouter(prefix="/api")

# ------------------
#   MODELS
# ------------------
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class StatusCheckCreate(BaseModel):
    client_name: str


# --- NOUVEAU : modèle Stripe ---
class PaymentIntentCreate(BaseModel):
    amount: int  # en centimes
    currency: str = "eur"


# ------------------
#   ROUTES /api
# ------------------
@api_router.get("/")
async def api_root():
    return {
        "message": "API Mise en Relation - A La Case Nout Gramoun",
        "version": "1.0.0",
        "status": "running",
        "database": "Firebase Firestore" if db else "Non connectée",
    }


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if not db:
        raise HTTPException(status_code=503, detail="Base de données non disponible")

    try:
        status_obj = StatusCheck(**input.model_dump())
        status_dict = status_obj.model_dump()

        if isinstance(status_dict.get("timestamp"), datetime):
            status_dict["timestamp"] = status_dict["timestamp"].isoformat()

        doc_ref = db.collection("status_checks").document(status_obj.id)
        doc_ref.set(status_dict)

        logger.info(f"✅ Status check créé: {status_obj.id}")
        return status_obj

    except Exception as e:
        logger.error(f"❌ Erreur lors de la création du status check: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if not db:
        raise HTTPException(status_code=503, detail="Base de données non disponible")

    try:
        docs = db.collection("status_checks").limit(1000).stream()

        status_checks = []
        for doc in docs:
            data = doc.to_dict()
            if isinstance(data.get("timestamp"), str):
                data["timestamp"] = datetime.fromisoformat(data["timestamp"])
            status_checks.append(StatusCheck(**data))

        logger.info(f"✅ {len(status_checks)} status checks récupérés")
        return status_checks

    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")


@api_router.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "database": "disconnected",
        "firebase_sdk": FIREBASE_AVAILABLE,
        "timestamp": datetime.utcnow().isoformat(),
    }

    if db:
        try:
            test_ref = db.collection("_health_check").document("test")
            test_ref.set({"timestamp": datetime.utcnow().isoformat()})
            health_status["database"] = "connected"
            logger.info("✅ Health check: Base de données OK")
        except Exception as e:
            health_status["database"] = f"error: {str(e)}"
            health_status["status"] = "unhealthy"
            logger.error(f"❌ Health check: Erreur base de données - {e}")

    return health_status


# --- NOUVEAU : route Stripe ---
# --- NOUVEAU : route Stripe ---
@api_router.post("/create-payment-intent")  # ✅ Chemin corrigé !
async def create_payment_intent(body: PaymentIntentCreate):
    """
    Crée un PaymentIntent Stripe et renvoie le client_secret
    body.amount doit être en centimes (ex: 8,80€ -> 880)
    """
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré sur le serveur")

    try:
        intent = stripe.PaymentIntent.create(
            amount=body.amount,
            currency=body.currency,
            automatic_payment_methods={"enabled": True},
        )
        
        # ✅ Renvoyer les deux formats pour compatibilité
        return {
            "client_secret": intent["client_secret"],  # Snake case (standard backend)
            "clientSecret": intent["client_secret"],   # Camel case (frontend)
            "id": intent["id"]                          # ID du PaymentIntent
        }
    except Exception as e:
        logger.error(f"❌ Erreur Stripe: {e}")
        raise HTTPException(status_code=400, detail=str(e))
# ------------------
#   ROUTE /
# ------------------
@app.get("/")
def read_root():
    return {"message": "API mise-en-relation5 en ligne ✅"}


# Inclure /api
app.include_router(api_router)

# CORS
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
if not allowed_origins or allowed_origins == [""]:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
    ]
    logger.warning("⚠️ CORS configuré avec des origines par défaut (développement)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ Serveur FastAPI initialisé avec succès")
logger.info(f"📊 CORS origins: {allowed_origins}")
