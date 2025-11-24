import React from 'react';
import { LucideArrowLeft, LucideShield, LucideFileText } from 'lucide-react';

const LegalLayout: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-flex items-center text-primary-400 hover:text-primary-300 mb-8 transition-colors">
          <LucideArrowLeft size={16} className="mr-2" /> Retour à l'application
        </a>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center mb-6 border-b border-slate-800 pb-6">
            <div className="p-3 bg-slate-800 rounded-lg mr-4">
              <Icon size={32} className="text-primary-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
          </div>
          
          <div className="prose prose-invert prose-slate max-w-none space-y-6">
            {children}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} AutoShorts AI. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicy: React.FC = () => (
  <LegalLayout title="Politique de Confidentialité" icon={LucideShield}>
    <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString()}</p>

    <h3>1. Introduction</h3>
    <p>
      Bienvenue sur AutoShorts AI. Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles.
      Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre service.
    </p>

    <h3>2. Données que nous collectons</h3>
    <p>Nous collectons et traitons les types de données suivants :</p>
    <ul className="list-disc pl-5 space-y-2">
      <li><strong>Informations d'Authentification :</strong> Tokens d'accès pour YouTube, TikTok et Facebook (stockés localement sur votre appareil).</li>
      <li><strong>Clés API :</strong> Vos clés API Google Gemini/Veo (stockées localement).</li>
      <li><strong>Données d'Utilisation :</strong> Statistiques de génération de vidéos et interactions avec l'interface.</li>
    </ul>

    <h3>3. Utilisation de vos données</h3>
    <p>Vos données sont utilisées uniquement pour :</p>
    <ul className="list-disc pl-5 space-y-2">
      <li>Générer du contenu vidéo via les API Google Gemini et Veo.</li>
      <li>Publier automatiquement le contenu sur vos comptes sociaux connectés (avec votre autorisation explicite).</li>
      <li>Améliorer les performances de l'application via des statistiques locales.</li>
    </ul>

    <h3>4. Stockage des données</h3>
    <p>
      AutoShorts AI fonctionne selon une architecture "Local-First". La majorité de vos données sensibles (Clés API, Tokens OAuth) 
      sont stockées uniquement dans le <strong>LocalStorage de votre navigateur</strong>. Elles ne transitent par nos serveurs que lorsque cela est strictement nécessaire pour une opération technique (ex: Cron Jobs), et ne sont jamais vendues à des tiers.
    </p>

    <h3>5. Services Tiers</h3>
    <p>Notre application utilise les services API suivants. L'utilisation de ces services est soumise à leurs propres politiques de confidentialité :</p>
    <ul className="list-disc pl-5 space-y-2">
      <li>Google (YouTube Services) : <a href="http://www.google.com/policies/privacy" className="text-primary-400 underline">Google Privacy Policy</a></li>
      <li>TikTok for Developers</li>
      <li>Meta (Facebook/Instagram)</li>
    </ul>

    <h3>6. Contact</h3>
    <p>Pour toute question concernant cette politique, veuillez nous contacter à : support@autoshorts.ai</p>
  </LegalLayout>
);

export const TermsOfService: React.FC = () => (
  <LegalLayout title="Conditions d'Utilisation" icon={LucideFileText}>
    <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString()}</p>

    <h3>1. Acceptation des Conditions</h3>
    <p>
      En accédant et en utilisant AutoShorts AI, vous acceptez d'être lié par les présentes Conditions d'Utilisation. 
      Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
    </p>

    <h3>2. Description du Service</h3>
    <p>
      AutoShorts AI est un outil SaaS permettant la génération automatisée de vidéos courtes à l'aide de l'Intelligence Artificielle (Google Gemini & Veo) 
      et leur publication sur les réseaux sociaux.
    </p>

    <h3>3. Responsabilités de l'Utilisateur</h3>
    <ul className="list-disc pl-5 space-y-2">
      <li>Vous êtes seul responsable du contenu généré et publié via notre outil.</li>
      <li>Vous vous engagez à ne pas générer de contenu illégal, haineux, ou violant les droits d'auteur de tiers.</li>
      <li>Vous devez respecter les conditions d'utilisation des plateformes cibles (YouTube, TikTok, Facebook).</li>
    </ul>

    <h3>4. Intelligence Artificielle & Hallucinations</h3>
    <p>
      Le contenu est généré par des modèles d'IA. AutoShorts AI ne garantit pas l'exactitude, la véracité ou la qualité du contenu généré. 
      Il est de votre responsabilité de vérifier le contenu avant publication.
    </p>

    <h3>5. Propriété Intellectuelle</h3>
    <p>
      Vous conservez les droits sur les vidéos que vous générez, sous réserve des conditions des modèles d'IA sous-jacents (Google GenAI). 
      AutoShorts AI détient les droits sur l'interface, le code et la marque.
    </p>

    <h3>6. Limitation de Responsabilité</h3>
    <p>
      AutoShorts AI est fourni "tel quel". Nous ne saurions être tenus responsables des pertes de données, des interdictions de compte (bans) sur les réseaux sociaux, 
      ou de tout autre dommage indirect résultant de l'utilisation du service.
    </p>

    <h3>7. Modifications</h3>
    <p>Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication sur cette page.</p>
  </LegalLayout>
);