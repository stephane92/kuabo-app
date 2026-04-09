"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { CSSProperties } from "react";

type Lang = "fr" | "en" | "es";

type GuideStep = { title:string; desc:string; };
type GuideDoc  = { icon:string; label:string; desc:string; };
type GuideFAQ  = { q:string; a:string; };
type GuideLink = { icon:string; label:string; url:string; };

type Guide = {
  emoji:string; title:string; urgency:"critical"|"high"|"normal";
  cost:string; time:string; intro:string;
  docs:GuideDoc[]; steps:GuideStep[];
  warning:string; errors:string[];
  faq:GuideFAQ[]; links:GuideLink[];
  explorerFilter?:string; aiQuestion:string;
};

// ══════════════════════════════════════════════
// AUTRES GUIDES — navigation entre guides
// ══════════════════════════════════════════════
const ALL_GUIDES_META:Record<Lang,{id:string;emoji:string;label:string}[]> = {
  fr:[
    {id:"ssn",       emoji:"🪪", label:"SSN"},
    {id:"phone",     emoji:"📱", label:"SIM Card"},
    {id:"bank",      emoji:"🏦", label:"Compte bancaire"},
    {id:"greencard", emoji:"💳", label:"Green Card"},
    {id:"housing",   emoji:"🏠", label:"Logement"},
    {id:"job",       emoji:"💼", label:"Emploi"},
    {id:"license",   emoji:"🚗", label:"Permis de conduire"},
  ],
  en:[
    {id:"ssn",       emoji:"🪪", label:"SSN"},
    {id:"phone",     emoji:"📱", label:"SIM Card"},
    {id:"bank",      emoji:"🏦", label:"Bank Account"},
    {id:"greencard", emoji:"💳", label:"Green Card"},
    {id:"housing",   emoji:"🏠", label:"Housing"},
    {id:"job",       emoji:"💼", label:"Job"},
    {id:"license",   emoji:"🚗", label:"Driver's License"},
  ],
  es:[
    {id:"ssn",       emoji:"🪪", label:"SSN"},
    {id:"phone",     emoji:"📱", label:"SIM Card"},
    {id:"bank",      emoji:"🏦", label:"Cuenta bancaria"},
    {id:"greencard", emoji:"💳", label:"Green Card"},
    {id:"housing",   emoji:"🏠", label:"Vivienda"},
    {id:"job",       emoji:"💼", label:"Empleo"},
    {id:"license",   emoji:"🚗", label:"Licencia de conducir"},
  ],
};

