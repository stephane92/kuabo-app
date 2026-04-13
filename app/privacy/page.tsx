"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
type Lang = "fr" | "en" | "es";

export default function Privacy() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const l = localStorage.getItem("lang") as Lang;
    if (l) setLang(l);
  }, []);

  const content = {
    fr: {
      title: "Politique de confidentialité",
      updated: "Dernière mise à jour : Avril 2026",
      sections: [
        {
          title: "1. Qui sommes-nous",
          text: "Kuabo est une application développée et opérée par Kuabo. Pour toute question relative à la confidentialité, contactez-nous à : support@kuabo.co",
        },
        {
          title: "2. Données collectées",
          text: "Nous collectons les données suivantes :\n\n• Données d'identité : nom, adresse email\n• Données de profil : situation d'immigration, date d'arrivée, état américain, ville, pays d'origine\n• Données d'utilisation : étapes complétées, parcours, préférences de langue\n• Données de localisation : position géographique approximative (uniquement si vous l'autorisez explicitement)\n• Données communautaires : recommandations d'employeurs, avis partagés\n• Données techniques : identifiant appareil, logs d'accès",
        },
        {
          title: "3. Utilisation des données",
          text: "Vos données sont utilisées pour :\n\n• Personnaliser votre parcours d'installation\n• Afficher les services et ressources près de chez vous\n• Améliorer l'application et ses fonctionnalités\n• Vous envoyer des rappels et notifications utiles\n• Calculer vos délais (SSN, Green Card, permis)\n• Générer des statistiques anonymes sur l'utilisation\n\nNous ne vendons jamais vos données à des tiers.",
        },
        {
          title: "4. Carte communauté",
          text: "La fonctionnalité de carte communauté est strictement optionnelle. Si vous choisissez de l'activer :\n\n• Votre position est arrondie à environ 2km pour protéger votre vie privée\n• Seul un point anonyme est visible par les autres utilisateurs\n• Votre nom et email ne sont jamais partagés sur la carte\n• Vous pouvez désactiver cette fonctionnalité à tout moment dans les paramètres\n• Votre position n'est jamais partagée avec des tiers",
        },
        {
          title: "5. Firebase et Google",
          text: "Nous utilisons Firebase (Google LLC) pour :\n\n• L'authentification (Firebase Auth)\n• Le stockage des données (Firestore)\n• L'hébergement (Firebase Hosting)\n\nVos données sont stockées sur des serveurs sécurisés aux États-Unis conformément aux politiques de confidentialité de Google. Google est certifié ISO 27001 et SOC 2.",
        },
        {
          title: "6. Google Maps",
          text: "Nous utilisons Google Maps pour afficher la carte des services. Google peut collecter des données techniques liées à votre utilisation de la carte. Consultez la politique de confidentialité de Google : policies.google.com/privacy",
        },
        {
          title: "7. Cloudinary",
          text: "Les images uploadées dans l'application (photos de profil, images admin) sont hébergées sur Cloudinary. Ces fichiers sont stockés de manière sécurisée et ne sont pas partagés avec des tiers.",
        },
        {
          title: "8. Publicités partenaires",
          text: "Kuabo peut afficher des publicités de partenaires commerciaux. Ces publicités sont clairement identifiées par le badge « Partenaire Kuabo ». Nous ne partageons pas vos données personnelles avec nos partenaires publicitaires. Aucun cookie publicitaire tiers n'est utilisé.",
        },
        {
          title: "9. Partage des données",
          text: "Nous partageons vos données uniquement avec :\n\n• Google (Firebase, Maps) — pour le fonctionnement de l'application\n• Cloudinary — pour le stockage des images\n\nNous ne vendons, ne louons et ne partageons jamais vos données avec des courtiers en données, annonceurs ou autres tiers à des fins commerciales.",
        },
        {
          title: "10. Sécurité",
          text: "Nous protégeons vos données avec :\n\n• Chiffrement HTTPS pour toutes les communications\n• Authentification sécurisée Firebase\n• Accès aux données strictement limité\n• Aucun mot de passe stocké en clair\n• Audits de sécurité réguliers",
        },
        {
          title: "11. Vos droits",
          text: "Vous disposez des droits suivants :\n\n• Accès : voir toutes vos données dans l'application\n• Rectification : modifier vos informations depuis les paramètres\n• Suppression : supprimer votre compte et toutes vos données depuis Profil → Supprimer mon compte\n• Portabilité : contactez support@kuabo.co pour exporter vos données\n• Opposition : désactiver la carte communauté et les notifications à tout moment\n\nPour exercer ces droits : support@kuabo.co",
        },
        {
          title: "12. Conservation des données",
          text: "Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, vos données personnelles sont anonymisées dans les 30 jours. Certaines données peuvent être conservées plus longtemps pour des obligations légales.",
        },
        {
          title: "13. Données des mineurs",
          text: "Kuabo n'est pas destiné aux personnes de moins de 13 ans. Nous ne collectons pas sciemment de données de mineurs. Si vous pensez qu'un mineur a créé un compte, contactez-nous immédiatement à support@kuabo.co.",
        },
        {
          title: "14. Cookies et stockage local",
          text: "Nous utilisons le stockage local (localStorage) de votre appareil pour mémoriser vos préférences (langue, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.",
        },
        {
          title: "15. Modifications",
          text: "Nous nous réservons le droit de modifier cette politique à tout moment. Les modifications importantes seront notifiées via l'application. La date de mise à jour est indiquée en haut de ce document.",
        },
        {
          title: "16. Contact",
          text: "Responsable du traitement des données :\nKuabo\nEmail : support@kuabo.co\nSite : kuabo.co\n\nPour toute question relative à vos données personnelles ou pour exercer vos droits, contactez-nous à support@kuabo.co",
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      updated: "Last updated: April 2026",
      sections: [
        {
          title: "1. Who We Are",
          text: "Kuabo is an application developed and operated by Kuabo. For any privacy-related questions, contact us at: support@kuabo.co",
        },
        {
          title: "2. Data Collected",
          text: "We collect the following data:\n\n• Identity data: name, email address\n• Profile data: immigration status, arrival date, US state, city, country of origin\n• Usage data: completed steps, journey, language preferences\n• Location data: approximate geographic location (only if you explicitly allow it)\n• Community data: employer recommendations, shared reviews\n• Technical data: device identifier, access logs",
        },
        {
          title: "3. Use of Data",
          text: "Your data is used to:\n\n• Personalize your settlement journey\n• Display nearby services and resources\n• Improve the application and its features\n• Send you useful reminders and notifications\n• Calculate your deadlines (SSN, Green Card, license)\n• Generate anonymous usage statistics\n\nWe never sell your data to third parties.",
        },
        {
          title: "4. Community Map",
          text: "The community map feature is strictly optional. If you choose to enable it:\n\n• Your location is rounded to approximately 2km to protect your privacy\n• Only an anonymous dot is visible to other users\n• Your name and email are never shared on the map\n• You can disable this feature at any time in settings\n• Your location is never shared with third parties",
        },
        {
          title: "5. Firebase and Google",
          text: "We use Firebase (Google LLC) for:\n\n• Authentication (Firebase Auth)\n• Data storage (Firestore)\n• Hosting (Firebase Hosting)\n\nYour data is stored on secure servers in the United States in accordance with Google's privacy policies. Google is ISO 27001 and SOC 2 certified.",
        },
        {
          title: "6. Google Maps",
          text: "We use Google Maps to display the services map. Google may collect technical data related to your use of the map. See Google's privacy policy: policies.google.com/privacy",
        },
        {
          title: "7. Cloudinary",
          text: "Images uploaded in the application (profile photos, admin images) are hosted on Cloudinary. These files are stored securely and are not shared with third parties.",
        },
        {
          title: "8. Partner Advertising",
          text: "Kuabo may display advertising from commercial partners. These ads are clearly identified by the 'Kuabo Partner' badge. We do not share your personal data with our advertising partners. No third-party advertising or tracking cookies are used.",
        },
        {
          title: "9. Data Sharing",
          text: "We share your data only with:\n\n• Google (Firebase, Maps) — for application operation\n• Cloudinary — for image storage\n\nWe never sell, rent, or share your data with data brokers, advertisers, or other third parties for commercial purposes.",
        },
        {
          title: "10. Security",
          text: "We protect your data with:\n\n• HTTPS encryption for all communications\n• Secure Firebase authentication\n• Strictly limited data access\n• No passwords stored in plain text\n• Regular security audits",
        },
        {
          title: "11. Your Rights",
          text: "You have the following rights:\n\n• Access: view all your data in the application\n• Rectification: modify your information from settings\n• Deletion: delete your account and all your data from Profile → Delete my account\n• Portability: contact support@kuabo.co to export your data\n• Objection: disable the community map and notifications at any time\n\nTo exercise these rights: support@kuabo.co",
        },
        {
          title: "12. Data Retention",
          text: "Your data is retained as long as your account is active. Upon account deletion, your personal data is anonymized within 30 days. Some data may be retained longer for legal obligations.",
        },
        {
          title: "13. Children's Data",
          text: "Kuabo is not intended for persons under 13 years of age. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us immediately at support@kuabo.co.",
        },
        {
          title: "14. Cookies and Local Storage",
          text: "We use your device's local storage (localStorage) to remember your preferences (language, session). No third-party advertising or tracking cookies are used.",
        },
        {
          title: "15. Changes",
          text: "We reserve the right to modify this policy at any time. Important changes will be notified via the application. The update date is shown at the top of this document.",
        },
        {
          title: "16. Contact",
          text: "Data controller:\nKuabo\nEmail: support@kuabo.co\nWebsite: kuabo.co\n\nFor any questions about your personal data or to exercise your rights, contact us at support@kuabo.co",
        },
      ],
    },
    es: {
      title: "Política de Privacidad",
      updated: "Última actualización: Abril 2026",
      sections: [
        {
          title: "1. Quiénes somos",
          text: "Kuabo es una aplicación desarrollada y operada por Kuabo. Para cualquier pregunta relacionada con la privacidad, contáctanos en: support@kuabo.co",
        },
        {
          title: "2. Datos recopilados",
          text: "Recopilamos los siguientes datos:\n\n• Datos de identidad: nombre, dirección de correo electrónico\n• Datos de perfil: situación migratoria, fecha de llegada, estado de EE.UU., ciudad, país de origen\n• Datos de uso: pasos completados, recorrido, preferencias de idioma\n• Datos de ubicación: ubicación geográfica aproximada (solo si lo permites explícitamente)\n• Datos comunitarios: recomendaciones de empleadores, reseñas compartidas\n• Datos técnicos: identificador de dispositivo, registros de acceso",
        },
        {
          title: "3. Uso de datos",
          text: "Tus datos se usan para:\n\n• Personalizar tu proceso de instalación\n• Mostrar servicios y recursos cercanos\n• Mejorar la aplicación y sus funcionalidades\n• Enviarte recordatorios y notificaciones útiles\n• Calcular tus plazos (SSN, Green Card, licencia)\n• Generar estadísticas de uso anónimas\n\nNunca vendemos tus datos a terceros.",
        },
        {
          title: "4. Mapa comunitario",
          text: "La función de mapa comunitario es estrictamente opcional. Si decides activarla:\n\n• Tu ubicación se redondea a aproximadamente 2km para proteger tu privacidad\n• Solo un punto anónimo es visible para otros usuarios\n• Tu nombre y correo nunca se comparten en el mapa\n• Puedes desactivar esta función en cualquier momento en la configuración\n• Tu ubicación nunca se comparte con terceros",
        },
        {
          title: "5. Firebase y Google",
          text: "Usamos Firebase (Google LLC) para:\n\n• Autenticación (Firebase Auth)\n• Almacenamiento de datos (Firestore)\n• Hosting (Firebase Hosting)\n\nTus datos se almacenan en servidores seguros en EE.UU. de acuerdo con las políticas de privacidad de Google. Google tiene certificación ISO 27001 y SOC 2.",
        },
        {
          title: "6. Google Maps",
          text: "Usamos Google Maps para mostrar el mapa de servicios. Google puede recopilar datos técnicos relacionados con tu uso del mapa. Consulta la política de privacidad de Google: policies.google.com/privacy",
        },
        {
          title: "7. Cloudinary",
          text: "Las imágenes subidas en la aplicación (fotos de perfil, imágenes admin) se alojan en Cloudinary. Estos archivos se almacenan de forma segura y no se comparten con terceros.",
        },
        {
          title: "8. Publicidad de socios",
          text: "Kuabo puede mostrar publicidad de socios comerciales. Estos anuncios están claramente identificados con el sello 'Socio Kuabo'. No compartimos tus datos personales con nuestros socios publicitarios. No se usan cookies publicitarias ni de seguimiento de terceros.",
        },
        {
          title: "9. Compartir datos",
          text: "Compartimos tus datos solo con:\n\n• Google (Firebase, Maps) — para el funcionamiento de la aplicación\n• Cloudinary — para el almacenamiento de imágenes\n\nNunca vendemos, alquilamos ni compartimos tus datos con corredores de datos, anunciantes u otros terceros con fines comerciales.",
        },
        {
          title: "10. Seguridad",
          text: "Protegemos tus datos con:\n\n• Cifrado HTTPS para todas las comunicaciones\n• Autenticación segura de Firebase\n• Acceso a datos estrictamente limitado\n• Contraseñas nunca almacenadas en texto plano\n• Auditorías de seguridad regulares",
        },
        {
          title: "11. Tus derechos",
          text: "Tienes los siguientes derechos:\n\n• Acceso: ver todos tus datos en la aplicación\n• Rectificación: modificar tu información desde la configuración\n• Eliminación: eliminar tu cuenta y todos tus datos desde Perfil → Eliminar mi cuenta\n• Portabilidad: contacta support@kuabo.co para exportar tus datos\n• Oposición: desactivar el mapa comunitario y las notificaciones en cualquier momento\n\nPara ejercer estos derechos: support@kuabo.co",
        },
        {
          title: "12. Conservación de datos",
          text: "Tus datos se conservan mientras tu cuenta esté activa. Al eliminar la cuenta, tus datos personales se anonimizan en 30 días. Algunos datos pueden conservarse más tiempo por obligaciones legales.",
        },
        {
          title: "13. Datos de menores",
          text: "Kuabo no está destinado a personas menores de 13 años. No recopilamos conscientemente datos de menores. Si crees que un menor ha creado una cuenta, contáctanos de inmediato en support@kuabo.co.",
        },
        {
          title: "14. Cookies y almacenamiento local",
          text: "Usamos el almacenamiento local (localStorage) de tu dispositivo para recordar tus preferencias (idioma, sesión). No se usan cookies publicitarias ni de seguimiento de terceros.",
        },
        {
          title: "15. Cambios",
          text: "Nos reservamos el derecho de modificar esta política en cualquier momento. Los cambios importantes se notificarán a través de la aplicación. La fecha de actualización se muestra en la parte superior de este documento.",
        },
        {
          title: "16. Contacto",
          text: "Responsable del tratamiento de datos:\nKuabo\nCorreo: support@kuabo.co\nSitio web: kuabo.co\n\nPara cualquier pregunta sobre tus datos personales o para ejercer tus derechos, contáctanos en support@kuabo.co",
        },
      ],
    },
  }[lang];

  return (
    <div style={container}>
      <div style={header}>
        <button style={backBtn} onClick={() => router.back()}>←</button>
        <div style={logo}><span style={{ color:"#e8b84b" }}>Ku</span>abo</div>
        <div style={{ width:40 }} />
      </div>
      <div style={contentWrap}>
        <div style={titleStyle}>{content.title}</div>
        <div style={updatedStyle}>{content.updated}</div>
        {content.sections.map((s, i) => (
          <div key={i} style={section}>
            <div style={sectionTitle}>{s.title}</div>
            <div style={sectionText}>{s.text}</div>
          </div>
        ))}
        <div style={{ height:40 }} />
      </div>
    </div>
  );
}

const container: CSSProperties   = { minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec" };
const header: CSSProperties      = { position:"sticky", top:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const backBtn: CSSProperties     = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:20, fontFamily:"inherit", width:40 };
const logo: CSSProperties        = { fontWeight:900, fontSize:18, fontFamily:"serif" };
const contentWrap: CSSProperties = { padding:"24px 20px", maxWidth:600, margin:"0 auto" };
const titleStyle: CSSProperties  = { fontSize:24, fontWeight:700, color:"#f4f1ec", marginBottom:8 };
const updatedStyle: CSSProperties= { fontSize:12, color:"#555", marginBottom:28 };
const section: CSSProperties     = { marginBottom:24 };
const sectionTitle: CSSProperties= { fontSize:15, fontWeight:600, color:"#e8b84b", marginBottom:8 };
const sectionText: CSSProperties = { fontSize:13, color:"#aaa", lineHeight:1.8, whiteSpace:"pre-line" };
