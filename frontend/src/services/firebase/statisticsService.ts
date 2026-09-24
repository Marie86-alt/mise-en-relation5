import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { DEFAULT_PRICING } from '@/src/config/pricingConfig';

// Types simples (souples)
interface UserData {
  id: string;
  email?: string;
  displayName?: string;
  isAidant?: boolean;
  isVerified?: boolean;
  isSuspended?: boolean;
  isDeleted?: boolean;
  secteur?: string;
  createdAt?: any;
  [key: string]: any;
}
interface ServiceData {
  id: string;
  aidantId?: string;
  clientId?: string;
  secteur?: string;
  montant?: number; // €
  status?: string;
  createdAt?: any;
  completedAt?: any;
  [key: string]: any;
}
interface AvisData {
  id: string;
  rating?: number;
  createdAt?: any;
  [key: string]: any;
}
interface ConversationData {
  id: string;
  status?: string;
  lastMessage?: { createdAt: any };
  [key: string]: any;
}
interface TransactionData {
  id: string;
  amount?: number; // cents ou €
  montant?: number; // €
  commission?: number; // €
  type?: string; // 'acompte' | 'final' | 'final_payment' | ...
  status?: string; // 'pending' | 'completed' | 'succeeded'
  createdAt?: any;
  [key: string]: any;
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const SERVICE_DONE = new Set(['termine', 'evalue', 'paiement_complet']);
const SERVICE_INPROGRESS = new Set(['en_cours', 'acompte_paye', 'a_venir']);
const SERVICE_CANCELED = new Set(['annule', 'cancelled']);

function toJSDate(ts: any): Date | null {
  try {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    if (typeof ts === 'string') {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const r1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const r0 = (n: number) => Math.round(Number(n) || 0);

const isTxCompleted = (t: TransactionData) => {
  const st = String(t.status || '').toLowerCase();
  return st === 'completed' || st === 'succeeded';
};

const txAmount = (t: TransactionData) => {
  const v = Number(t.amount ?? t.montant ?? 0);
  return Number.isFinite(v) ? v : 0;
};

const isFinalTx = (t: TransactionData) => {
  const typ = String(t.type || '').toLowerCase();
  return typ === 'final' || typ === 'final_payment';
};

export type AdminStats = {
  // Ops
  totalAidants: number;
  totalClients: number;
  aidantsVerifies: number;
  aidantsEnAttente: number;
  comptesSuspendus: number;
  nouveauxUtilisateurs: number;

  servicesRealises: number;
  servicesEnCours: number;
  servicesAnnules: number;
  tauxFinalisation: number; // % (terminés / (terminés + annulés))

  // Business
  chiffreAffaires: number;     // €
  commissionPerçue: number;    // €
  panierMoyen: number;         // €

  // Qualité
  evaluationMoyenne: number;   // /5
  totalAvis: number;

  // Modération (optionnel)
  conversationsActives: number;

  // Secteurs (clair)
  topSecteursParRevenus: { secteur: string; revenue: number; services: number }[];
  topSecteursParAidants: { secteur: string; count: number }[];

  // Evolution
  evolutionMensuelle: { mois: string; services: number; revenue: number }[];

  lastUpdate: string;
};

export const statisticsService = {
  /** `commissionRate` : taux courant (config/pricing), utilisé quand une transaction n'a pas sa commission enregistrée. */
  calculateStats: async (commissionRate: number = DEFAULT_PRICING.commissionRate): Promise<AdminStats> => {

    const [usersSnap, servicesSnap, avisSnap, conversationsSnap, transactionsSnap] =
      await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'services')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'avis')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'conversations')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'transactions')).catch(() => ({ docs: [] } as any)),
      ]);

    const users = usersSnap.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) })
    ) as UserData[];

    const services = servicesSnap.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) })
    ) as ServiceData[];

    const avis = avisSnap.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) })
    ) as AvisData[];

    const conversations = conversationsSnap.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) })
    ) as ConversationData[];

    const transactions = transactionsSnap.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) })
    ) as TransactionData[];

    // 👥 Utilisateurs
    const activeUsers = users.filter(u => !u.isDeleted);
    const aidants = activeUsers.filter(u => !!u.isAidant);
    const clients = activeUsers.filter(u => !u.isAidant);
    const aidantsVerifies = aidants.filter(a => !!a.isVerified);
    const aidantsEnAttente = aidants.filter(a => !a.isVerified);
    const comptesSuspendus = activeUsers.filter(u => !!u.isSuspended);

    // 📅 Nouveaux utilisateurs ce mois
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nouveauxUtilisateurs = activeUsers.filter(u => {
      const d = toJSDate(u.createdAt);
      return d ? d >= thisMonthStart : false;
    }).length;

    // 🧾 Services par statut
    const servicesTermines = services.filter(s => SERVICE_DONE.has(String(s.status || '').toLowerCase()));
    const servicesEnCours = services.filter(s => SERVICE_INPROGRESS.has(String(s.status || '').toLowerCase()));
    const servicesAnnules = services.filter(s => SERVICE_CANCELED.has(String(s.status || '').toLowerCase()));

    const servicesRealises = servicesTermines.length;

    // ✅ Taux de finalisation (plus logique que "conversion")
    const denomFinalisation = servicesTermines.length + servicesAnnules.length;
    const tauxFinalisation = r0(denomFinalisation ? (servicesTermines.length / denomFinalisation) * 100 : 0);

    // 💳 Transactions finalisées
    const txCompleted = transactions.filter(isTxCompleted);
    const txFinalOnly = txCompleted.filter(isFinalTx);

    // 💰 CA & commission (priorité transactions final, sinon fallback services terminés)
    const caFromTx = txFinalOnly.reduce((sum, t) => sum + txAmount(t), 0);
    const chiffreAffaires = caFromTx > 0
      ? r2(caFromTx)
      : r2(servicesTermines.reduce((sum, s) => sum + Number(s.montant || 0), 0));

    const commissionPerçue = txFinalOnly.length
      ? r2(txFinalOnly.reduce((sum, t) => sum + Number(t.commission ?? txAmount(t) * commissionRate), 0))
      : r2(chiffreAffaires * commissionRate);

    const panierMoyen = r2(servicesRealises ? chiffreAffaires / servicesRealises : 0);

    // ⭐ Qualité
    const notes = avis.map(a => Number(a.rating || 0)).filter(n => Number.isFinite(n) && n > 0);
    const evaluationMoyenne = r1(notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 0);

    // 💬 Conversations actives
    const conversationsActives = conversations.filter(c => {
      const st = String(c.status || 'conversation').toLowerCase();
      return st !== 'termine' && st !== 'annule' && st !== 'cancelled';
    }).length;

    // 📍 TOP secteurs par revenus + par aidants
    const revenueBySecteur = new Map<string, { revenue: number; services: number }>();
    servicesTermines.forEach(s => {
      const key = s.secteur || 'Non spécifié';
      const curr = revenueBySecteur.get(key) ?? { revenue: 0, services: 0 };
      curr.revenue += Number(s.montant || 0);
      curr.services += 1;
      revenueBySecteur.set(key, curr);
    });

    const topSecteursParRevenus = Array.from(revenueBySecteur.entries())
      .map(([secteur, v]) => ({ secteur, revenue: r0(v.revenue), services: v.services }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const aidantsBySecteur = new Map<string, number>();
    aidants.forEach(a => {
      const key = a.secteur || 'Non spécifié';
      aidantsBySecteur.set(key, (aidantsBySecteur.get(key) ?? 0) + 1);
    });

    const topSecteursParAidants = Array.from(aidantsBySecteur.entries())
      .map(([secteur, count]) => ({ secteur, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 📈 Évolution mensuelle (3 derniers mois) basée sur services terminés
    const evolutionMensuelle: { mois: string; services: number; revenue: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthServices = servicesTermines.filter(s => {
        const when = toJSDate(s.completedAt ?? s.createdAt);
        return when ? when >= start && when <= end : false;
      });

      const monthRevenue = monthServices.reduce((sum, s) => sum + Number(s.montant || 0), 0);

      evolutionMensuelle.push({
        mois: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        services: monthServices.length,
        revenue: r0(monthRevenue),
      });
    }

    const finalStats: AdminStats = {
      totalAidants: aidants.length,
      totalClients: clients.length,
      aidantsVerifies: aidantsVerifies.length,
      aidantsEnAttente: aidantsEnAttente.length,
      comptesSuspendus: comptesSuspendus.length,
      nouveauxUtilisateurs,

      servicesRealises,
      servicesEnCours: servicesEnCours.length,
      servicesAnnules: servicesAnnules.length,
      tauxFinalisation,

      chiffreAffaires,
      commissionPerçue,
      panierMoyen,

      evaluationMoyenne,
      totalAvis: avis.length,

      conversationsActives,

      topSecteursParRevenus,
      topSecteursParAidants,

      evolutionMensuelle,

      lastUpdate: new Date().toISOString(),
    };

    return finalStats;
  },

  // Stats d'une période donnée
  getStatsByPeriod: async (startDate: Date, endDate: Date, commissionRate: number = DEFAULT_PRICING.commissionRate) => {
    const servicesQuery = query(
      collection(db, 'services'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );

    const servicesSnap = await getDocs(servicesQuery);
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ServiceData[];

    const servicesTermines = services.filter(s => SERVICE_DONE.has(String(s.status || '').toLowerCase()));
    const revenue = servicesTermines.reduce((sum, s) => sum + Number(s.montant || 0), 0);

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalServices: services.length,
      completedServices: servicesTermines.length,
      revenue: r2(revenue),
      commission: r2(revenue * commissionRate),
    };
  },
};