// ══════════════════════════════════════════════
// GUIDES CONTENT
// ══════════════════════════════════════════════
const GUIDES:Record<string,Record<Lang,Guide>> = {

  ssn:{
    fr:{
      emoji:"🪪", title:"Numéro de Sécurité Sociale (SSN)",
      urgency:"critical", cost:"Gratuit", time:"1-2h au bureau + 2 semaines par courrier",
      intro:"Le SSN est ton numéro d'identité le plus important aux USA. Sans lui, tu ne peux pas travailler légalement, ouvrir un compte bancaire complet, ou obtenir un permis de conduire. C'est ta première priorité.",
      docs:[
        {icon:"🛂",label:"Passeport",         desc:"Original uniquement — pas de photocopie acceptée"},
        {icon:"🟩",label:"Visa immigrant (DV)",desc:"Le tampon dans ton passeport fait office de preuve"},
        {icon:"📄",label:"Formulaire I-94",   desc:"Imprime-le gratuitement sur i94.cbp.dhs.gov"},
        {icon:"🏠",label:"Preuve d'adresse US",desc:"Bail, facture, ou lettre d'hébergement"},
      ],
      steps:[
        {title:"Attends 10 jours après ton arrivée",         desc:"Le système DHS doit enregistrer ton entrée aux USA avant que le SSA puisse trouver ton dossier. Si tu y vas avant, ils ne pourront pas te servir."},
        {title:"Commence ta demande en ligne sur ssa.gov",    desc:"Va sur ssa.gov/ssnumber. Réponds aux questions pour savoir si tu peux finir en ligne ou si tu dois aller au bureau. Depuis janvier 2025, un rendez-vous est obligatoire."},
        {title:"Prends un rendez-vous",                       desc:"En ligne sur ssa.gov ou par téléphone au 1-800-772-1213 (lundi-vendredi 8h-19h). Appelle tôt le matin pour éviter l'attente."},
        {title:"Va au bureau SSA avec tes documents ORIGINAUX",desc:"Arrive 15 minutes avant ton rendez-vous. Apporte TOUS tes documents originaux — le SSA n'accepte aucune photocopie. L'entretien dure environ 20-45 minutes."},
        {title:"Reçois ta carte par courrier USPS",           desc:"Ta carte SSN arrive en 2 semaines. Configure USPS Informed Delivery (informeddelivery.usps.com) pour savoir exactement quand elle arrive. Garde-la dans un endroit sûr."},
      ],
      warning:"⚠️ Si le bureau SSA dit que ton entrée n'est pas dans leur système, reviens dans 2-3 jours. C'est normal les premières semaines. Ne panique pas.",
      errors:[
        "Amener des photocopies — le SSA les refuse systématiquement",
        "Y aller avant 10 jours après l'arrivée — le système DHS n'est pas encore mis à jour",
        "Aller sans rendez-vous — depuis 2025, c'est obligatoire",
        "Donner ton SSN par téléphone ou email — c'est une arnaque",
      ],
      faq:[
        {q:"Puis-je travailler sans SSN ?",    a:"Non. Tu dois attendre d'avoir ton SSN pour travailler légalement. Certains employeurs peuvent commencer le processus d'embauche mais ne peuvent pas te payer sans SSN."},
        {q:"Mon SSN est-il permanent ?",        a:"Oui. Ton SSN ne change jamais. C'est ton numéro pour toute ta vie aux USA."},
        {q:"Que faire si je perds ma carte SSN ?",a:"Va sur ssa.gov pour demander une carte de remplacement. C'est gratuit. Tu as droit à 3 remplacements par an et 10 au total dans ta vie."},
      ],
      links:[
        {icon:"🌐",label:"Commencer la demande SSN en ligne", url:"https://www.ssa.gov/ssnumber/"},
        {icon:"📍",label:"Trouver un bureau SSA",            url:"https://www.ssa.gov/locator/"},
        {icon:"📄",label:"Télécharger ton I-94",             url:"https://i94.cbp.dhs.gov"},
        {icon:"📮",label:"USPS Informed Delivery — gratuit", url:"https://informeddelivery.usps.com"},
        {icon:"📞",label:"Appeler le SSA",                   url:"tel:18007721213"},
      ],
      explorerFilter:"ssn",
      aiQuestion:"Comment obtenir mon SSN rapidement ?",
    },
    en:{
      emoji:"🪪", title:"Social Security Number (SSN)",
      urgency:"critical", cost:"Free", time:"1-2h at office + 2 weeks by mail",
      intro:"The SSN is your most important ID number in the USA. Without it, you cannot legally work, fully open a bank account, or get a driver's license. This is your top priority.",
      docs:[
        {icon:"🛂",label:"Passport",           desc:"Original only — no photocopies accepted"},
        {icon:"🟩",label:"Immigrant visa (DV)", desc:"The stamp in your passport serves as proof"},
        {icon:"📄",label:"Form I-94",           desc:"Print it free at i94.cbp.dhs.gov"},
        {icon:"🏠",label:"US address proof",    desc:"Lease, bill, or housing letter"},
      ],
      steps:[
        {title:"Wait 10 days after arrival",              desc:"The DHS system needs to record your US entry before the SSA can find your file. If you go earlier, they won't be able to help you."},
        {title:"Start your application online at ssa.gov", desc:"Go to ssa.gov/ssnumber. Answer questions to see if you can finish online or need to visit an office. Since January 2025, an appointment is required."},
        {title:"Schedule an appointment",                  desc:"Online at ssa.gov or by phone at 1-800-772-1213 (Mon-Fri 8am-7pm). Call early in the morning to avoid long wait times."},
        {title:"Go to the SSA office with ORIGINAL docs",  desc:"Arrive 15 minutes before your appointment. Bring ALL original documents — SSA does not accept photocopies. The interview takes about 20-45 minutes."},
        {title:"Receive your card by USPS mail",           desc:"Your SSN card arrives in 2 weeks. Set up USPS Informed Delivery (informeddelivery.usps.com) to know exactly when it arrives. Keep it somewhere safe."},
      ],
      warning:"⚠️ If the SSA office says your entry isn't in their system, come back in 2-3 days. This is normal in the first few weeks. Don't panic.",
      errors:[
        "Bringing photocopies — SSA systematically refuses them",
        "Going before 10 days after arrival — DHS system not yet updated",
        "Going without an appointment — required since 2025",
        "Giving your SSN by phone or email — that's a scam",
      ],
      faq:[
        {q:"Can I work without an SSN?",    a:"No. You must wait for your SSN to work legally. Some employers can start the hiring process but cannot pay you without an SSN."},
        {q:"Is my SSN permanent?",           a:"Yes. Your SSN never changes. It's your number for life in the USA."},
        {q:"What if I lose my SSN card?",    a:"Go to ssa.gov to request a replacement card. It's free. You're allowed 3 replacements per year and 10 total in your lifetime."},
      ],
      links:[
        {icon:"🌐",label:"Start SSN application online",   url:"https://www.ssa.gov/ssnumber/"},
        {icon:"📍",label:"Find an SSA office",             url:"https://www.ssa.gov/locator/"},
        {icon:"📄",label:"Download your I-94",             url:"https://i94.cbp.dhs.gov"},
        {icon:"📮",label:"USPS Informed Delivery — free",  url:"https://informeddelivery.usps.com"},
        {icon:"📞",label:"Call SSA",                       url:"tel:18007721213"},
      ],
      explorerFilter:"ssn",
      aiQuestion:"How do I get my SSN quickly?",
    },
    es:{
      emoji:"🪪", title:"Número de Seguro Social (SSN)",
      urgency:"critical", cost:"Gratis", time:"1-2h en oficina + 2 semanas por correo",
      intro:"El SSN es tu número de identidad más importante en EE.UU. Sin él, no puedes trabajar legalmente, abrir una cuenta bancaria completa, ni obtener una licencia de conducir. Esta es tu primera prioridad.",
      docs:[
        {icon:"🛂",label:"Pasaporte",              desc:"Solo original — no se aceptan fotocopias"},
        {icon:"🟩",label:"Visa inmigrante (DV)",   desc:"El sello en tu pasaporte sirve como prueba"},
        {icon:"📄",label:"Formulario I-94",        desc:"Imprímelo gratis en i94.cbp.dhs.gov"},
        {icon:"🏠",label:"Prueba de dirección US", desc:"Contrato, factura o carta de alojamiento"},
      ],
      steps:[
        {title:"Espera 10 días después de llegar",           desc:"El sistema DHS necesita registrar tu entrada antes de que SSA pueda encontrar tu expediente. Si vas antes, no podrán atenderte."},
        {title:"Comienza tu solicitud en línea en ssa.gov",  desc:"Ve a ssa.gov/ssnumber. Responde las preguntas para ver si puedes terminar en línea o necesitas visitar una oficina. Desde enero 2025, se requiere cita."},
        {title:"Programa una cita",                          desc:"En línea en ssa.gov o por teléfono al 1-800-772-1213 (lunes-viernes 8am-7pm). Llama temprano para evitar largas esperas."},
        {title:"Ve a la oficina SSA con documentos ORIGINALES",desc:"Llega 15 minutos antes de tu cita. Trae TODOS los documentos originales — SSA no acepta fotocopias. La entrevista dura unos 20-45 minutos."},
        {title:"Recibe tu tarjeta por correo USPS",          desc:"Tu tarjeta SSN llega en 2 semanas. Configura USPS Informed Delivery (informeddelivery.usps.com) para saber exactamente cuándo llega."},
      ],
      warning:"⚠️ Si la oficina SSA dice que tu entrada no está en su sistema, regresa en 2-3 días. Esto es normal en las primeras semanas. No te preocupes.",
      errors:[
        "Traer fotocopias — SSA las rechaza sistemáticamente",
        "Ir antes de 10 días de llegada — el sistema DHS aún no está actualizado",
        "Ir sin cita — obligatorio desde 2025",
        "Dar tu SSN por teléfono o email — eso es una estafa",
      ],
      faq:[
        {q:"¿Puedo trabajar sin SSN?",       a:"No. Debes esperar tu SSN para trabajar legalmente. Algunos empleadores pueden iniciar el proceso pero no pueden pagarte sin SSN."},
        {q:"¿Mi SSN es permanente?",          a:"Sí. Tu SSN nunca cambia. Es tu número de por vida en EE.UU."},
        {q:"¿Qué pasa si pierdo mi tarjeta?", a:"Ve a ssa.gov para solicitar una tarjeta de reemplazo. Es gratis. Tienes derecho a 3 reemplazos por año y 10 en total en tu vida."},
      ],
      links:[
        {icon:"🌐",label:"Iniciar solicitud SSN en línea",  url:"https://www.ssa.gov/ssnumber/"},
        {icon:"📍",label:"Encontrar oficina SSA",           url:"https://www.ssa.gov/locator/"},
        {icon:"📄",label:"Descargar tu I-94",               url:"https://i94.cbp.dhs.gov"},
        {icon:"📮",label:"USPS Informed Delivery — gratis", url:"https://informeddelivery.usps.com"},
        {icon:"📞",label:"Llamar al SSA",                   url:"tel:18007721213"},
      ],
      explorerFilter:"ssn",
      aiQuestion:"¿Cómo obtengo mi SSN rápidamente?",
    },
  },

  phone:{
    fr:{
      emoji:"📱", title:"Carte SIM / Numéro de téléphone US",
      urgency:"critical", cost:"$15-$45 premier mois", time:"15-30 minutes en magasin",
      intro:"Un numéro de téléphone américain est indispensable dès le premier jour. Tu en as besoin pour créer des comptes, recevoir des codes de vérification, appeler le SSA, et utiliser Uber/Lyft.",
      docs:[
        {icon:"🛂",label:"Passeport",                desc:"Parfois demandé — pas toujours obligatoire"},
        {icon:"💳",label:"Carte de débit internationale",desc:"Visa ou Mastercard acceptées partout"},
        {icon:"📱",label:"Téléphone débloqué",       desc:"Ton téléphone doit être unlocked pour une SIM US"},
      ],
      steps:[
        {title:"Vérifie que ton téléphone est débloqué",desc:"Si tu as acheté ton téléphone avec un opérateur (Orange, MTN...) il peut être verrouillé. Contacte ton opérateur avant de partir. Un iPhone acheté chez Apple est toujours débloqué."},
        {title:"Choisis un plan prépayé — pas de contrat",desc:"Les plans prépayés ne nécessitent pas de SSN ni de credit score. T-Mobile ($10-$50/mois), Mint Mobile ($15/mois sur réseau T-Mobile), Visible ($25/mois réseau Verizon)."},
        {title:"Achète ta SIM dès l'aéroport ou en magasin",desc:"T-Mobile, AT&T, Verizon ont des kiosques dans la plupart des aéroports. Sinon : Walmart, Target, CVS, ou Best Buy. Tu peux aussi commander en ligne avant ton départ."},
        {title:"Active ta SIM",desc:"Suis les instructions dans l'emballage ou en ligne. L'activation prend 5-10 minutes. Tu auras un numéro américain immédiatement."},
        {title:"Passe à un plan postpayé plus tard",desc:"Une fois que tu as ton SSN et un credit score, tu peux passer à un plan postpayé moins cher avec plus de données."},
      ],
      warning:"⚠️ Ne prends pas un plan postpayé sans SSN — la plupart des opérateurs demanderont un dépôt de $200-$500 ou refuseront.",
      errors:[
        "Acheter un téléphone verrouillé (locked) — ta SIM ne fonctionnera pas",
        "Prendre un plan postpayé sans SSN — dépôt énorme requis",
        "Oublier de vérifier la couverture réseau dans ta ville",
        "Acheter sur des sites non officiels — risque d'arnaque",
      ],
      faq:[
        {q:"T-Mobile ou Mint Mobile — quelle différence ?",a:"Mint Mobile utilise le réseau T-Mobile mais est moins cher. T-Mobile a de meilleures boutiques physiques. Mint est idéal si tu peux gérer ta SIM seul."},
        {q:"Puis-je garder mon numéro étranger ?",          a:"Tu peux garder ton ancien numéro actif pour WhatsApp avec ta carte SIM étrangère, et utiliser ta SIM US comme numéro principal."},
        {q:"Qu'est-ce qu'un eSIM ?",                        a:"Un eSIM est une SIM numérique intégrée dans ton téléphone. Pas besoin de carte physique. iPhone 14 et plus récents supportent l'eSIM."},
      ],
      links:[
        {icon:"🌐",label:"Mint Mobile — $15/mois",         url:"https://www.mintmobile.com"},
        {icon:"🌐",label:"T-Mobile prépayé",               url:"https://www.t-mobile.com/prepaid-phone"},
        {icon:"🌐",label:"Visible — $25/mois illimité",    url:"https://www.visible.com"},
        {icon:"🌐",label:"Vérifier si ton téléphone est débloqué",url:"https://www.t-mobile.com/support/account/unlock-your-device"},
      ],
      aiQuestion:"Quelle SIM prépayée choisir sans SSN aux USA ?",
    },
    en:{
      emoji:"📱", title:"SIM Card / US Phone Number",
      urgency:"critical", cost:"$15-$45 first month", time:"15-30 minutes in store",
      intro:"A US phone number is essential from day one. You need it to create accounts, receive verification codes, call the SSA, and use Uber/Lyft.",
      docs:[
        {icon:"🛂",label:"Passport",                  desc:"Sometimes requested — not always required"},
        {icon:"💳",label:"International debit card",  desc:"Visa or Mastercard accepted everywhere"},
        {icon:"📱",label:"Unlocked phone",            desc:"Your phone must be unlocked to accept a US SIM"},
      ],
      steps:[
        {title:"Check your phone is unlocked",        desc:"If you bought your phone with a carrier, it may be locked. Contact your carrier before leaving. iPhones bought directly from Apple are always unlocked."},
        {title:"Choose a prepaid plan — no contract", desc:"Prepaid plans don't require SSN or credit score. T-Mobile ($10-$50/month), Mint Mobile ($15/month on T-Mobile network), Visible ($25/month Verizon network)."},
        {title:"Buy your SIM at the airport or store", desc:"T-Mobile, AT&T, Verizon have kiosks at most airports. Otherwise: Walmart, Target, CVS, or Best Buy. You can also order online before departure."},
        {title:"Activate your SIM",                   desc:"Follow the instructions in the package or online. Activation takes 5-10 minutes. You'll have a US number immediately."},
        {title:"Switch to a postpaid plan later",     desc:"Once you have your SSN and a credit score, you can switch to a cheaper postpaid plan with more data."},
      ],
      warning:"⚠️ Don't get a postpaid plan without SSN — most carriers will ask for a $200-$500 deposit or refuse.",
      errors:[
        "Buying a locked phone — your SIM won't work",
        "Getting a postpaid plan without SSN — huge deposit required",
        "Forgetting to check network coverage in your city",
        "Buying from unofficial sites — risk of scam",
      ],
      faq:[
        {q:"T-Mobile or Mint Mobile — what's the difference?",a:"Mint Mobile uses T-Mobile's network but is cheaper. T-Mobile has better physical stores. Mint is ideal if you can manage your SIM on your own."},
        {q:"Can I keep my foreign number?",                    a:"You can keep your old number active for WhatsApp with your foreign SIM, and use your US SIM as your main number."},
        {q:"What is an eSIM?",                                 a:"An eSIM is a digital SIM built into your phone. No physical card needed. iPhone 14 and newer support eSIM."},
      ],
      links:[
        {icon:"🌐",label:"Mint Mobile — $15/month",           url:"https://www.mintmobile.com"},
        {icon:"🌐",label:"T-Mobile prepaid",                  url:"https://www.t-mobile.com/prepaid-phone"},
        {icon:"🌐",label:"Visible — $25/month unlimited",     url:"https://www.visible.com"},
        {icon:"🌐",label:"Check if your phone is unlocked",   url:"https://www.t-mobile.com/support/account/unlock-your-device"},
      ],
      aiQuestion:"Which prepaid SIM to choose without SSN in the USA?",
    },
    es:{
      emoji:"📱", title:"SIM Card / Número de teléfono en EE.UU.",
      urgency:"critical", cost:"$15-$45 primer mes", time:"15-30 minutos en tienda",
      intro:"Un número de teléfono americano es esencial desde el primer día. Lo necesitas para crear cuentas, recibir códigos de verificación, llamar al SSA y usar Uber/Lyft.",
      docs:[
        {icon:"🛂",label:"Pasaporte",                    desc:"A veces solicitado — no siempre obligatorio"},
        {icon:"💳",label:"Tarjeta de débito internacional",desc:"Visa o Mastercard aceptadas en todas partes"},
        {icon:"📱",label:"Teléfono desbloqueado",        desc:"Tu teléfono debe estar desbloqueado para SIM de EE.UU."},
      ],
      steps:[
        {title:"Verifica que tu teléfono esté desbloqueado",desc:"Si compraste tu teléfono con un operador, puede estar bloqueado. Contacta a tu operador antes de salir."},
        {title:"Elige un plan prepago — sin contrato",      desc:"Los planes prepagos no requieren SSN ni puntaje crediticio. T-Mobile ($10-$50/mes), Mint Mobile ($15/mes en red T-Mobile), Visible ($25/mes red Verizon)."},
        {title:"Compra tu SIM en el aeropuerto o tienda",   desc:"T-Mobile, AT&T, Verizon tienen quioscos en la mayoría de los aeropuertos. Si no: Walmart, Target, CVS o Best Buy."},
        {title:"Activa tu SIM",                             desc:"Sigue las instrucciones del paquete o en línea. La activación toma 5-10 minutos. Tendrás un número de EE.UU. inmediatamente."},
        {title:"Cambia a un plan postpago más tarde",       desc:"Una vez que tengas tu SSN y puntaje crediticio, puedes cambiar a un plan postpago más económico."},
      ],
      warning:"⚠️ No tomes un plan postpago sin SSN — la mayoría de los operadores pedirán un depósito de $200-$500 o rechazarán.",
      errors:[
        "Comprar un teléfono bloqueado — tu SIM no funcionará",
        "Tomar un plan postpago sin SSN — se requiere depósito enorme",
        "Olvidar verificar la cobertura de red en tu ciudad",
        "Comprar en sitios no oficiales — riesgo de estafa",
      ],
      faq:[
        {q:"¿T-Mobile o Mint Mobile — cuál es la diferencia?",a:"Mint Mobile usa la red de T-Mobile pero es más barato. T-Mobile tiene mejores tiendas físicas. Mint es ideal si puedes gestionar tu SIM solo."},
        {q:"¿Puedo conservar mi número extranjero?",           a:"Puedes mantener tu número antiguo activo para WhatsApp con tu SIM extranjera y usar tu SIM de EE.UU. como número principal."},
        {q:"¿Qué es un eSIM?",                                 a:"Un eSIM es una SIM digital integrada en tu teléfono. No se necesita tarjeta física. iPhone 14 y más recientes soportan eSIM."},
      ],
      links:[
        {icon:"🌐",label:"Mint Mobile — $15/mes",             url:"https://www.mintmobile.com"},
        {icon:"🌐",label:"T-Mobile prepago",                  url:"https://www.t-mobile.com/prepaid-phone"},
        {icon:"🌐",label:"Visible — $25/mes ilimitado",       url:"https://www.visible.com"},
        {icon:"🌐",label:"Verificar si tu teléfono está desbloqueado",url:"https://www.t-mobile.com/support/account/unlock-your-device"},
      ],
      aiQuestion:"¿Qué SIM prepago elegir sin SSN en EE.UU.?",
    },
  },

  bank:{
    fr:{
      emoji:"🏦", title:"Ouvrir un compte bancaire",
      urgency:"high", cost:"$0-$100 dépôt initial", time:"30-45 minutes en agence",
      intro:"Un compte bancaire américain est essentiel pour recevoir ton salaire, payer ton loyer, et commencer à construire ton credit score. Chase et Bank of America sont les meilleures options pour les nouveaux immigrants.",
      docs:[
        {icon:"🛂",label:"Passeport original",          desc:"Document principal d'identification"},
        {icon:"🟩",label:"Visa immigrant / Green Card", desc:"Preuve de ton statut légal aux USA"},
        {icon:"🏠",label:"Preuve d'adresse US",         desc:"Bail, facture, ou lettre d'hébergement"},
        {icon:"📱",label:"Numéro de téléphone US",      desc:"La banque enverra des codes de vérification"},
        {icon:"🪪",label:"SSN (si tu l'as déjà)",       desc:"Pas obligatoire mais facilite l'ouverture"},
      ],
      steps:[
        {title:"Choisis ta banque",                   desc:"Chase (4700+ agences) et Bank of America sont les meilleures pour les immigrants — elles acceptent les clients sans SSN avec juste le passeport et une adresse US."},
        {title:"Prends rendez-vous en ligne",          desc:"Va sur chase.com ou bankofamerica.com pour prendre rendez-vous. Les agences dans les zones avec beaucoup d'immigrants sont plus habituées au processus."},
        {title:"Va en agence avec tous tes documents", desc:"Tu dois aller en personne — tu ne peux pas ouvrir un compte en ligne sans SSN. Dis au conseiller que tu es un nouvel immigrant DV Lottery."},
        {title:"Ouvre un compte chèques (checking)",  desc:"Commence par un checking account pour les dépenses quotidiennes. Le dépôt initial est généralement $25-$100."},
        {title:"Demande une secured credit card",     desc:"Dès que tu as ton compte, demande une secured credit card. C'est le meilleur moyen de commencer à construire ton credit score. Dépôt requis : $200-$500."},
      ],
      warning:"⚠️ Depuis juin 2025, les banques ont plus de flexibilité pour vérifier l'identité des immigrants. Si une agence te refuse, essaie une autre agence de la même banque.",
      errors:[
        "Essayer d'ouvrir un compte en ligne sans SSN — impossible",
        "Oublier une preuve d'adresse US — obligatoire",
        "Ne pas demander de secured credit card — tu rates la chance de construire ton credit score",
        "Garder tout ton argent en cash — dangereux et non assurable",
      ],
      faq:[
        {q:"Quelle est la différence entre checking et savings ?",a:"Le checking account est pour les dépenses quotidiennes. Le savings account est pour épargner. Commence par le checking et ajoute un savings plus tard."},
        {q:"Puis-je ouvrir un compte sans SSN ?",                 a:"Oui. Chase, Bank of America, Wells Fargo acceptent juste le passeport + adresse US."},
        {q:"Qu'est-ce que le credit score ?",                     a:"C'est une note de 300 à 850 qui mesure ta fiabilité financière. Sans credit score, tu ne peux pas louer un appartement ou acheter une voiture à crédit."},
      ],
      links:[
        {icon:"🌐",label:"Ouvrir un compte Chase",           url:"https://www.chase.com/personal/checking"},
        {icon:"🌐",label:"Ouvrir un compte Bank of America", url:"https://www.bankofamerica.com/checking"},
        {icon:"🌐",label:"Wells Fargo pour immigrants",      url:"https://www.wellsfargo.com/checking"},
        {icon:"🌐",label:"Comprendre le credit score",       url:"https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/"},
      ],
      explorerFilter:"bank",
      aiQuestion:"Comment ouvrir un compte bancaire sans SSN aux USA ?",
    },
    en:{
      emoji:"🏦", title:"Open a Bank Account",
      urgency:"high", cost:"$0-$100 initial deposit", time:"30-45 minutes at branch",
      intro:"A US bank account is essential to receive your salary, pay rent, and start building your credit score. Chase and Bank of America are the best options for new immigrants.",
      docs:[
        {icon:"🛂",label:"Original passport",           desc:"Primary identification document"},
        {icon:"🟩",label:"Immigrant visa / Green Card", desc:"Proof of your legal status in the USA"},
        {icon:"🏠",label:"US address proof",            desc:"Lease, bill, or housing letter"},
        {icon:"📱",label:"US phone number",             desc:"The bank will send verification codes"},
        {icon:"🪪",label:"SSN (if you have it)",        desc:"Not required but makes opening easier"},
      ],
      steps:[
        {title:"Choose your bank",                    desc:"Chase (4700+ branches) and Bank of America are best for immigrants — they accept clients without SSN with just a passport and US address."},
        {title:"Schedule an appointment online",       desc:"Go to chase.com or bankofamerica.com to schedule at the nearest branch. Branches in immigrant-heavy areas are more familiar with the process."},
        {title:"Go to the branch with all your docs",  desc:"You must go in person — you can't open an account online without an SSN. Tell the advisor you're a new DV Lottery immigrant."},
        {title:"Open a checking account",              desc:"Start with a checking account for daily expenses. The initial deposit is usually $25-$100."},
        {title:"Request a secured credit card",        desc:"Once you have your account, request a secured credit card. It's the best way to start building your US credit score. Required deposit: $200-$500."},
      ],
      warning:"⚠️ Since June 2025, banks have more flexibility to verify immigrant identity. If one branch refuses you, try another branch of the same bank.",
      errors:[
        "Trying to open an account online without SSN — impossible",
        "Forgetting US address proof — required",
        "Not requesting a secured credit card — you miss the chance to build credit score",
        "Keeping all your money in cash — dangerous and not insurable",
      ],
      faq:[
        {q:"What's the difference between checking and savings?",a:"Checking account is for daily spending. Savings account is for saving. Start with checking and add savings later."},
        {q:"Can I open an account without SSN?",                 a:"Yes. Chase, Bank of America, Wells Fargo accept just passport + US address."},
        {q:"What is a credit score?",                            a:"It's a score from 300 to 850 that measures your financial reliability. Without a credit score, you can't rent an apartment or buy a car on credit."},
      ],
      links:[
        {icon:"🌐",label:"Open a Chase account",           url:"https://www.chase.com/personal/checking"},
        {icon:"🌐",label:"Open a Bank of America account", url:"https://www.bankofamerica.com/checking"},
        {icon:"🌐",label:"Wells Fargo for immigrants",     url:"https://www.wellsfargo.com/checking"},
        {icon:"🌐",label:"Understanding credit score",     url:"https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/"},
      ],
      explorerFilter:"bank",
      aiQuestion:"How to open a bank account without SSN in the USA?",
    },
    es:{
      emoji:"🏦", title:"Abrir una cuenta bancaria",
      urgency:"high", cost:"$0-$100 depósito inicial", time:"30-45 minutos en sucursal",
      intro:"Una cuenta bancaria estadounidense es esencial para recibir tu salario, pagar el alquiler y empezar a construir tu historial crediticio.",
      docs:[
        {icon:"🛂",label:"Pasaporte original",          desc:"Documento principal de identificación"},
        {icon:"🟩",label:"Visa inmigrante / Green Card",desc:"Prueba de tu estatus legal en EE.UU."},
        {icon:"🏠",label:"Prueba de dirección en EE.UU.",desc:"Contrato, factura o carta"},
        {icon:"📱",label:"Número de teléfono de EE.UU.",desc:"El banco enviará códigos de verificación"},
        {icon:"🪪",label:"SSN (si ya lo tienes)",       desc:"No obligatorio pero facilita la apertura"},
      ],
      steps:[
        {title:"Elige tu banco",                       desc:"Chase (4700+ sucursales) y Bank of America son los mejores para inmigrantes — aceptan clientes sin SSN solo con pasaporte y dirección de EE.UU."},
        {title:"Programa una cita en línea",           desc:"Ve a chase.com o bankofamerica.com para programar una cita en la sucursal más cercana."},
        {title:"Ve a la sucursal con todos tus docs",  desc:"Debes ir en persona — no puedes abrir una cuenta en línea sin SSN. Dile al asesor que eres un nuevo inmigrante de DV Lottery."},
        {title:"Abre una cuenta corriente (checking)", desc:"Empieza con una cuenta corriente para gastos diarios. El depósito inicial suele ser $25-$100."},
        {title:"Solicita una tarjeta de crédito asegurada",desc:"Una vez que tengas tu cuenta, solicita una tarjeta de crédito asegurada. Es la mejor manera de comenzar a construir tu historial crediticio. Depósito: $200-$500."},
      ],
      warning:"⚠️ Desde junio 2025, los bancos tienen más flexibilidad para verificar la identidad de los inmigrantes. Si una sucursal te rechaza, prueba otra sucursal del mismo banco.",
      errors:[
        "Intentar abrir cuenta en línea sin SSN — imposible",
        "Olvidar prueba de dirección de EE.UU. — obligatoria",
        "No solicitar tarjeta de crédito asegurada — pierdes la oportunidad de construir crédito",
        "Guardar todo el dinero en efectivo — peligroso y no asegurable",
      ],
      faq:[
        {q:"¿Cuál es la diferencia entre cuenta corriente y de ahorros?",a:"La cuenta corriente es para gastos diarios. La cuenta de ahorros es para ahorrar. Empieza con la corriente y agrega ahorros después."},
        {q:"¿Puedo abrir una cuenta sin SSN?",                           a:"Sí. Chase, Bank of America, Wells Fargo aceptan solo pasaporte + dirección de EE.UU."},
        {q:"¿Qué es el puntaje de crédito?",                             a:"Es una puntuación de 300 a 850 que mide tu confiabilidad financiera. Sin puntaje de crédito, no puedes alquilar un apartamento ni comprar un auto a crédito."},
      ],
      links:[
        {icon:"🌐",label:"Abrir cuenta Chase",           url:"https://www.chase.com/personal/checking"},
        {icon:"🌐",label:"Abrir cuenta Bank of America", url:"https://www.bankofamerica.com/checking"},
        {icon:"🌐",label:"Wells Fargo para inmigrantes", url:"https://www.wellsfargo.com/checking"},
        {icon:"🌐",label:"Entender el puntaje de crédito",url:"https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/"},
      ],
      explorerFilter:"bank",
      aiQuestion:"¿Cómo abrir una cuenta bancaria sin SSN en EE.UU.?",
    },
  },

  greencard:{
    fr:{
      emoji:"💳", title:"Green Card physique",
      urgency:"high", cost:"$235 frais USCIS si pas encore payé", time:"2-3 semaines par courrier USPS",
      intro:"Ta Green Card physique (Form I-551) est la preuve officielle que tu es résident permanent légal des USA. Elle arrive par courrier USPS. Tu dois avoir payé les frais USCIS de $235 pour la recevoir.",
      docs:[
        {icon:"💳",label:"A-Number (Alien Number)", desc:"Commence par 'A' — sur ton visa dans le passeport"},
        {icon:"📋",label:"DOS Case ID",             desc:"Sur ton visa — 4 chiffres + 2 lettres + 5 chiffres"},
        {icon:"🏠",label:"Adresse US confirmée",   desc:"L'adresse que tu as donnée à l'ambassade ou au CBP"},
      ],
      steps:[
        {title:"Vérifie si tu as payé les $235 USCIS", desc:"Si tu as payé avant de partir sur uscis.gov/immigrant-fee → ta Green Card est en production. Si pas encore payé → fais-le MAINTENANT. Sans ce paiement, ta Green Card ne sera jamais produite."},
        {title:"Paye les frais si pas encore fait",     desc:"Va sur uscis.gov/immigrant-fee. Tu as besoin de ton A-Number et DOS Case ID. Accepte carte crédit, débit, ou compte bancaire US. Coût : $235 par personne."},
        {title:"Configure USPS Informed Delivery",      desc:"Crée un compte gratuit sur informeddelivery.usps.com. Tu recevras une photo de chaque courrier AVANT qu'il arrive dans ta boîte. Tu sauras exactement quand ta Green Card arrive."},
        {title:"Attends 2-3 semaines",                 desc:"Ta Green Card sera envoyée à l'adresse que tu as donnée à l'ambassade lors de ton interview, ou à l'agent CBP à ton arrivée aux USA."},
        {title:"Mets à jour ton adresse si tu as déménagé",desc:"Si tu as déménagé depuis l'interview → mets à jour ton adresse IMMÉDIATEMENT sur uscis.gov/addresschange. Sinon ta Green Card ira à la mauvaise adresse."},
      ],
      warning:"⚠️ Ta Green Card n'est valide que 10 ans. Tu devras la renouveler (Form I-90) avant expiration. Garde-la en lieu sûr — ne la porte jamais dans ton portefeuille.",
      errors:[
        "Ne pas payer les $235 USCIS — ta Green Card ne sera jamais produite",
        "Ne pas mettre à jour ton adresse si tu as déménagé",
        "Ouvrir l'enveloppe scellée de l'ambassade — interdite avant l'arrivée aux USA",
        "Perdre ta Green Card sans signaler rapidement — commande un remplacement I-90",
      ],
      faq:[
        {q:"Que faire si je ne reçois pas ma Green Card après 90 jours ?",a:"Contacte l'USCIS via uscis.gov/e-request ou appelle le 1-800-375-5283. Vérifie d'abord que ton adresse est correcte dans le système."},
        {q:"Ma Green Card est-elle valide en attendant la carte physique ?",a:"Oui ! Le tampon I-551 dans ton passeport est une preuve de résidence permanente valable pendant 1 an. Tu peux travailler et voyager avec ce tampon."},
        {q:"Puis-je voyager hors des USA avant de recevoir ma Green Card ?", a:"Oui, avec le tampon I-551 dans ton passeport. Mais informe l'USCIS si ton absence dure plus de 6 mois."},
      ],
      links:[
        {icon:"🌐",label:"Payer les frais USCIS $235",  url:"https://www.uscis.gov/forms/filing-fees/uscis-immigrant-fee"},
        {icon:"🌐",label:"Mettre à jour ton adresse",   url:"https://www.uscis.gov/addresschange"},
        {icon:"📮",label:"USPS Informed Delivery",      url:"https://informeddelivery.usps.com"},
        {icon:"🌐",label:"Statut de ta Green Card",     url:"https://www.uscis.gov/e-request"},
        {icon:"🌐",label:"Renouveler la Green Card (I-90)",url:"https://www.uscis.gov/i-90"},
      ],
      aiQuestion:"Comment suivre l'arrivée de ma Green Card par courrier ?",
    },
    en:{
      emoji:"💳", title:"Physical Green Card",
      urgency:"high", cost:"$235 USCIS fee if not paid yet", time:"2-3 weeks by USPS mail",
      intro:"Your physical Green Card (Form I-551) is official proof you are a legal permanent resident of the USA. It arrives by USPS mail. You must have paid the $235 USCIS fee to receive it.",
      docs:[
        {icon:"💳",label:"A-Number (Alien Number)",desc:"Starts with 'A' — on your visa in your passport"},
        {icon:"📋",label:"DOS Case ID",           desc:"On your visa — 4 digits + 2 letters + 5 digits"},
        {icon:"🏠",label:"Confirmed US address",  desc:"The address you gave at the embassy or to CBP"},
      ],
      steps:[
        {title:"Check if you already paid the $235 USCIS fee",desc:"If you paid before leaving on uscis.gov/immigrant-fee → your Green Card is already being produced. If not → do it NOW. Without this payment, your Green Card will never be produced."},
        {title:"Pay the USCIS fee if not done yet",           desc:"Go to uscis.gov/immigrant-fee. You'll need your A-Number and DOS Case ID. Accepts credit card, debit, or US bank account. Cost: $235 per person."},
        {title:"Set up USPS Informed Delivery",               desc:"Create a free account at informeddelivery.usps.com. You'll receive a photo of each piece of mail BEFORE it arrives in your mailbox. You'll know the exact day your Green Card arrives."},
        {title:"Wait 2-3 weeks",                              desc:"Your Green Card will be sent to the address you gave at the embassy during your interview, or to the CBP officer when you arrived in the USA."},
        {title:"Update your address if you've moved",         desc:"If you've moved since the interview → update your address IMMEDIATELY at uscis.gov/addresschange. Otherwise your Green Card will go to the wrong address."},
      ],
      warning:"⚠️ Your Green Card is only valid for 10 years. You'll need to renew it (Form I-90) before it expires. Keep it somewhere safe — don't carry it in your wallet daily.",
      errors:[
        "Not paying the $235 USCIS fee — your Green Card will never be produced",
        "Not updating your address if you've moved",
        "Opening the sealed embassy envelope — forbidden before arriving in the USA",
        "Losing your Green Card without quickly reporting it — order a replacement I-90",
      ],
      faq:[
        {q:"What if I don't receive my Green Card after 90 days?",a:"Contact USCIS via uscis.gov/e-request or call 1-800-375-5283. First check that your address is correct in the system."},
        {q:"Is my Green Card valid while waiting for the physical card?",a:"Yes! The I-551 stamp in your passport is valid proof of permanent residence for 1 year. You can work and travel with this stamp."},
        {q:"Can I travel outside the USA before receiving my Green Card?",a:"Yes, with the I-551 stamp in your passport. But inform USCIS if your absence lasts more than 6 months."},
      ],
      links:[
        {icon:"🌐",label:"Pay USCIS fee $235",       url:"https://www.uscis.gov/forms/filing-fees/uscis-immigrant-fee"},
        {icon:"🌐",label:"Update your USCIS address", url:"https://www.uscis.gov/addresschange"},
        {icon:"📮",label:"USPS Informed Delivery",    url:"https://informeddelivery.usps.com"},
        {icon:"🌐",label:"Check Green Card status",   url:"https://www.uscis.gov/e-request"},
        {icon:"🌐",label:"Renew Green Card (I-90)",   url:"https://www.uscis.gov/i-90"},
      ],
      aiQuestion:"How to track my Green Card delivery by mail?",
    },
    es:{
      emoji:"💳", title:"Green Card física",
      urgency:"high", cost:"$235 tarifa USCIS si no pagado", time:"2-3 semanas por correo USPS",
      intro:"Tu Green Card física (Formulario I-551) es la prueba oficial de que eres residente permanente legal de EE.UU. Llega por correo USPS. Debes haber pagado la tarifa USCIS de $235 para recibirla.",
      docs:[
        {icon:"💳",label:"A-Number (Alien Number)",desc:"Comienza con 'A' — en tu visa en el pasaporte"},
        {icon:"📋",label:"DOS Case ID",           desc:"En tu visa — 4 dígitos + 2 letras + 5 dígitos"},
        {icon:"🏠",label:"Dirección confirmada",  desc:"La dirección que diste en la embajada o al CBP"},
      ],
      steps:[
        {title:"Verifica si ya pagaste los $235 de USCIS",desc:"Si pagaste antes de salir en uscis.gov/immigrant-fee → tu Green Card ya está en producción. Si no → hazlo AHORA. Sin este pago, tu Green Card nunca se producirá."},
        {title:"Paga la tarifa USCIS si no lo has hecho", desc:"Ve a uscis.gov/immigrant-fee. Necesitarás tu A-Number y DOS Case ID. Acepta tarjeta de crédito, débito o cuenta bancaria de EE.UU. Costo: $235 por persona."},
        {title:"Configura USPS Informed Delivery",        desc:"Crea una cuenta gratuita en informeddelivery.usps.com. Recibirás una foto de cada pieza de correo ANTES de que llegue a tu buzón."},
        {title:"Espera 2-3 semanas",                      desc:"Tu Green Card se enviará a la dirección que diste en la embajada durante tu entrevista, o al oficial CBP cuando llegaste a EE.UU."},
        {title:"Actualiza tu dirección si te has mudado", desc:"Si te has mudado desde la entrevista → actualiza tu dirección INMEDIATAMENTE en uscis.gov/addresschange."},
      ],
      warning:"⚠️ Tu Green Card solo es válida por 10 años. Deberás renovarla (Formulario I-90) antes de que expire. Guárdala en un lugar seguro — no la lleves en tu billetera.",
      errors:[
        "No pagar los $235 de USCIS — tu Green Card nunca se producirá",
        "No actualizar tu dirección si te has mudado",
        "Abrir el sobre sellado de la embajada — prohibido antes de llegar a EE.UU.",
        "Perder tu Green Card sin reportarlo rápidamente",
      ],
      faq:[
        {q:"¿Qué pasa si no recibo mi Green Card después de 90 días?",a:"Contacta a USCIS a través de uscis.gov/e-request o llama al 1-800-375-5283."},
        {q:"¿Es válida mi Green Card mientras espero la tarjeta física?",a:"¡Sí! El sello I-551 en tu pasaporte es prueba válida de residencia permanente por 1 año."},
        {q:"¿Puedo viajar fuera de EE.UU. antes de recibir mi Green Card?",a:"Sí, con el sello I-551 en tu pasaporte. Pero informa a USCIS si tu ausencia dura más de 6 meses."},
      ],
      links:[
        {icon:"🌐",label:"Pagar tarifa USCIS $235",     url:"https://www.uscis.gov/forms/filing-fees/uscis-immigrant-fee"},
        {icon:"🌐",label:"Actualizar dirección USCIS",  url:"https://www.uscis.gov/addresschange"},
        {icon:"📮",label:"USPS Informed Delivery",      url:"https://informeddelivery.usps.com"},
        {icon:"🌐",label:"Estado de tu Green Card",     url:"https://www.uscis.gov/e-request"},
        {icon:"🌐",label:"Renovar Green Card (I-90)",   url:"https://www.uscis.gov/i-90"},
      ],
      aiQuestion:"¿Cómo rastrear la entrega de mi Green Card por correo?",
    },
  },

  housing:{
    fr:{
      emoji:"🏠", title:"Trouver un logement",
      urgency:"normal", cost:"1er mois + dépôt = 2x le loyer", time:"1-4 semaines de recherche",
      intro:"Trouver un logement permanent est une étape majeure. Sans credit score ni historique de location US, c'est plus difficile mais pas impossible. Voilà comment maximiser tes chances.",
      docs:[
        {icon:"🪪",label:"SSN ou ITIN",        desc:"Requis pour la vérification de crédit"},
        {icon:"🛂",label:"Passeport + Green Card",desc:"Preuve d'identité et de statut légal"},
        {icon:"💼",label:"Preuve de revenus",  desc:"Lettre d'employeur, relevés bancaires"},
        {icon:"📋",label:"Références",         desc:"Contacts qui peuvent témoigner de toi"},
      ],
      steps:[
        {title:"Cherche sur les bons sites",             desc:"Zillow.com, Apartments.com, Realtor.com, et Craigslist sont les meilleurs. Facebook Marketplace aussi pour les locations entre particuliers sans agence."},
        {title:"Contacte directement les propriétaires", desc:"Les propriétaires privés sont plus flexibles que les grandes agences immobilières. Explique ta situation d'immigrant récent et propose un dépôt plus important."},
        {title:"Prépare ton dossier de location",        desc:"Lettre de motivation, relevés bancaires, contrat de travail si disponible, et références personnelles. Un garant américain peut aussi t'aider."},
        {title:"Négocie si tu n'as pas de credit score", desc:"Sans credit score, propose 2-3 mois de loyer d'avance. Beaucoup de propriétaires acceptent ça."},
        {title:"Signe le bail et configure tes services", desc:"Avant de signer, lis TOUT le bail. Configure l'électricité, internet, et l'eau. Ces factures aident aussi à construire ton historique de crédit."},
      ],
      warning:"⚠️ Méfie-toi des arnaques sur Craigslist — ne paie jamais un dépôt sans avoir visité le logement en personne et signé un bail officiel.",
      errors:[
        "Payer un dépôt sans avoir visité — arnaque fréquente",
        "Signer un bail sans le lire entièrement",
        "Chercher uniquement via les grandes agences — les propriétaires privés sont plus flexibles",
        "Ne pas demander un reçu pour chaque paiement",
      ],
      faq:[
        {q:"Puis-je louer sans credit score ?",          a:"Oui, en proposant 2-3 mois de loyer d'avance ou en trouvant un garant. Les propriétaires privés sont beaucoup plus flexibles."},
        {q:"Qu'est-ce que le Section 8 ?",               a:"C'est un programme d'aide au logement du gouvernement. Si tes revenus sont bas, tu peux demander une aide financière pour le loyer."},
        {q:"Comment construire mon historique de location ?",a:"Paye ton loyer à temps. Des services comme RentReporters rapportent tes paiements aux bureaux de crédit."},
      ],
      links:[
        {icon:"🌐",label:"Chercher sur Zillow",         url:"https://www.zillow.com"},
        {icon:"🌐",label:"Chercher sur Apartments.com", url:"https://www.apartments.com"},
        {icon:"🌐",label:"Aide au logement Section 8",  url:"https://www.hud.gov/topics/housing_choice_voucher_program_section_8"},
        {icon:"🌐",label:"Construire crédit avec loyer", url:"https://www.rentreporters.com"},
      ],
      aiQuestion:"Comment trouver un logement sans credit score aux USA ?",
    },
    en:{
      emoji:"🏠", title:"Find Housing",
      urgency:"normal", cost:"1st month + deposit = 2x rent", time:"1-4 weeks of searching",
      intro:"Finding permanent housing is a major step. Without a credit score or US rental history, it's harder but not impossible. Here's how to maximize your chances.",
      docs:[
        {icon:"🪪",label:"SSN or ITIN",        desc:"Required for credit check"},
        {icon:"🛂",label:"Passport + Green Card",desc:"Proof of identity and legal status"},
        {icon:"💼",label:"Proof of income",    desc:"Employer letter, bank statements"},
        {icon:"📋",label:"References",         desc:"Contacts who can vouch for you"},
      ],
      steps:[
        {title:"Search on the right sites",        desc:"Zillow.com, Apartments.com, Realtor.com, and Craigslist are the best. Facebook Marketplace too for private rentals without an agency."},
        {title:"Contact landlords directly",        desc:"Private landlords are more flexible than big property management companies. Explain your situation as a recent immigrant and offer a larger deposit."},
        {title:"Prepare your rental application",   desc:"Cover letter explaining your situation, bank statements, employment contract if you have one, and personal references."},
        {title:"Negotiate if you don't have credit",desc:"Without a credit score, offer 2-3 months of rent upfront. Many landlords accept this."},
        {title:"Sign the lease and set up utilities",desc:"Before signing, read the ENTIRE lease. Set up electricity, internet, and water. These bills also help build your credit history."},
      ],
      warning:"⚠️ Beware of scams on Craigslist — never pay a deposit without having visited the property in person and signing an official lease.",
      errors:[
        "Paying a deposit without visiting — common scam",
        "Signing a lease without reading it fully",
        "Only searching through big agencies — private landlords are more flexible",
        "Not asking for a receipt for every payment",
      ],
      faq:[
        {q:"Can I rent without a credit score?",      a:"Yes, by offering 2-3 months of rent upfront or finding a guarantor. Private landlords are much more flexible."},
        {q:"What is Section 8?",                       a:"It's a US government housing assistance program. If your income is low, you can apply for financial help with rent."},
        {q:"How do I build my rental history?",        a:"Pay your rent on time every month. Services like RentReporters report your payments to credit bureaus."},
      ],
      links:[
        {icon:"🌐",label:"Search on Zillow",            url:"https://www.zillow.com"},
        {icon:"🌐",label:"Search on Apartments.com",    url:"https://www.apartments.com"},
        {icon:"🌐",label:"Section 8 housing assistance",url:"https://www.hud.gov/topics/housing_choice_voucher_program_section_8"},
        {icon:"🌐",label:"Build credit with rent",      url:"https://www.rentreporters.com"},
      ],
      aiQuestion:"How to find housing without a credit score in the USA?",
    },
    es:{
      emoji:"🏠", title:"Encontrar vivienda",
      urgency:"normal", cost:"1er mes + depósito = 2x el alquiler", time:"1-4 semanas de búsqueda",
      intro:"Encontrar vivienda permanente es un paso importante. Sin historial crediticio ni historial de alquiler en EE.UU., es más difícil pero no imposible.",
      docs:[
        {icon:"🪪",label:"SSN o ITIN",         desc:"Requerido para verificación de crédito"},
        {icon:"🛂",label:"Pasaporte + Green Card",desc:"Prueba de identidad y estatus legal"},
        {icon:"💼",label:"Prueba de ingresos", desc:"Carta del empleador, estados de cuenta"},
        {icon:"📋",label:"Referencias",        desc:"Contactos que puedan dar referencias de ti"},
      ],
      steps:[
        {title:"Busca en los sitios correctos",        desc:"Zillow.com, Apartments.com, Realtor.com y Craigslist son los mejores. Facebook Marketplace también para alquileres privados sin agencia."},
        {title:"Contacta directamente a los propietarios",desc:"Los propietarios privados son más flexibles que las grandes empresas de gestión. Explica tu situación y ofrece un depósito mayor."},
        {title:"Prepara tu solicitud de alquiler",     desc:"Carta de presentación, estados de cuenta, contrato de trabajo si tienes uno, y referencias personales."},
        {title:"Negocia si no tienes puntaje crediticio",desc:"Sin puntaje crediticio, ofrece 2-3 meses de alquiler por adelantado. Muchos propietarios aceptan esto."},
        {title:"Firma el contrato y configura los servicios",desc:"Antes de firmar, lee TODO el contrato. Configura electricidad, internet y agua."},
      ],
      warning:"⚠️ Ten cuidado con las estafas en Craigslist — nunca pagues un depósito sin haber visitado la propiedad en persona.",
      errors:[
        "Pagar un depósito sin visitar — estafa común",
        "Firmar un contrato sin leerlo completamente",
        "Buscar solo a través de grandes agencias — los propietarios privados son más flexibles",
        "No pedir recibo por cada pago",
      ],
      faq:[
        {q:"¿Puedo alquilar sin puntaje crediticio?",      a:"Sí, ofreciendo 2-3 meses de alquiler por adelantado o encontrando un garante."},
        {q:"¿Qué es la Sección 8?",                         a:"Es un programa de asistencia de vivienda del gobierno. Si tus ingresos son bajos, puedes solicitar ayuda financiera para el alquiler."},
        {q:"¿Cómo construyo mi historial de alquiler?",     a:"Paga tu alquiler a tiempo cada mes. Servicios como RentReporters reportan tus pagos a los burós de crédito."},
      ],
      links:[
        {icon:"🌐",label:"Buscar en Zillow",         url:"https://www.zillow.com"},
        {icon:"🌐",label:"Buscar en Apartments.com", url:"https://www.apartments.com"},
        {icon:"🌐",label:"Asistencia Sección 8",     url:"https://www.hud.gov/topics/housing_choice_voucher_program_section_8"},
        {icon:"🌐",label:"Construir crédito con alquiler",url:"https://www.rentreporters.com"},
      ],
      aiQuestion:"¿Cómo encontrar vivienda sin puntaje crediticio en EE.UU.?",
    },
  },

  job:{
    fr:{
      emoji:"💼", title:"Trouver un emploi",
      urgency:"normal", cost:"Gratuit", time:"2-8 semaines selon le secteur",
      intro:"En tant que résident permanent DV Lottery, tu as le droit de travailler dans n'importe quel secteur aux USA. Tu as besoin de ton SSN pour commencer à travailler légalement.",
      docs:[
        {icon:"🪪",label:"SSN (obligatoire)",          desc:"Requis par tous les employeurs pour te payer"},
        {icon:"💳",label:"Green Card ou tampon I-551", desc:"Preuve de ton droit de travailler"},
        {icon:"📄",label:"CV format américain",        desc:"1 page max, sans photo, sans âge"},
        {icon:"📧",label:"Adresse email professionnelle",desc:"Gmail avec ton vrai nom"},
      ],
      steps:[
        {title:"Crée ton profil LinkedIn",          desc:"LinkedIn est essentiel aux USA. Crée un profil complet avec photo professionnelle. 75% des emplois sont trouvés par le réseau."},
        {title:"Adapte ton CV au format américain",  desc:"1 page maximum. Pas de photo, pas d'âge. Commence par tes expériences les plus récentes. Utilise des chiffres pour quantifier tes résultats."},
        {title:"Postule sur les bons sites",         desc:"Indeed.com, LinkedIn Jobs, Glassdoor, et ZipRecruiter sont les meilleurs. Pour les emplois gouvernementaux : USAJOBS.gov. Postule à 20-30 offres par semaine."},
        {title:"Prépare tes entretiens",             desc:"Les entretiens américains sont différents. Sois direct, positif, parle de tes accomplissements avec des chiffres. Prépare des réponses STAR."},
        {title:"Remplis le formulaire I-9 à l'embauche",desc:"Tous les employeurs doivent vérifier ton droit de travailler via le formulaire I-9. Apporte ta Green Card et ton SSN. C'est obligatoire."},
      ],
      warning:"⚠️ Ne travaille JAMAIS sans avoir ton SSN. Les employeurs qui acceptent de te payer en cash sans SSN te mettent en danger légalement.",
      errors:[
        "Travailler sans SSN — illégal pour toi et l'employeur",
        "Envoyer un CV avec photo ou âge — éliminatoire aux USA",
        "Ne pas adapter son CV au marché américain",
        "Ignorer LinkedIn — c'est le réseau professionnel numéro 1 aux USA",
      ],
      faq:[
        {q:"Ai-je besoin d'une autorisation de travail supplémentaire ?",a:"Non ! En tant que résident permanent DV Lottery, tu as le droit de travailler dans n'importe quel emploi. Ta Green Card suffit."},
        {q:"Comment faire reconnaître mon diplôme étranger ?",           a:"Contacte World Education Services (WES) ou Educational Credential Evaluators (ECE) pour faire évaluer ton diplôme."},
        {q:"Puis-je créer ma propre entreprise ?",                       a:"Oui ! En tant que résident permanent, tu peux créer une LLC ou une entreprise individuelle."},
      ],
      links:[
        {icon:"🌐",label:"Recherche d'emploi sur Indeed",url:"https://www.indeed.com"},
        {icon:"🌐",label:"LinkedIn Jobs",               url:"https://www.linkedin.com/jobs"},
        {icon:"🌐",label:"Emplois gouvernementaux USA", url:"https://www.usajobs.gov"},
        {icon:"🌐",label:"Évaluation de diplôme WES",  url:"https://www.wes.org"},
      ],
      aiQuestion:"Comment trouver un emploi aux USA en tant qu'immigrant DV Lottery ?",
    },
    en:{
      emoji:"💼", title:"Find a Job",
      urgency:"normal", cost:"Free", time:"2-8 weeks depending on sector",
      intro:"As a DV Lottery permanent resident, you have the right to work in any sector in the USA. You need your SSN to start working legally.",
      docs:[
        {icon:"🪪",label:"SSN (required)",             desc:"Required by all employers to pay you"},
        {icon:"💳",label:"Green Card or I-551 stamp",  desc:"Proof of your right to work"},
        {icon:"📄",label:"US-format resume",           desc:"1 page max, no photo, no age"},
        {icon:"📧",label:"Professional email address", desc:"Gmail with your real name"},
      ],
      steps:[
        {title:"Create your LinkedIn profile",        desc:"LinkedIn is essential in the USA. Create a complete profile with professional photo. 75% of jobs are found through networking."},
        {title:"Adapt your resume to US format",      desc:"1 page maximum. No photo, no age. Start with most recent experience. Use numbers to quantify your results."},
        {title:"Apply on the right sites",            desc:"Indeed.com, LinkedIn Jobs, Glassdoor, and ZipRecruiter are the best. For government jobs: USAJOBS.gov. Apply to 20-30 positions per week."},
        {title:"Prepare for interviews",              desc:"US interviews are different. Be direct, positive, talk about your accomplishments with numbers. Prepare STAR answers."},
        {title:"Complete Form I-9 at hiring",         desc:"All employers must verify your right to work via Form I-9. Bring your Green Card and SSN. This is required for all US employers."},
      ],
      warning:"⚠️ NEVER work without your SSN. Employers who agree to pay you in cash without an SSN put you and themselves at legal risk.",
      errors:[
        "Working without SSN — illegal for you and the employer",
        "Sending a resume with photo or age — disqualifying in the USA",
        "Not adapting your resume to the US market",
        "Ignoring LinkedIn — it's the #1 professional network in the USA",
      ],
      faq:[
        {q:"Do I need additional work authorization?",      a:"No! As a DV Lottery permanent resident, you have the right to work in any job in the USA. Your Green Card is enough."},
        {q:"How do I get my foreign degree recognized?",    a:"Contact World Education Services (WES) or Educational Credential Evaluators (ECE) to evaluate your foreign degree."},
        {q:"Can I start my own business?",                  a:"Yes! As a permanent resident, you can create an LLC or sole proprietorship."},
      ],
      links:[
        {icon:"🌐",label:"Job search on Indeed",   url:"https://www.indeed.com"},
        {icon:"🌐",label:"LinkedIn Jobs",          url:"https://www.linkedin.com/jobs"},
        {icon:"🌐",label:"US Government Jobs",     url:"https://www.usajobs.gov"},
        {icon:"🌐",label:"Degree evaluation WES",  url:"https://www.wes.org"},
      ],
      aiQuestion:"How to find a job in the USA as a DV Lottery immigrant?",
    },
    es:{
      emoji:"💼", title:"Encontrar trabajo",
      urgency:"normal", cost:"Gratis", time:"2-8 semanas según el sector",
      intro:"Como residente permanente de DV Lottery, tienes derecho a trabajar en cualquier sector en EE.UU. Necesitas tu SSN para empezar a trabajar legalmente.",
      docs:[
        {icon:"🪪",label:"SSN (obligatorio)",          desc:"Requerido por todos los empleadores para pagarte"},
        {icon:"💳",label:"Green Card o sello I-551",   desc:"Prueba de tu derecho a trabajar"},
        {icon:"📄",label:"CV en formato americano",    desc:"1 página máximo, sin foto, sin edad"},
        {icon:"📧",label:"Correo electrónico profesional",desc:"Gmail con tu nombre real"},
      ],
      steps:[
        {title:"Crea tu perfil de LinkedIn",           desc:"LinkedIn es esencial en EE.UU. Crea un perfil completo con foto profesional. El 75% de los trabajos se encuentran a través de la red de contactos."},
        {title:"Adapta tu CV al formato americano",    desc:"1 página máximo. Sin foto, sin edad. Comienza con la experiencia más reciente. Usa números para cuantificar tus resultados."},
        {title:"Postula en los sitios correctos",      desc:"Indeed.com, LinkedIn Jobs, Glassdoor y ZipRecruiter son los mejores. Para empleos gubernamentales: USAJOBS.gov. Postula a 20-30 ofertas por semana."},
        {title:"Prepárate para las entrevistas",       desc:"Las entrevistas en EE.UU. son diferentes. Sé directo, positivo y habla de tus logros con números. Prepara respuestas STAR."},
        {title:"Completa el Formulario I-9 al contratar",desc:"Todos los empleadores deben verificar tu derecho a trabajar mediante el Formulario I-9. Lleva tu Green Card y SSN."},
      ],
      warning:"⚠️ NUNCA trabajes sin tu SSN. Los empleadores que aceptan pagarte en efectivo sin SSN te ponen a ti y a ellos en riesgo legal.",
      errors:[
        "Trabajar sin SSN — ilegal para ti y el empleador",
        "Enviar CV con foto o edad — eliminatorio en EE.UU.",
        "No adaptar tu CV al mercado americano",
        "Ignorar LinkedIn — es la red profesional #1 en EE.UU.",
      ],
      faq:[
        {q:"¿Necesito autorización de trabajo adicional?",   a:"¡No! Como residente permanente de DV Lottery, tienes derecho a trabajar en cualquier empleo en EE.UU. Tu Green Card es suficiente."},
        {q:"¿Cómo hago reconocer mi título extranjero?",     a:"Contacta a World Education Services (WES) o Educational Credential Evaluators (ECE) para evaluar tu título."},
        {q:"¿Puedo crear mi propia empresa?",                 a:"¡Sí! Como residente permanente, puedes crear una LLC o empresa individual."},
      ],
      links:[
        {icon:"🌐",label:"Búsqueda de empleo en Indeed",url:"https://www.indeed.com"},
        {icon:"🌐",label:"LinkedIn Jobs",               url:"https://www.linkedin.com/jobs"},
        {icon:"🌐",label:"Empleos gubernamentales EE.UU.",url:"https://www.usajobs.gov"},
        {icon:"🌐",label:"Evaluación de título WES",    url:"https://www.wes.org"},
      ],
      aiQuestion:"¿Cómo encontrar trabajo en EE.UU. como inmigrante DV Lottery?",
    },
  },

  license:{
    fr:{
      emoji:"🚗", title:"Permis de conduire US",
      urgency:"normal", cost:"$50-$100 selon l'état", time:"1-2 jours (examen + visite DMV)",
      intro:"Le permis de conduire américain est aussi une carte d'identité importante. Même si tu ne conduis pas, il est très utile comme pièce d'identité quotidienne aux USA.",
      docs:[
        {icon:"🪪",label:"SSN",              desc:"Obligatoire pour passer le permis"},
        {icon:"💳",label:"Green Card",       desc:"Preuve de résidence légale"},
        {icon:"🛂",label:"Passeport",        desc:"Preuve d'identité supplémentaire"},
        {icon:"🏠",label:"Preuve d'adresse", desc:"2 documents : bail + facture ou relevé bancaire"},
      ],
      steps:[
        {title:"Passe l'examen théorique en ligne d'abord",desc:"Va sur le site du DMV de ton état (ex: mva.maryland.gov pour le Maryland). Télécharge le manuel de conduite. Passe des examens blancs sur dmv-written-test.com. Tu as besoin d'environ 70-80%."},
        {title:"Prends rendez-vous au DMV",               desc:"Va sur le site du DMV de ton état pour prendre rendez-vous. Prends rendez-vous pour éviter d'attendre 2-4h."},
        {title:"Va au DMV avec tous tes documents",       desc:"Apporte tous tes documents ORIGINAUX. Si un document manque, ils te renverront chez toi."},
        {title:"Passe l'examen pratique (road test)",     desc:"Après avoir réussi l'examen théorique, tu devras passer un examen pratique de conduite. Amène un véhicule assuré. L'examen dure 15-20 minutes."},
        {title:"Reçois ton permis temporaire puis permanent",desc:"Tu reçois d'abord un permis temporaire papier. Le permis plastique arrive par courrier en 1-2 semaines. Configure USPS Informed Delivery pour suivre la livraison."},
      ],
      warning:"⚠️ Coche l'option REAL ID au DMV — depuis mai 2025, le REAL ID est requis pour prendre l'avion aux USA. Il a une étoile dorée en haut à droite.",
      errors:[
        "Ne pas préparer l'examen théorique — 40% des gens ratent au premier essai",
        "Oublier la 2ème preuve d'adresse — le DMV en demande souvent 2",
        "Ne pas prendre le REAL ID — requis pour voyager en avion depuis mai 2025",
        "Y aller sans rendez-vous — attente de 2-4h possible",
      ],
      faq:[
        {q:"Puis-je conduire avec mon permis étranger en attendant ?",a:"Oui, pour une durée limitée selon les états (30-90 jours en général). Après, tu dois avoir un permis américain."},
        {q:"Qu'est-ce que le REAL ID ?",                              a:"C'est un permis avec une étoile dorée en haut à droite. Depuis mai 2025, il est requis pour prendre l'avion intérieur aux USA."},
        {q:"Mon permis international est-il valide aux USA ?",        a:"Un Permis de Conduire International (PCI) est accepté en complément de ton permis national. Mais ce n'est pas suffisant seul."},
      ],
      links:[
        {icon:"🌐",label:"DMV Maryland (MVA)",           url:"https://mva.maryland.gov"},
        {icon:"🌐",label:"Trouver le DMV de ton état",   url:"https://www.dmv.org"},
        {icon:"🌐",label:"Pratiquer l'examen théorique", url:"https://dmv-written-test.com"},
        {icon:"🌐",label:"Info REAL ID",                 url:"https://www.dhs.gov/real-id"},
      ],
      explorerFilter:"dmv",
      aiQuestion:"Comment passer le permis de conduire américain en tant qu'immigrant ?",
    },
    en:{
      emoji:"🚗", title:"US Driver's License",
      urgency:"normal", cost:"$50-$100 depending on state", time:"1-2 days (exam + DMV visit)",
      intro:"The US driver's license is also an important ID card. Even if you don't drive, it's very useful as a daily ID in the USA.",
      docs:[
        {icon:"🪪",label:"SSN",              desc:"Required to get a license"},
        {icon:"💳",label:"Green Card",       desc:"Proof of legal residency"},
        {icon:"🛂",label:"Passport",         desc:"Additional proof of identity"},
        {icon:"🏠",label:"Address proof",    desc:"2 documents: lease + bill or bank statement"},
      ],
      steps:[
        {title:"Take the written test online first",  desc:"Go to your state's DMV website (e.g., mva.maryland.gov for Maryland). Download your state's driving manual. Practice on dmv-written-test.com. You need about 70-80% to pass."},
        {title:"Schedule a DMV appointment",          desc:"Go to your state's DMV website to schedule an appointment. Schedule to avoid waiting 2-4 hours."},
        {title:"Go to the DMV with all your docs",    desc:"Bring all ORIGINAL documents. If a document is missing, they'll send you home."},
        {title:"Take the road test",                  desc:"After passing the written test, you'll need to take a practical driving test. Bring an insured vehicle. The test lasts 15-20 minutes."},
        {title:"Receive temp then permanent license", desc:"You receive a temporary paper license on the day. The plastic license arrives by mail in 1-2 weeks. Set up USPS Informed Delivery to track delivery."},
      ],
      warning:"⚠️ Check the REAL ID option at the DMV — since May 2025, REAL ID is required for domestic flights within the USA. It has a gold star in the top right corner.",
      errors:[
        "Not preparing for the written test — 40% of people fail on first try",
        "Forgetting the 2nd address proof — DMV often requires 2",
        "Not getting REAL ID — required for domestic air travel since May 2025",
        "Going without an appointment — 2-4 hour wait possible",
      ],
      faq:[
        {q:"Can I drive with my foreign license while waiting?",a:"Yes, for a limited time depending on state (usually 30-90 days). After that, you need a US license."},
        {q:"What is REAL ID?",                                  a:"It's a license with a gold star in the top right corner. Since May 2025, it's required for domestic flights within the USA."},
        {q:"Is my international license valid in the USA?",     a:"An International Driver's Permit (IDP) is accepted alongside your national license. But it's not sufficient alone."},
      ],
      links:[
        {icon:"🌐",label:"Maryland DMV (MVA)",           url:"https://mva.maryland.gov"},
        {icon:"🌐",label:"Find your state's DMV",        url:"https://www.dmv.org"},
        {icon:"🌐",label:"Practice written test",        url:"https://dmv-written-test.com"},
        {icon:"🌐",label:"REAL ID info",                 url:"https://www.dhs.gov/real-id"},
      ],
      explorerFilter:"dmv",
      aiQuestion:"How to get a US driver's license as an immigrant?",
    },
    es:{
      emoji:"🚗", title:"Licencia de conducir de EE.UU.",
      urgency:"normal", cost:"$50-$100 según el estado", time:"1-2 días (examen + visita al DMV)",
      intro:"La licencia de conducir de EE.UU. también es una tarjeta de identificación importante. Incluso si no conduces, es muy útil como identificación diaria en EE.UU.",
      docs:[
        {icon:"🪪",label:"SSN",               desc:"Obligatorio para obtener la licencia"},
        {icon:"💳",label:"Green Card",        desc:"Prueba de residencia legal"},
        {icon:"🛂",label:"Pasaporte",         desc:"Prueba de identidad adicional"},
        {icon:"🏠",label:"Prueba de domicilio",desc:"2 documentos: contrato + factura o estado de cuenta"},
      ],
      steps:[
        {title:"Haz el examen teórico en línea primero",  desc:"Ve al sitio web del DMV de tu estado. Descarga el manual de conducción. Practica en dmv-written-test.com. Necesitas aproximadamente 70-80% para aprobar."},
        {title:"Programa una cita en el DMV",              desc:"Ve al sitio web del DMV de tu estado para programar una cita. Prográmala para evitar esperar 2-4 horas."},
        {title:"Ve al DMV con todos tus documentos",       desc:"Lleva todos los documentos ORIGINALES. Si falta un documento, te enviarán a casa."},
        {title:"Haz el examen práctico (road test)",       desc:"Después de aprobar el examen teórico, deberás hacer un examen práctico de conducción. Lleva un vehículo asegurado. El examen dura 15-20 minutos."},
        {title:"Recibe tu licencia temporal y luego permanente",desc:"Recibes una licencia temporal en papel el día del examen. La licencia de plástico llega por correo en 1-2 semanas."},
      ],
      warning:"⚠️ Marca la opción REAL ID en el DMV — desde mayo 2025, se requiere REAL ID para vuelos domésticos en EE.UU. Tiene una estrella dorada en la esquina superior derecha.",
      errors:[
        "No prepararse para el examen teórico — el 40% falla en el primer intento",
        "Olvidar la 2ª prueba de domicilio — el DMV suele requerir 2",
        "No obtener REAL ID — requerido para vuelos domésticos desde mayo 2025",
        "Ir sin cita — posible espera de 2-4 horas",
      ],
      faq:[
        {q:"¿Puedo conducir con mi licencia extranjera mientras espero?",a:"Sí, por un tiempo limitado según el estado (generalmente 30-90 días). Después, necesitas una licencia de EE.UU."},
        {q:"¿Qué es el REAL ID?",                                        a:"Es una licencia con una estrella dorada en la esquina superior derecha. Desde mayo 2025, es necesario para vuelos domésticos en EE.UU."},
        {q:"¿Es válida mi licencia internacional en EE.UU.?",            a:"Un Permiso Internacional de Conducción se acepta junto con tu licencia nacional. Pero no es suficiente solo."},
      ],
      links:[
        {icon:"🌐",label:"DMV Maryland (MVA)",              url:"https://mva.maryland.gov"},
        {icon:"🌐",label:"Encontrar el DMV de tu estado",   url:"https://www.dmv.org"},
        {icon:"🌐",label:"Practicar examen teórico",        url:"https://dmv-written-test.com"},
        {icon:"🌐",label:"Info REAL ID",                    url:"https://www.dhs.gov/real-id"},
      ],
      explorerFilter:"dmv",
      aiQuestion:"¿Cómo obtener la licencia de conducir de EE.UU. como inmigrante?",
    },
  },
};

