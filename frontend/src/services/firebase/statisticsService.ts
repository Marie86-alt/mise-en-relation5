import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';


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
  tarifHeure?: number;
  averageRating?: number;
  totalReviews?: number;
  createdAt?: any;
  [key: string]: any;
}
interface ServiceData {
  id: string;
  aidantId?: string;
  clientId?: string;
  secteur?: string;
  montant?: number;     // € (côté app)
  status?: string;      // 'acompte_paye' | 'paiement_complet' | 'termine' | ...
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
  amount?: number;      // cents ou €
  montant?: number;     // € (autre source possible)
  commission?: number;  // €
  type?: string;        // 'deposit' | 'final' | 'final_payment'
  status?: string;      // 'pending' | 'completed' | 'succeeded'
  createdAt?: any;
  [key: string]: any;
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const SERVICE_DONE = new Set(['termine','evalue','paiement_complet']);
const SERVICE_INPROGRESS = new Set(['en_cours','acompte_paye','a_venir']);
const SERVICE_CANCELED = new Set(['annule','cancelled']);

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

export const statisticsService = {
  calculateStats: async () => {
    console.log('📊 Calcul des statistiques RÉELLES depuis Firebase...');

    // Charge tout (simple et efficace pour démarrer)
    const [usersSnap, servicesSnap, avisSnap, conversationsSnap, transactionsSnap] = await Promise.all([
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

    // 🧾 Services par statut (normalisés en lower-case)
    const servicesTermines = services.filter(s => SERVICE_DONE.has(String(s.status || '').toLowerCase()));
    const servicesEnCours = services.filter(s => SERVICE_INPROGRESS.has(String(s.status || '').toLowerCase()));
    const servicesAnnules = services.filter(s => SERVICE_CANCELED.has(String(s.status || '').toLowerCase()));

    // 💳 Transactions (gère 'amount' ou 'montant', 'final' ou 'final_payment', 'completed' ou 'succeeded')
    const txCompleted = transactions.filter(t => {
      const status = String(t.status || '').toLowerCase();
      return status === 'completed' || status === 'succeeded';
    });
    const txFinalOnly = txCompleted.filter(t => {
      const typ = String(t.type || '').toLowerCase();
      return typ === 'final' || typ === 'final_payment';
    });
    const txAmount = (t: TransactionData) => {
      const v = Number(t.amount ?? t.montant ?? 0);
      return Number.isFinite(v) ? v : 0;
    };

    // 💰 Chiffre d’affaires & commissions
    const fromTx = txFinalOnly.reduce((sum, t) => sum + txAmount(t), 0);
    let chiffreAffaires = fromTx > 0
      ? r2(fromTx)
      : r2(servicesTermines.reduce((sum, s) => sum + Number(s.montant || 0), 0));

    let commissionPerçue = txFinalOnly.length
      ? r2(txFinalOnly.reduce((sum, t) => sum + Number(t.commission ?? txAmount(t) * 0.4), 0))
      : r2(chiffreAffaires * 0.4);

    const servicesRealises = servicesTermines.length;
    const panierMoyen = r2(servicesRealises ? chiffreAffaires / servicesRealises : 0);

    // ⭐ Qualité
    const notes = avis.map(a => Number(a.rating || 0)).filter(n => Number.isFinite(n));
    const evaluationMoyenne = r1(notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 0);

    // 💬 Activité
    const conversationsActives = conversations.filter(c => {
      const st = String(c.status || 'conversation').toLowerCase();
      return st !== 'termine' && st !== 'annule' && st !== 'cancelled';
    }).length;

    // 📍 Secteurs populaires (aidants + revenus des services terminés)
    const secteurMap = new Map<string, { count: number; revenue: number; services: number }>();
    aidants.forEach(a => {
      const key = a.secteur || 'Non spécifié';
      const curr = secteurMap.get(key) ?? { count: 0, revenue: 0, services: 0 };
      curr.count += 1;
      secteurMap.set(key, curr);
    });
    servicesTermines.forEach(s => {
      const key = s.secteur || 'Non spécifié';
      const curr = secteurMap.get(key) ?? { count: 0, revenue: 0, services: 0 };
      curr.revenue += Number(s.montant || 0);
      curr.services += 1;
      secteurMap.set(key, curr);
    });
    const secteursPopulaires = Array.from(secteurMap.entries())
      .map(([secteur, v]) => ({ secteur, count: v.count, revenue: r0(v.revenue), services: v.services }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 📈 Évolution mensuelle (6 derniers mois)
    const today = new Date();
    const evolutionMensuelle: { mois: string; services: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
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

    // 🔢 Taux conversion + nouveaux utilisateurs du mois
    const tauxConversion = r0(services.length ? (servicesRealises / services.length) * 100 : 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nouveauxUtilisateurs = activeUsers.filter(u => {
      const d = toJSDate(u.createdAt);
      return d ? d >= thisMonthStart : false;
    }).length;

    const finalStats = {
      totalAidants: aidants.length,
      totalClients: clients.length,
      aidantsVerifies: aidantsVerifies.length,
      aidantsEnAttente: aidantsEnAttente.length,
      comptesSuspendus: comptesSuspendus.length,
      nouveauxUtilisateurs,

      servicesRealises,
      servicesEnCours: servicesEnCours.length,
      servicesAnnules: servicesAnnules.length,
      tauxConversion,

      chiffreAffaires,
      commissionPerçue,
      panierMoyen,

      evaluationMoyenne,
      totalAvis: avis.length,

      conversationsActives,
      secteursPopulaires,
      evolutionMensuelle,
      // 📊 Nouvelles métriques ajoutées
      tauxSatisfactionGlobal: r1(evaluationMoyenne), // Note sur 5 convertie en pourcentage
      evolutionRevenus: evolutionMensuelle.map(m => ({ 
        mois: m.mois, 
        revenus: m.revenue 
      })),

      lastUpdate: new Date().toISOString(),
    };

    console.log('✅ Statistiques RÉELLES calculées:', finalStats);
    return finalStats;
  },

  // Stats d'une période donnée (gardées)
  getStatsByPeriod: async (startDate: Date, endDate: Date) => {
    const servicesQuery = query(
      collection(db, 'services'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );
    const servicesSnap = await getDocs(servicesQuery);
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ServiceData[];
    const servicesTermines = services.filter(s =>
      SERVICE_DONE.has(String(s.status || '').toLowerCase())
    );
    const revenue = servicesTermines.reduce((sum, s) => sum + Number(s.montant || 0), 0);

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalServices: services.length,
      completedServices: servicesTermines.length,
      revenue: r2(revenue),
      commission: r2(revenue * 0.4),
    };
  },
};
