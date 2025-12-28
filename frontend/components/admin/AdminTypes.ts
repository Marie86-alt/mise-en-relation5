// components/admin/AdminTypes.ts

export type UserRow = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  isVerified?: boolean;
  isSuspended?: boolean;
  isAidant?: boolean;
  secteur?: string | null;
  tarifHeure?: number | null;
  createdAt?: any;
  isDeleted?: boolean;
};

export type ConversationRow = {
  id: string;
  participants: string[];
  participantDetails?: { [uid: string]: { displayName?: string | null } };
  lastMessage?: { texte: string; createdAt: any };
  secteur?: string;
  status?: 'conversation' | 'a_venir' | 'termine';
  messageCount?: number;
};

export type MessageRow = {
  id: string;
  texte: string;
  expediteurId: string;
  createdAt: any;
  conversationId: string;
  expediteurName?: string;
};

// Type UI simple (ce que tu affiches dans StatsTab)
export type StatsUI = {
  totalUsers: number;
  servicesRealises: number;
  conversationsActives: number;

  evaluationMoyenne: number;
  totalAvis: number;

  chiffreAffaires: number;
  commissionPerçue: number;

  topSecteursParRevenus: { secteur: string; revenue: number; services: number }[];
  evolutionMensuelle: { mois: string; services: number; revenue: number }[];

  lastUpdate?: string;
};
