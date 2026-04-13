"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
type Lang = "fr" | "en" | "es";

export default function Terms() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const l = localStorage.getItem("lang") as Lang;
    if (l) setLang(l);
  }, []);

  const content = {
    fr: {
      title: "Conditions d'utilisation",
      updated: "Dernière mise à jour : Avril 2026",
      sections: [
        {
          title: "1. Acceptation des conditions",
          text: "En téléchargeant, installant ou utilisant l'application Kuabo, vous acceptez sans réserve les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions dans leur intégralité, vous devez cesser immédiatement d'utiliser l'application.",
        },
        {
          title: "2. Description du service",
          text: "Kuabo est une application mobile d'accompagnement pour immigrants aux États-Unis. Elle fournit des informations pratiques (SSN, Green Card, banque, emploi, logement), un suivi personnalisé de votre parcours d'installation, une carte communautaire optionnelle, et des recommandations d'employeurs partagées par la communauté.",
        },
        {
          title: "3. Conditions d'accès",
          text: "Vous devez avoir au moins 13 ans pour utiliser Kuabo. En créant un compte, vous certifiez que les informations fournies sont exactes. Un seul compte par personne est autorisé.",
        },
        {
          title: "4. Compte utilisateur",
          text: "Vous êtes entièrement responsable de la sécurité de votre compte et de votre mot de passe. Toute activité effectuée depuis votre compte est sous votre responsabilité. Signalez immédiatement tout accès non autorisé à support@kuabo.co.",
        },
        {
          title: "5. Utilisation acceptable",
          text: "Vous vous engagez à utiliser Kuabo exclusivement à des fins légales. Sont strictement interdits : l'usurpation d'identité, la publication de fausses informations sur des employeurs, toute forme de harcèlement envers d'autres membres, l'utilisation de l'application à des fins commerciales non autorisées, et toute tentative d'accès non autorisé aux systèmes de Kuabo.",
        },
        {
          title: "6. Contenu de l'application",
          text: "Les informations fournies par Kuabo sont à titre informatif uniquement. Elles ne constituent pas des conseils juridiques, fiscaux, financiers ou médicaux professionnels. Pour toute décision importante liée à votre statut d'immigration, consultez un avocat spécialisé en droit de l'immigration.",
        },
        {
          title: "7. Contenu communautaire",
          text: "Les recommandations d'employeurs et avis partagés par les utilisateurs reflètent les opinions personnelles de leurs auteurs. Kuabo ne peut garantir l'exactitude de ces informations et décline toute responsabilité quant aux décisions prises sur leur base.",
        },
        {
          title: "8. Publicités partenaires",
          text: "Kuabo peut afficher des publicités de partenaires commerciaux, clairement identifiées par le badge « Partenaire Kuabo ». Ces contenus sponsorisés sont distingués du contenu éditorial conformément aux règles FTC. Kuabo n'est pas responsable des produits ou services des partenaires.",
        },
        {
          title: "9. Données personnelles",
          text: "Nous collectons et traitons vos données personnelles conformément à notre Politique de confidentialité. En utilisant Kuabo, vous consentez expressément à cette collecte et ce traitement. Vous pouvez supprimer votre compte et toutes vos données à tout moment depuis les paramètres.",
        },
        {
          title: "10. Propriété intellectuelle",
          text: "L'application Kuabo, son logo, son design, son code source et ses contenus sont protégés par les lois sur la propriété intellectuelle. Toute reproduction, modification ou distribution sans autorisation écrite préalable de Kuabo est strictement interdite.",
        },
        {
          title: "11. Limitation de responsabilité",
          text: "Dans les limites permises par la loi, Kuabo ne peut être tenu responsable des dommages indirects, accessoires ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser l'application. L'application est fournie « telle quelle » sans garantie d'aucune sorte.",
        },
        {
          title: "12. Résiliation",
          text: "Kuabo se réserve le droit de suspendre ou de supprimer votre compte en cas de violation des présentes conditions, sans préavis. Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application.",
        },
        {
          title: "13. Modifications",
          text: "Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications importantes seront notifiées via l'application ou par email. La poursuite de l'utilisation après notification vaut acceptation des nouvelles conditions.",
        },
        {
          title: "14. Droit applicable",
          text: "Les présentes conditions sont régies par le droit de l'État du Maryland, États-Unis. Tout litige sera soumis à la juridiction compétente de cet État.",
        },
        {
          title: "15. Contact",
          text: "Pour toute question concernant ces conditions : support@kuabo.co\nKuabo · support@kuabo.co · kuabo.co",
        },
      ],
    },
    en: {
      title: "Terms of Service",
      updated: "Last updated: April 2026",
      sections: [
        {
          title: "1. Acceptance of Terms",
          text: "By downloading, installing, or using the Kuabo application, you fully accept these Terms of Service. If you do not agree to these terms in their entirety, you must immediately stop using the application.",
        },
        {
          title: "2. Service Description",
          text: "Kuabo is a mobile support application for immigrants in the United States. It provides practical information (SSN, Green Card, banking, employment, housing), personalized tracking of your settlement journey, an optional community map, and employer recommendations shared by the community.",
        },
        {
          title: "3. Access Requirements",
          text: "You must be at least 13 years old to use Kuabo. By creating an account, you certify that the information provided is accurate. Only one account per person is allowed.",
        },
        {
          title: "4. User Account",
          text: "You are fully responsible for the security of your account and password. Any activity performed from your account is your responsibility. Immediately report any unauthorized access to support@kuabo.co.",
        },
        {
          title: "5. Acceptable Use",
          text: "You agree to use Kuabo exclusively for lawful purposes. Strictly prohibited: identity theft, posting false employer information, any form of harassment toward other members, using the application for unauthorized commercial purposes, and any attempt to gain unauthorized access to Kuabo's systems.",
        },
        {
          title: "6. Application Content",
          text: "Information provided by Kuabo is for informational purposes only. It does not constitute professional legal, tax, financial, or medical advice. For any important decisions related to your immigration status, consult a licensed immigration attorney.",
        },
        {
          title: "7. Community Content",
          text: "Employer recommendations and reviews shared by users reflect the personal opinions of their authors. Kuabo cannot guarantee the accuracy of this information and disclaims any liability for decisions made based on it.",
        },
        {
          title: "8. Partner Advertising",
          text: "Kuabo may display advertising from commercial partners, clearly identified by the 'Kuabo Partner' badge. These sponsored contents are distinguished from editorial content in compliance with FTC rules. Kuabo is not responsible for partners' products or services.",
        },
        {
          title: "9. Personal Data",
          text: "We collect and process your personal data in accordance with our Privacy Policy. By using Kuabo, you expressly consent to such collection and processing. You can delete your account and all your data at any time from the settings.",
        },
        {
          title: "10. Intellectual Property",
          text: "The Kuabo application, its logo, design, source code, and content are protected by intellectual property laws. Any reproduction, modification, or distribution without prior written authorization from Kuabo is strictly prohibited.",
        },
        {
          title: "11. Limitation of Liability",
          text: "To the extent permitted by law, Kuabo cannot be held liable for indirect, incidental, or consequential damages resulting from the use or inability to use the application. The application is provided 'as is' without warranty of any kind.",
        },
        {
          title: "12. Termination",
          text: "Kuabo reserves the right to suspend or delete your account for violation of these terms, without notice. You may delete your account at any time from the application settings.",
        },
        {
          title: "13. Changes",
          text: "We reserve the right to modify these terms at any time. Important changes will be notified via the application or by email. Continued use after notification constitutes acceptance of the new terms.",
        },
        {
          title: "14. Governing Law",
          text: "These terms are governed by the laws of the State of Maryland, United States. Any dispute shall be subject to the jurisdiction of that State.",
        },
        {
          title: "15. Contact",
          text: "For any questions regarding these terms: support@kuabo.co\nKuabo · support@kuabo.co · kuabo.co",
        },
      ],
    },
    es: {
      title: "Términos de Servicio",
      updated: "Última actualización: Abril 2026",
      sections: [
        {
          title: "1. Aceptación de términos",
          text: "Al descargar, instalar o usar la aplicación Kuabo, aceptas plenamente estos Términos de Servicio. Si no estás de acuerdo con estos términos en su totalidad, debes dejar de usar la aplicación de inmediato.",
        },
        {
          title: "2. Descripción del servicio",
          text: "Kuabo es una aplicación móvil de apoyo para inmigrantes en los Estados Unidos. Proporciona información práctica (SSN, Green Card, banca, empleo, vivienda), seguimiento personalizado de tu proceso de instalación, un mapa comunitario opcional y recomendaciones de empleadores compartidas por la comunidad.",
        },
        {
          title: "3. Requisitos de acceso",
          text: "Debes tener al menos 13 años para usar Kuabo. Al crear una cuenta, certificas que la información proporcionada es precisa. Solo se permite una cuenta por persona.",
        },
        {
          title: "4. Cuenta de usuario",
          text: "Eres totalmente responsable de la seguridad de tu cuenta y contraseña. Cualquier actividad realizada desde tu cuenta es tu responsabilidad. Reporta de inmediato cualquier acceso no autorizado a support@kuabo.co.",
        },
        {
          title: "5. Uso aceptable",
          text: "Aceptas usar Kuabo exclusivamente para fines legales. Estrictamente prohibido: suplantación de identidad, publicar información falsa sobre empleadores, cualquier forma de acoso a otros miembros, usar la aplicación con fines comerciales no autorizados, y cualquier intento de acceso no autorizado a los sistemas de Kuabo.",
        },
        {
          title: "6. Contenido de la aplicación",
          text: "La información proporcionada por Kuabo es solo para fines informativos. No constituye asesoramiento legal, fiscal, financiero o médico profesional. Para cualquier decisión importante relacionada con tu estatus migratorio, consulta a un abogado de inmigración autorizado.",
        },
        {
          title: "7. Contenido comunitario",
          text: "Las recomendaciones de empleadores y reseñas compartidas por usuarios reflejan las opiniones personales de sus autores. Kuabo no puede garantizar la exactitud de esta información y no se responsabiliza de las decisiones tomadas con base en ella.",
        },
        {
          title: "8. Publicidad de socios",
          text: "Kuabo puede mostrar publicidad de socios comerciales, claramente identificada con el sello 'Socio Kuabo'. Estos contenidos patrocinados se distinguen del contenido editorial conforme a las reglas de la FTC. Kuabo no es responsable de los productos o servicios de los socios.",
        },
        {
          title: "9. Datos personales",
          text: "Recopilamos y procesamos tus datos personales de acuerdo con nuestra Política de Privacidad. Al usar Kuabo, consientes expresamente dicha recopilación y procesamiento. Puedes eliminar tu cuenta y todos tus datos en cualquier momento desde la configuración.",
        },
        {
          title: "10. Propiedad intelectual",
          text: "La aplicación Kuabo, su logo, diseño, código fuente y contenidos están protegidos por las leyes de propiedad intelectual. Cualquier reproducción, modificación o distribución sin autorización escrita previa de Kuabo está estrictamente prohibida.",
        },
        {
          title: "11. Limitación de responsabilidad",
          text: "En la medida permitida por la ley, Kuabo no puede ser responsable de daños indirectos, incidentales o consecuentes que resulten del uso o imposibilidad de uso de la aplicación. La aplicación se proporciona 'tal cual' sin garantía de ningún tipo.",
        },
        {
          title: "12. Terminación",
          text: "Kuabo se reserva el derecho de suspender o eliminar tu cuenta por violación de estos términos, sin previo aviso. Puedes eliminar tu cuenta en cualquier momento desde la configuración de la aplicación.",
        },
        {
          title: "13. Cambios",
          text: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios importantes se notificarán a través de la aplicación o por correo electrónico. El uso continuado tras la notificación constituye aceptación de los nuevos términos.",
        },
        {
          title: "14. Ley aplicable",
          text: "Estos términos se rigen por las leyes del Estado de Maryland, Estados Unidos. Cualquier disputa estará sujeta a la jurisdicción de ese Estado.",
        },
        {
          title: "15. Contacto",
          text: "Para cualquier pregunta sobre estos términos: support@kuabo.co\nKuabo · support@kuabo.co · kuabo.co",
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