// ══════════════════════════════════════════════
// URGENCY CONFIG
// ══════════════════════════════════════════════
const URGENCY_CONFIG = {
  critical:{color:"#ef4444",bg:"rgba(239,68,68,0.08)",border:"rgba(239,68,68,0.3)", label:{fr:"🔴 Critique",en:"🔴 Critical",es:"🔴 Crítico"}},
  high:    {color:"#f97316",bg:"rgba(249,115,22,0.08)",border:"rgba(249,115,22,0.3)", label:{fr:"🟠 Important",en:"🟠 Important",es:"🟠 Importante"}},
  normal:  {color:"#e8b84b",bg:"rgba(232,184,75,0.08)",border:"rgba(232,184,75,0.25)",label:{fr:"📋 Normal",en:"📋 Normal",es:"📋 Normal"}},
};

// ══════════════════════════════════════════════
// GUIDE PAGE
// ══════════════════════════════════════════════
export default function GuidePage() {
  const params = useParams();
  const stepId = params?.step as string;

  const [lang,setLang]               = useState<Lang>("fr");
  const [completed,setCompleted]     = useState(false);
  const [marking,setMarking]         = useState(false);
  const [checkedDocs,setCheckedDocs] = useState<Record<number,boolean>>({});
  const [openFaq,setOpenFaq]         = useState<number|null>(null);
  const [mounted,setMounted]         = useState(false);
  const [allDocsChecked,setAllDocsChecked] = useState(false);
  const [showDocAnim,setShowDocAnim] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang&&["fr","en","es"].includes(savedLang)) setLang(savedLang);
    const check = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db,"users",user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setCompleted((data?.completedSteps||[]).includes(stepId));
        }
      } catch { /* continue */ }
    };
    check();
    setTimeout(()=>setMounted(true),100);
  },[stepId]);

  const guide = GUIDES[stepId]?.[lang];

  // ✅ Détecte quand tous les docs sont cochés
  useEffect(() => {
    if (!guide) return;
    const total = guide.docs.length;
    const checked = Object.values(checkedDocs).filter(Boolean).length;
    if (checked===total&&total>0) {
      setAllDocsChecked(true);
      setShowDocAnim(true);
      setTimeout(()=>setShowDocAnim(false),3000);
    } else {
      setAllDocsChecked(false);
    }
  },[checkedDocs,guide]);

  const handleMarkDone = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setMarking(true);
    try {
      const snap = await getDoc(doc(db,"users",user.uid));
      const data = snap.exists()?snap.data() as any:{};
      const steps:string[] = data?.completedSteps||[];
      const updated = completed?steps.filter(s=>s!==stepId):[...steps,stepId];
      await updateDoc(doc(db,"users",user.uid),{completedSteps:updated});
      setCompleted(!completed);
    } catch { /* continue */ }
    setMarking(false);
  },[completed,stepId]);

  const toggleDoc = useCallback((i:number) => {
    setCheckedDocs(prev=>({...prev,[i]:!prev[i]}));
  },[]);

  if (!guide) return (
    <div style={{minHeight:"100dvh",background:"#0b0f1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:"#aaa"}}>
        <div style={{fontSize:40,marginBottom:12}}>🔍</div>
        <div style={{fontSize:16}}>Guide introuvable</div>
        <button onClick={()=>window.location.href="/dashboard"} style={{marginTop:20,padding:"10px 20px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          ← Dashboard
        </button>
      </div>
    </div>
  );

  const urgency    = URGENCY_CONFIG[guide.urgency];
  const checkedCount = Object.values(checkedDocs).filter(Boolean).length;
  const missingDocs  = guide.docs.filter((_,i)=>!checkedDocs[i]).map(d=>d.label);

  return (
    <div style={{minHeight:"100dvh",background:"#0b0f1a",color:"#f4f1ec",fontFamily:"inherit"}}>

      <style>{`
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)}100%{box-shadow:0 0 0 12px rgba(34,197,94,0)}}
      `}</style>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(11,15,26,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #1e2a3a",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={()=>window.location.href="/dashboard"} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:14,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          ← {lang==="fr"?"Retour":lang==="es"?"Volver":"Back"}
        </button>
        <div style={{fontWeight:900,fontSize:18,fontFamily:"serif"}}>
          <span style={{color:"#e8b84b"}}>Ku</span><span style={{color:"#f4f1ec"}}>abo</span>
        </div>
        <div style={{fontSize:20}}>{guide.emoji}</div>
      </div>

      <div style={{padding:"20px 16px 80px",maxWidth:480,margin:"0 auto",opacity:mounted?1:0,transition:"opacity 0.4s ease"}}>

        {/* Hero */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:700,color:urgency.color,letterSpacing:"0.1em",textTransform:"uppercase" as const,padding:"3px 10px",borderRadius:20,background:urgency.bg,border:"1px solid "+urgency.border}}>
              {urgency.label[lang]}
            </span>
            {completed&&<span style={{fontSize:10,fontWeight:700,color:"#22c55e",padding:"3px 10px",borderRadius:20,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)"}}>✅ {lang==="fr"?"Complété":lang==="es"?"Completado":"Completed"}</span>}
          </div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#f4f1ec",margin:"0 0 12px",lineHeight:1.3}}>{guide.title}</h1>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <div style={{flex:1,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#555",marginBottom:3}}>💰 {lang==="fr"?"Coût":lang==="es"?"Costo":"Cost"}</div>
              <div style={{fontSize:13,fontWeight:600,color:"#e8b84b"}}>{guide.cost}</div>
            </div>
            <div style={{flex:1,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#555",marginBottom:3}}>⏱ {lang==="fr"?"Durée":lang==="es"?"Duración":"Duration"}</div>
              <div style={{fontSize:11,fontWeight:600,color:"#2dd4bf"}}>{guide.time}</div>
            </div>
          </div>
          <div style={{background:"rgba(232,184,75,0.06)",border:"1px solid rgba(232,184,75,0.2)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontSize:13,color:"#f4f1ec",lineHeight:1.7}}>{guide.intro}</div>
          </div>
        </div>

        {/* ✅ Documents — cochables avec feedback */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:6,fontWeight:600}}>
            📋 {lang==="fr"?"Coche ce que tu as DÉJÀ":lang==="es"?"Marca lo que YA tienes":"Check what you ALREADY have"}
          </div>
          <div style={{fontSize:12,color:"#aaa",marginBottom:12}}>
            {lang==="fr"?"On va t'aider à obtenir le reste":lang==="es"?"Te ayudaremos a obtener el resto":"We'll help you get the rest"}
          </div>

          {/* Animation tous cochés */}
          {showDocAnim&&(
            <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,animation:"fadeIn 0.3s ease"}}>
              <span style={{fontSize:22,animation:"bounce 0.6s ease infinite"}}>🎉</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>
                  {lang==="fr"?"Tu as tous tes documents !":lang==="es"?"¡Tienes todos tus documentos!":"You have all your documents!"}
                </div>
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>
                  {lang==="fr"?"Tu es prêt pour cette étape ✅":lang==="es"?"Estás listo para este paso ✅":"You're ready for this step ✅"}
                </div>
              </div>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {guide.docs.map((d,i)=>{
              const checked = !!checkedDocs[i];
              return (
                <div key={i} onClick={()=>toggleDoc(i)} style={{background:checked?"rgba(34,197,94,0.06)":"#141d2e",border:"1px solid "+(checked?"rgba(34,197,94,0.3)":"#1e2a3a"),borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"all 0.2s",WebkitTapHighlightColor:"transparent"}}>
                  <div style={{width:28,height:28,borderRadius:8,border:"2px solid "+(checked?"#22c55e":"#2a3448"),background:checked?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s",animation:checked?"checkPop 0.3s ease":"none"}}>
                    {checked&&<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{fontSize:20,flexShrink:0}}>{d.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:checked?"#22c55e":"#f4f1ec",transition:"color 0.2s"}}>{d.label}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>{d.desc}</div>
                  </div>
                  {checked&&<span style={{fontSize:12,color:"#22c55e",fontWeight:700,flexShrink:0}}>✓</span>}
                </div>
              );
            })}
          </div>

          {/* Résumé documents */}
          <div style={{marginTop:12,padding:"10px 14px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:"#aaa"}}>{checkedCount}/{guide.docs.length} {lang==="fr"?"documents":lang==="es"?"documentos":"documents"}</span>
              <span style={{fontSize:12,fontWeight:700,color:allDocsChecked?"#22c55e":"#e8b84b"}}>{allDocsChecked?(lang==="fr"?"Prêt !":lang==="es"?"¡Listo!":"Ready!"):(lang==="fr"?"En cours...":lang==="es"?"En progreso...":"In progress...")}</span>
            </div>
            <div style={{height:4,background:"#1e2a3a",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:(checkedCount/guide.docs.length*100)+"%",background:allDocsChecked?"linear-gradient(to right,#22c55e,#2dd4bf)":"linear-gradient(to right,#e8b84b,#f97316)",borderRadius:4,transition:"width 0.3s ease"}} />
            </div>
            {!allDocsChecked&&missingDocs.length>0&&(
              <div style={{marginTop:8,fontSize:11,color:"#aaa"}}>
                {lang==="fr"?"Il te manque :":lang==="es"?"Te falta:":"Missing:"}{" "}
                <span style={{color:"#ef4444"}}>{missingDocs.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600}}>
            🗂 {lang==="fr"?"Étapes à suivre":lang==="es"?"Pasos a seguir":"Steps to follow"}
          </div>
          <div style={{display:"flex",flexDirection:"column"}}>
            {guide.steps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:i===0?urgency.color:"#1e2a3a",border:"2px solid "+(i===0?urgency.color:"#2a3448"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:i===0?"#000":"#aaa",flexShrink:0}}>{i+1}</div>
                  {i<guide.steps.length-1&&<div style={{width:1,flex:1,background:"#1e2a3a",margin:"4px 0",minHeight:16}} />}
                </div>
                <div style={{paddingBottom:i<guide.steps.length-1?20:0,flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#f4f1ec",marginBottom:6}}>{step.title}</div>
                  <div style={{fontSize:13,color:"#aaa",lineHeight:1.7}}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div style={{background:"rgba(232,184,75,0.06)",border:"1px solid rgba(232,184,75,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:20,display:"flex",gap:10}}>
          <span style={{fontSize:18,flexShrink:0}}>💡</span>
          <div style={{fontSize:13,color:"#f4f1ec",lineHeight:1.7}}>{guide.warning}</div>
        </div>

        {/* Errors */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600}}>
            ❌ {lang==="fr"?"Erreurs à éviter":lang==="es"?"Errores a evitar":"Common mistakes"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {guide.errors.map((err,i)=>(
              <div key={i} style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
                <span style={{color:"#ef4444",fontSize:14,flexShrink:0,marginTop:1}}>✗</span>
                <span style={{fontSize:13,color:"#f4f1ec",lineHeight:1.6}}>{err}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600}}>❓ FAQ</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {guide.faq.map((item,i)=>(
              <div key={i} style={{background:"#141d2e",border:"1px solid "+(openFaq===i?"rgba(232,184,75,0.3)":"#1e2a3a"),borderRadius:12,overflow:"hidden",transition:"border-color 0.2s"}}>
                <div onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{padding:"13px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",gap:12}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#f4f1ec",flex:1}}>{item.q}</span>
                  <span style={{color:"#e8b84b",fontSize:18,flexShrink:0,transform:openFaq===i?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>⌄</span>
                </div>
                {openFaq===i&&(
                  <div style={{padding:"0 14px 14px",fontSize:13,color:"#aaa",lineHeight:1.7,borderTop:"1px solid #1e2a3a",paddingTop:12}}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Liens utiles */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600}}>
            🔗 {lang==="fr"?"Liens utiles":lang==="es"?"Enlaces útiles":"Useful links"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {guide.links.map((link,i)=>(
              <button key={i} onClick={()=>window.open(link.url,"_blank")} style={{width:"100%",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left" as const}}>
                <span style={{fontSize:18}}>{link.icon}</span>
                <span style={{fontSize:13,color:"#2dd4bf",flex:1}}>{link.label}</span>
                <span style={{color:"#555",fontSize:14}}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Explorer button */}
        {guide.explorerFilter&&(
          <button onClick={()=>window.location.href="/dashboard?tab=explorer&filter="+guide.explorerFilter} style={{width:"100%",marginBottom:12,padding:"13px 16px",background:"rgba(45,212,191,0.08)",border:"1px solid rgba(45,212,191,0.25)",borderRadius:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"inherit"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>🗺️</span>
              <span style={{fontSize:13,color:"#2dd4bf",fontWeight:600}}>
                {lang==="fr"?"Trouver le bureau le plus proche":lang==="es"?"Encontrar la oficina más cercana":"Find the nearest office"}
              </span>
            </div>
            <span style={{color:"#2dd4bf",fontSize:16}}>→</span>
          </button>
        )}

        {/* Kuabo AI button */}
        <button onClick={()=>{localStorage.setItem("aiQuestion",guide.aiQuestion);window.location.href="/chat";}} style={{width:"100%",marginBottom:20,padding:"13px 16px",background:"linear-gradient(135deg,rgba(232,184,75,0.1),rgba(45,212,191,0.06))",border:"1px solid rgba(232,184,75,0.3)",borderRadius:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"inherit"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(232,184,75,0.12)",border:"1px solid rgba(232,184,75,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
            <div style={{textAlign:"left" as const}}>
              <div style={{fontSize:13,fontWeight:600,color:"#f4f1ec"}}>Kuabo AI</div>
              <div style={{fontSize:11,color:"#aaa"}}>{guide.aiQuestion}</div>
            </div>
          </div>
          <span style={{color:"#e8b84b",fontSize:16}}>→</span>
        </button>

        {/* Mark as done */}
        <button onClick={handleMarkDone} disabled={marking} style={{width:"100%",padding:"15px",background:completed?"rgba(34,197,94,0.1)":"#22c55e",color:completed?"#22c55e":"#000",border:completed?"1px solid rgba(34,197,94,0.3)":"none",borderRadius:24,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:marking?0.7:1,transition:"all 0.2s"}}>
          {marking?"...":(completed
            ?(lang==="fr"?"✓ Complété — Retirer":lang==="es"?"✓ Completado — Quitar":"✓ Completed — Undo")
            :(lang==="fr"?"✓ Marquer comme fait":lang==="es"?"✓ Marcar como hecho":"✓ Mark as done")
          )}
        </button>

        <button onClick={()=>window.location.href="/dashboard"} style={{width:"100%",padding:"13px",background:"transparent",border:"1px solid rgba(232,184,75,0.3)",borderRadius:24,color:"#e8b84b",fontSize:14,cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>
          ← {lang==="fr"?"Retour au dashboard":lang==="es"?"Volver al dashboard":"Back to dashboard"}
        </button>

        {/* ✅ Autres guides */}
        <div>
          <div style={{fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600}}>
            📚 {lang==="fr"?"Autres guides":lang==="es"?"Otros guías":"Other guides"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ALL_GUIDES_META[lang].filter(g=>g.id!==stepId).map(g=>(
              <button key={g.id} onClick={()=>window.location.href=`/guide/${g.id}`} style={{width:"100%",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left" as const,WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:20}}>{g.emoji}</span>
                <span style={{fontSize:13,color:"#f4f1ec",flex:1}}>{g.label}</span>
                <span style={{color:"#555",fontSize:14}}>→</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}