import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

// Ce type est optionnel ici mais c'est une bonne pratique
// pour s'assurer que les données sont cohérentes.
type SeedProfile = {
  nom: string;
  prenom: string;
  age: number;
  genre: string;
  photo: string;
  secteur: string;
  jour: string;
  horaires: {
    debut: string;
    fin: string;
  };
  specialisationPublic: string;
  adresse: string;
  ville: string;
  codePostal: string;
  experience: number;
  qualifications: string[];
  description: string;
  averageRating: number;
  totalReviews: number;
  tarifHeure: number;
  isActive: boolean;
  isVerified: boolean;
};

// Données de test complètes avec tous les champs requis
const mockProfiles: SeedProfile[] = [
  {
    nom: 'Martin',
    prenom: 'Sophie',
    age: 28,
    genre: 'Femme',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2576&auto=format&fit=crop',
    secteur: "Garde d'enfants",
    jour: '15/08',
    horaires: { debut: '16:00', fin: '20:00' },
    specialisationPublic: 'Enfants de 3 à 10 ans',
    adresse: '12 Rue de la Paix',
    ville: 'Paris',
    codePostal: '75002',
    experience: 5,
    qualifications: ['CAP Petite Enfance', 'Formation Premiers Secours (PSC1)'],
    description: "Passionnée par l'éducation, j'adore créer des activités ludiques et éducatives pour stimuler la créativité des enfants.",
    averageRating: 4.8,
    totalReviews: 12,
    tarifHeure: 12,
    isActive: true,
    isVerified: true,
  },
  {
    nom: 'Dubois',
    prenom: 'Julien',
    age: 35,
    genre: 'Homme',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2574&auto=format&fit=crop',
    secteur: 'Aide à domicile',
    jour: '15/08',
    horaires: { debut: '09:00', fin: '17:00' },
    specialisationPublic: 'Personnes âgées autonomes',
    adresse: '45 Avenue de la République',
    ville: 'Lyon',
    codePostal: '69002',
    experience: 8,
    qualifications: ['DEAES (Diplôme d\'État d\'Accompagnant Éducatif et Social)', 'Gestes et Postures'],
    description: "Patient et à l'écoute, j'accompagne les personnes âgées dans leur quotidien pour leur apporter confort et sécurité.",
    averageRating: 4.9,
    totalReviews: 25,
    tarifHeure: 15,
    isActive: true,
    isVerified: true,
  },
  {
    nom: 'Garcia',
    prenom: 'Maria',
    age: 42,
    genre: 'Femme',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2574&auto=format&fit=crop',
    secteur: 'Ménage',
    jour: '15/08',
    horaires: { debut: '14:00', fin: '16:00' },
    specialisationPublic: 'Appartements et maisons',
    adresse: '8 Boulevard de la Liberté',
    ville: 'Marseille',
    codePostal: '13001',
    experience: 12,
    qualifications: ['Formation Techniques de nettoyage professionnel'],
    description: 'Méticuleuse et organisée, je garantis un intérieur impeccable. J\'utilise des produits respectueux de l\'environnement.',
    averageRating: 4.7,
    totalReviews: 31,
    tarifHeure: 18,
    isActive: true,
    isVerified: true,
  },
  {
    nom: 'Petit',
    prenom: 'Lucas',
    age: 22,
    genre: 'Homme',
    photo: 'https://images.unsplash.com/photo-1557862921-37829c790f19?q=80&w=2671&auto=format&fit=crop',
    secteur: 'Courses',
    jour: '17/08',
    horaires: { debut: '10:00', fin: '19:00' },
    specialisationPublic: 'Tous types de courses',
    adresse: '33 Rue Sainte-Catherine',
    ville: 'Bordeaux',
    codePostal: '33000',
    experience: 2,
    qualifications: ['Permis B'],
    description: 'Dynamique et efficace, je fais vos courses rapidement et en respectant votre liste à la lettre.',
    averageRating: 4.5,
    totalReviews: 8,
    tarifHeure: 10,
    isActive: true,
    isVerified: false,
  },
  {
    nom: 'Leroy',
    prenom: 'Chloé',
    age: 55,
    genre: 'Femme',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=2561&auto=format&fit=crop',
    secteur: 'Accompagnement',
    jour: '16/08',
    horaires: { debut: '14:00', fin: '18:00' },
    specialisationPublic: 'Rendez-vous médicaux et promenades',
    adresse: '1 Place du Capitole',
    ville: 'Toulouse',
    codePostal: '31000',
    experience: 15,
    qualifications: ['Expérience en maison de retraite'],
    description: 'Douce et bienveillante, j\'offre une présence rassurante pour tous vos déplacements et sorties.',
    averageRating: 5.0,
    totalReviews: 18,
    tarifHeure: 14,
    isActive: true,
    isVerified: true,
  },
];

// Fonction pour peupler Firestore
export const seedFirestore = async () => {
  console.log('🌱 Début du seeding Firestore...');
  const createdProfiles = [];

  for (const profileData of mockProfiles) {
    try {
      const newProfileRef = await addDoc(collection(db, 'profiles'), profileData);
      console.log(`✅ Profil "${profileData.prenom}" créé avec l'ID: ${newProfileRef.id}`);
      createdProfiles.push({ id: newProfileRef.id, ...profileData });
    } catch (error) {
      console.error(`❌ Erreur création profil pour ${profileData.prenom}:`, error);
      throw error;
    }
  }

  console.log(`🎉 Seeding terminé. ${createdProfiles.length} profils créés.`);
  return createdProfiles;
};
