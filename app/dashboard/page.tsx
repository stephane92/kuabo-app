"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut, deleteUser, sendPasswordResetEmail } from "firebase/auth";
import {
  CheckCircle2, ChevronRight, LogOut, Globe,
  Undo2, Home, FileText, User, Flame, PhoneCall, MapPin, Edit2, Lock,
} from "lucide-react";
import type { CSSProperties } from "react";
import ExplorerTab from "../components/ExplorerTab";

type Lang    = "fr"|"en"|"es";
type Tab     = "home"|"documents"|"profile"|"explorer";
type PhaseId = 1|2|3|4|5;

// ══════════════════════════════════════════════
// STEP GUIDES
// ══════════════════════════════════════════════
const STEP_GUIDES: Record<string,{guideUrl:string|null;explorerType:string|null;why:Record<Lang,string>;}> = {
  ssn:             {guideUrl:"/guide/ssn",           explorerType:"ssn",    why:{fr:"Le SSN est ton identifiant fiscal aux USA. Sans lui, tu ne peux pas travailler légalement, ouvrir un compte ou louer un appartement.",                        en:"The SSN is your tax ID in the USA. Without it, you cannot work legally, open a bank account or rent an apartment.",                        es:"El SSN es tu identificador fiscal en EE.UU. Sin él, no puedes trabajar legalmente, abrir una cuenta bancaria o alquilar."}},
  phone:           {guideUrl:"/guide/phone",          explorerType:null,     why:{fr:"Un numéro US est indispensable pour être contacté par les employeurs, les banques et les services gouvernementaux.",                                           en:"A US number is essential to be contacted by employers, banks and government services.",                                                    es:"Un número de EE.UU. es esencial para ser contactado por empleadores, bancos y servicios gubernamentales."}},
  bank:            {guideUrl:"/guide/bank",           explorerType:"bank",   why:{fr:"Un compte bancaire US te permet de recevoir ton salaire, payer ton loyer et construire ton credit score. Chase accepte les immigrants avec un passeport.",       en:"A US bank account lets you receive your salary, pay rent and build your credit score. Chase accepts immigrants with just a passport.",       es:"Una cuenta bancaria de EE.UU. te permite recibir tu salario, pagar el alquiler y construir tu historial crediticio."}},
  greencard:       {guideUrl:"/guide/greencard",      explorerType:"uscis",  why:{fr:"Ta Green Card physique est la preuve officielle de ta résidence permanente. Elle est valide 10 ans.",                                                           en:"Your physical Green Card is official proof of your permanent residency. Valid for 10 years.",                                              es:"Tu Green Card física es prueba oficial de tu residencia permanente. Válida por 10 años."}},
  housing:         {guideUrl:"/guide/housing",        explorerType:null,     why:{fr:"Un logement stable est la base de tout. Sans adresse permanente, tu ne peux pas recevoir ton SSN, ta Green Card ou tes documents officiels.",                    en:"Stable housing is the foundation of everything. Without a permanent address, you can't receive your SSN or Green Card.",                   es:"Un alojamiento estable es la base de todo. Sin dirección permanente, no puedes recibir tu SSN o Green Card."}},
  job:             {guideUrl:"/guide/job",            explorerType:null,     why:{fr:"Un emploi te donne un revenu stable et te permet de construire ton credit score. LinkedIn et Indeed sont tes meilleurs alliés.",                                  en:"A job gives you stable income and helps build your credit score. LinkedIn and Indeed are your best allies.",                               es:"Un trabajo te da ingresos estables y te ayuda a construir tu historial crediticio. LinkedIn e Indeed son tus mejores aliados."}},
  license:         {guideUrl:"/guide/license",        explorerType:"dmv",    why:{fr:"Le permis US est aussi une pièce d'identité officielle. Avec le REAL ID tu peux prendre l'avion domestique sans passeport.",                                    en:"The US license is also official ID. With REAL ID you can fly domestically without a passport.",                                           es:"La licencia de EE.UU. también es identificación oficial. Con REAL ID puedes volar sin pasaporte."}},
  credit_score:    {guideUrl:"/guide/credit_score",   explorerType:null,     why:{fr:"Un bon credit score (+700) te permet d'obtenir un appartement, un prêt voiture et de meilleures conditions pour acheter une maison.",                           en:"A good credit score (+700) lets you get an apartment, car loan, and better terms to buy a house.",                                        es:"Un buen puntaje de crédito (+700) te permite obtener apartamento, préstamo de auto y mejores condiciones para comprar casa."}},
  taxes_first:     {guideUrl:"/guide/taxes",          explorerType:null,     why:{fr:"Déclarer tes impôts avant le 15 avril est une obligation légale. Tu peux aussi obtenir des remboursements importants.",                                          en:"Filing your taxes before April 15 is a legal obligation. You can also get important refunds.",                                            es:"Declarar tus impuestos antes del 15 de abril es una obligación legal. También puedes obtener reembolsos importantes."}},
  health_insurance:{guideUrl:"/guide/health_insurance",explorerType:null,    why:{fr:"Une visite aux urgences sans assurance peut coûter des milliers de dollars. Le Marketplace ou ton employeur proposent des plans accessibles.",                   en:"An ER visit without insurance can cost thousands of dollars. The Marketplace or your employer offer accessible plans.",                    es:"Una visita a urgencias sin seguro puede costar miles de dólares. El Marketplace o tu empleador ofrecen planes accesibles."}},
  diploma_recognition:{guideUrl:"/guide/diploma",     explorerType:null,     why:{fr:"Faire reconnaître ton diplôme étranger par WES ou ECE te permet d'accéder à des emplois qualifiés correspondant à ton niveau d'études.",                       en:"Having your foreign degree recognized by WES or ECE gives you access to qualified jobs matching your education level.",                    es:"Reconocer tu título extranjero por WES o ECE te da acceso a empleos calificados que corresponden a tu nivel educativo."}},
  savings_account: {guideUrl:"/guide/savings",        explorerType:null,     why:{fr:"Un compte épargne avec 3 mois de salaire te protège en cas d'urgence — perte d'emploi, maladie, réparations imprévues.",                                       en:"A savings account with 3 months salary protects you in emergencies — job loss, illness, unexpected repairs.",                             es:"Una cuenta de ahorros con 3 meses de salario te protege en emergencias — pérdida de empleo, enfermedad, reparaciones inesperadas."}},
  real_id:         {guideUrl:"/guide/real_id",        explorerType:"dmv",    why:{fr:"Le REAL ID est obligatoire depuis mai 2025 pour prendre l'avion aux USA. C'est une version améliorée de ton permis de conduire.",                               en:"REAL ID is required since May 2025 for domestic flights in the USA. It's an enhanced version of your driver's license.",                  es:"El REAL ID es obligatorio desde mayo de 2025 para vuelos domésticos en EE.UU. Es una versión mejorada de tu licencia de conducir."}},
  buy_house:       {guideUrl:"/guide/buy_house",      explorerType:null,     why:{fr:"Acheter une maison est le meilleur investissement aux USA. Tu construis du patrimoine au lieu de payer un loyer.",                                               en:"Buying a house is the best investment in the USA. You build wealth instead of paying rent.",                                              es:"Comprar una casa es la mejor inversión en EE.UU. Construyes patrimonio en lugar de pagar alquiler."}},
  family_petition: {guideUrl:"/guide/family_petition",explorerType:null,     why:{fr:"Le formulaire I-130 te permet de faire venir ton conjoint, tes enfants ou tes parents aux USA légalement. C'est un processus long — commence tôt.",              en:"Form I-130 lets you bring your spouse, children or parents to the USA legally. It's a long process — start early.",                       es:"El formulario I-130 te permite traer a tu cónyuge, hijos o padres a EE.UU. legalmente. Es un proceso largo — empieza temprano."}},
  taxes_annual:    {guideUrl:"/guide/taxes",          explorerType:null,     why:{fr:"Les taxes IRS sont dues chaque année avant le 15 avril — sans exception. Même si tu as déjà déclaré avant.",                                                    en:"IRS taxes are due every year before April 15 — no exception. Even if you've filed before.",                                               es:"Los impuestos del IRS se deben pagar cada año antes del 15 de abril — sin excepción. Incluso si ya declaraste antes."}},
  create_llc:      {guideUrl:"/guide/llc",            explorerType:null,     why:{fr:"Créer une LLC te protège personnellement et te donne une crédibilité professionnelle. C'est rapide et peu coûteux.",                                              en:"Creating an LLC protects you personally and gives you professional credibility. It's fast and inexpensive.",                               es:"Crear una LLC te protege personalmente y te da credibilidad profesional. Es rápido y económico."}},
  vote_register:   {guideUrl:"/guide/vote",           explorerType:null,     why:{fr:"S'inscrire pour voter te donne une voix dans les décisions politiques qui t'affectent directement — logement, immigration, santé.",                              en:"Registering to vote gives you a voice in political decisions that directly affect you — housing, immigration, health.",                    es:"Registrarse para votar te da voz en las decisiones políticas que te afectan directamente — vivienda, inmigración, salud."}},
  invest:          {guideUrl:"/guide/invest",         explorerType:null,     why:{fr:"Investir tôt dans des ETFs, un 401k ou une IRA te permet de construire de la richesse à long terme.",                                                            en:"Investing early in ETFs, a 401k or IRA lets you build long-term wealth.",                                                                 es:"Invertir temprano en ETFs, un 401k o IRA te permite construir riqueza a largo plazo."}},
  citizenship_eligible:{guideUrl:"/guide/citizenship",explorerType:null,     why:{fr:"Après 5 ans de Green Card tu peux demander la citoyenneté américaine. Vérifie d'abord ton éligibilité.",                                                         en:"After 5 years with a Green Card you can apply for US citizenship. Check your eligibility first.",                                         es:"Después de 5 años con Green Card puedes solicitar la ciudadanía americana. Verifica primero tu elegibilidad."}},
  taxes_annual_4:  {guideUrl:"/guide/taxes",          explorerType:null,     why:{fr:"Les taxes IRS sont dues chaque année sans exception — même pendant le processus de naturalisation.",                                                              en:"IRS taxes are due every year without exception — even during naturalization.",                                                             es:"Los impuestos del IRS se deben pagar cada año sin excepción — incluso durante la naturalización."}},
  n400_form:       {guideUrl:"/guide/n400",           explorerType:null,     why:{fr:"Le formulaire N-400 est la demande officielle de naturalisation. Il faut remplir ce formulaire et payer les frais (~$725).",                                      en:"Form N-400 is the official naturalization application. You fill out this form and pay the fee (~$725).",                                   es:"El formulario N-400 es la solicitud oficial de naturalización. Debes completar este formulario y pagar la tarifa (~$725)."}},
  civic_test:      {guideUrl:"/guide/civic_test",     explorerType:null,     why:{fr:"Le test civique comporte 100 questions sur l'histoire et le gouvernement américain. Tu dois répondre correctement à 6 sur 10 lors de l'entretien.",               en:"The civic test has 100 questions about US history and government. You must correctly answer 6 out of 10 at your interview.",               es:"El test cívico tiene 100 preguntas sobre historia y gobierno americano. Debes responder correctamente 6 de 10 en tu entrevista."}},
  oath:            {guideUrl:"/guide/oath",           explorerType:null,     why:{fr:"La cérémonie du serment est le moment où tu deviens officiellement citoyen américain.",                                                                           en:"The oath ceremony is when you officially become a US citizen.",                                                                           es:"La ceremonia del juramento es cuando te conviertes oficialmente en ciudadano americano."}},
  us_passport:     {guideUrl:"/guide/us_passport",    explorerType:null,     why:{fr:"Le passeport américain te permet de voyager dans 186 pays sans visa. C'est l'un des passeports les plus puissants du monde.",                                     en:"The US passport lets you travel to 186 countries without a visa. It's one of the most powerful passports in the world.",                  es:"El pasaporte americano te permite viajar a 186 países sin visa. Es uno de los pasaportes más poderosos del mundo."}},
  renew_greencard: {guideUrl:"/guide/renew_greencard",explorerType:"uscis",  why:{fr:"Ta Green Card doit être renouvelée tous les 10 ans via le formulaire I-90. Commence le renouvellement 6 mois avant l'expiration.",                               en:"Your Green Card must be renewed every 10 years via Form I-90. Start renewal 6 months before expiration.",                                 es:"Tu Green Card debe renovarse cada 10 años mediante el formulario I-90. Comienza la renovación 6 meses antes de la expiración."}},
  taxes_lifetime:  {guideUrl:"/guide/taxes",          explorerType:null,     why:{fr:"Les taxes IRS sont dues chaque année le 15 avril — pour toujours, même après la retraite.",                                                                       en:"IRS taxes are due every year on April 15 — forever, even after retirement.",                                                              es:"Los impuestos del IRS se deben pagar cada año el 15 de abril — para siempre, incluso después de jubilarse."}},
  renew_passport_us:{guideUrl:"/guide/us_passport",   explorerType:null,     why:{fr:"Le passeport américain doit être renouvelé tous les 10 ans. Tu peux le faire en ligne ou par courrier.",                                                          en:"The US passport must be renewed every 10 years. You can do it online or by mail.",                                                        es:"El pasaporte americano debe renovarse cada 10 años. Puedes hacerlo en línea o por correo."}},
  update_address:  {guideUrl:"/guide/uscis_address",  explorerType:"uscis",  why:{fr:"Tu es obligé de signaler tout changement d'adresse à l'USCIS dans les 10 jours via le formulaire AR-11.",                                                         en:"You must report any address change to USCIS within 10 days via Form AR-11.",                                                              es:"Debes reportar cualquier cambio de dirección a USCIS en 10 días mediante el formulario AR-11."}},
  community:       {guideUrl:null,                    explorerType:null,     why:{fr:"La communauté Kuabo te connecte avec d'autres immigrants qui ont vécu les mêmes défis. Partage ton expérience.",                                                  en:"The Kuabo community connects you with other immigrants who've faced the same challenges. Share your experience.",                          es:"La comunidad Kuabo te conecta con otros inmigrantes que han enfrentado los mismos desafíos. Comparte tu experiencia."}},
};

// ══════════════════════════════════════════════
// PHASES META
// ══════════════════════════════════════════════
type PhaseStep = {id:string;label:Record<Lang,string>;desc:Record<Lang,string>;urgency:"critical"|"high"|"normal";time:number;weight:number;};

const PHASES_META: Record<PhaseId,{emoji:string;name:Record<Lang,string>;desc:Record<Lang,string>;color:string;unlockMsg:Record<Lang,{title:string;msg:string}>;}>={
  1:{emoji:"🚀",name:{fr:"Atterrissage",en:"Landing",es:"Aterrizaje"},desc:{fr:"Tes premières étapes aux USA",en:"Your first steps in the USA",es:"Tus primeros pasos en EE.UU."},color:"#e8b84b",unlockMsg:{fr:{title:"🚀 Phase 1 complétée !",msg:"Tu es officiellement installé aux USA. Place aux Fondations !"},en:{title:"🚀 Phase 1 complete!",msg:"You're officially settled. Time to build your Foundations!"},es:{title:"🚀 ¡Fase 1 completada!",msg:"¡Estás instalado en EE.UU. A construir las Bases!"}}},
  2:{emoji:"🏗️",name:{fr:"Fondations",en:"Foundations",es:"Cimientos"},desc:{fr:"Construis ta vie financière",en:"Build your financial life",es:"Construye tu vida financiera"},color:"#2dd4bf",unlockMsg:{fr:{title:"🏗️ Phase 2 complétée !",msg:"Tes fondations sont solides. Place à la Croissance !"},en:{title:"🏗️ Phase 2 complete!",msg:"Your foundations are solid. Time to Grow!"},es:{title:"🏗️ ¡Fase 2 completada!",msg:"Tus cimientos son sólidos. ¡Es hora de Crecer!"}}},
  3:{emoji:"🌱",name:{fr:"Croissance",en:"Growth",es:"Crecimiento"},desc:{fr:"Développe ton avenir aux USA",en:"Develop your future in the USA",es:"Desarrolla tu futuro en EE.UU."},color:"#22c55e",unlockMsg:{fr:{title:"🌱 Phase 3 complétée !",msg:"Tu as construit ta vie aux USA. La citoyenneté t'attend !"},en:{title:"🌱 Phase 3 complete!",msg:"You've built your life in the USA. Citizenship awaits!"},es:{title:"🌱 ¡Fase 3 completada!",msg:"Has construido tu vida en EE.UU. ¡La ciudadanía te espera!"}}},
  4:{emoji:"🇺🇸",name:{fr:"Citoyenneté",en:"Citizenship",es:"Ciudadanía"},desc:{fr:"Deviens citoyen américain",en:"Become a US citizen",es:"Conviértete en ciudadano americano"},color:"#a78bfa",unlockMsg:{fr:{title:"🇺🇸 Phase 4 complétée !",msg:"Tu es citoyen américain ! Bienvenue dans Kuabo à Vie !"},en:{title:"🇺🇸 Phase 4 complete!",msg:"You're a US citizen! Welcome to Kuabo for Life!"},es:{title:"🇺🇸 ¡Fase 4 completada!",msg:"¡Eres ciudadano americano! ¡Bienvenido a Kuabo de por Vida!"}}},
  5:{emoji:"♾️",name:{fr:"Kuabo à Vie",en:"Kuabo for Life",es:"Kuabo de por Vida"},desc:{fr:"Rappels et renouvellements à vie",en:"Lifetime reminders and renewals",es:"Recordatorios y renovaciones de por vida"},color:"#f97316",unlockMsg:{fr:{title:"♾️ Kuabo à Vie !",msg:"Kuabo sera toujours là pour toi. Pour toujours."},en:{title:"♾️ Kuabo for Life!",msg:"Kuabo will always be there for you. Forever."},es:{title:"♾️ ¡Kuabo de por Vida!",msg:"Kuabo siempre estará ahí para ti. Para siempre."}}},
};

// ══════════════════════════════════════════════
// PHASE STEPS
// ══════════════════════════════════════════════
const PHASE_STEPS: Record<PhaseId,PhaseStep[]> = {
  1:[
    {id:"ssn",       label:{fr:"Numéro de Sécurité Sociale (SSN)",en:"Social Security Number (SSN)",  es:"Número de Seguro Social (SSN)"},  desc:{fr:"Obligatoire pour travailler",en:"Required to work",         es:"Obligatorio para trabajar"},  urgency:"critical",time:10, weight:25},
    {id:"phone",     label:{fr:"Carte SIM / Téléphone US",        en:"SIM Card / US Phone Number",     es:"SIM / Número de teléfono US"},    desc:{fr:"T-Mobile ou Mint Mobile",   en:"T-Mobile or Mint Mobile",   es:"T-Mobile o Mint Mobile"},     urgency:"critical",time:1,  weight:10},
    {id:"bank",      label:{fr:"Compte bancaire",                 en:"Bank Account",                   es:"Cuenta bancaria"},                desc:{fr:"Chase ou Bank of America",  en:"Chase or Bank of America",  es:"Chase o Bank of America"},    urgency:"high",    time:14, weight:15},
    {id:"greencard", label:{fr:"Green Card physique",             en:"Physical Green Card",             es:"Green Card física"},               desc:{fr:"Courrier USCIS",            en:"USCIS mail",                es:"Correo USCIS"},               urgency:"high",    time:21, weight:10},
    {id:"housing",   label:{fr:"Logement permanent",              en:"Permanent Housing",               es:"Vivienda permanente"},             desc:{fr:"Appartement ou maison",     en:"Apartment or house",        es:"Apartamento o casa"},         urgency:"normal",  time:30, weight:15},
    {id:"job",       label:{fr:"Trouver un emploi",               en:"Find a Job",                      es:"Encontrar trabajo"},               desc:{fr:"LinkedIn et Indeed",        en:"LinkedIn and Indeed",       es:"LinkedIn e Indeed"},          urgency:"normal",  time:90, weight:15},
    {id:"license",   label:{fr:"Permis de conduire",              en:"Driver License",                  es:"Licencia de conducir"},            desc:{fr:"Examen DMV",                en:"DMV exam",                  es:"Examen DMV"},                 urgency:"normal",  time:45, weight:10},
  ],
  2:[
    {id:"credit_score",       label:{fr:"Credit Score — objectif 700+",     en:"Credit Score — target 700+",      es:"Puntaje de crédito — objetivo 700+"},  desc:{fr:"Secured credit card",           en:"Secured credit card",          es:"Tarjeta de crédito asegurada"},  urgency:"high",    time:30,  weight:20},
    {id:"taxes_first",        label:{fr:"Taxes IRS — première déclaration", en:"First IRS tax return",            es:"Primera declaración de impuestos IRS"},desc:{fr:"Deadline 15 avril chaque année",en:"Deadline April 15 every year", es:"Fecha límite 15 de abril"},       urgency:"critical",time:90,  weight:25},
    {id:"health_insurance",   label:{fr:"Assurance santé",                  en:"Health Insurance",                es:"Seguro de salud"},                     desc:{fr:"Marketplace ou employeur",      en:"Marketplace or employer",      es:"Marketplace o empleador"},       urgency:"high",    time:60,  weight:20},
    {id:"diploma_recognition",label:{fr:"Reconnaissance de diplôme",        en:"Degree recognition",              es:"Reconocimiento de título"},            desc:{fr:"WES ou ECE evaluation",         en:"WES or ECE evaluation",        es:"Evaluación WES o ECE"},          urgency:"normal",  time:90,  weight:15},
    {id:"savings_account",    label:{fr:"Compte épargne (Savings)",         en:"Savings Account",                 es:"Cuenta de ahorros"},                   desc:{fr:"Objectif 3 mois de salaire",    en:"Target 3 months salary",       es:"Objetivo 3 meses de salario"},   urgency:"normal",  time:60,  weight:10},
    {id:"real_id",            label:{fr:"REAL ID — pour prendre l'avion",   en:"REAL ID — for domestic flights",  es:"REAL ID — para vuelos domésticos"},    desc:{fr:"Requis depuis mai 2025",         en:"Required since May 2025",      es:"Requerido desde mayo 2025"},     urgency:"high",    time:30,  weight:10},
  ],
  3:[
    {id:"buy_house",      label:{fr:"Acheter une maison",              en:"Buy a house",            es:"Comprar una casa"},              desc:{fr:"Mortgage et down payment",      en:"Mortgage and down payment",    es:"Hipoteca y pago inicial"},        urgency:"normal",  time:365, weight:20},
    {id:"family_petition",label:{fr:"Faire venir sa famille (I-130)", en:"Bring family (I-130)",   es:"Traer familia (I-130)"},         desc:{fr:"Petition pour conjoint/enfants",en:"Petition for spouse/children", es:"Petición para cónyuge/hijos"},    urgency:"normal",  time:180, weight:20},
    {id:"taxes_annual",   label:{fr:"Taxes IRS annuelles ✓",           en:"Annual IRS taxes ✓",     es:"Impuestos IRS anuales ✓"},       desc:{fr:"Chaque année avant le 15 avril",en:"Every year before April 15",  es:"Cada año antes del 15 de abril"},urgency:"critical",time:365, weight:20},
    {id:"create_llc",     label:{fr:"Créer son entreprise (LLC)",      en:"Start a business (LLC)", es:"Crear empresa (LLC)"},           desc:{fr:"Secretary of State",            en:"Secretary of State",           es:"Secretario de Estado"},          urgency:"normal",  time:180, weight:15},
    {id:"vote_register",  label:{fr:"S'inscrire pour voter",           en:"Register to vote",       es:"Registrarse para votar"},        desc:{fr:"Droit de vote Green Card",      en:"Green Card voting rights",     es:"Derechos de voto Green Card"},   urgency:"normal",  time:90,  weight:10},
    {id:"invest",         label:{fr:"Commencer à investir",            en:"Start investing",         es:"Empezar a invertir"},            desc:{fr:"401k, IRA, ETFs",               en:"401k, IRA, ETFs",              es:"401k, IRA, ETFs"},               urgency:"normal",  time:180, weight:15},
  ],
  4:[
    {id:"citizenship_eligible",label:{fr:"Vérifier éligibilité N-400",   en:"Check N-400 eligibility",   es:"Verificar elegibilidad N-400"},  desc:{fr:"5 ans de Green Card minimum",   en:"5 years Green Card minimum",   es:"5 años de Green Card mínimo"},   urgency:"high",    time:30,  weight:20},
    {id:"taxes_annual_4",      label:{fr:"Taxes IRS annuelles ✓",        en:"Annual IRS taxes ✓",        es:"Impuestos IRS anuales ✓"},       desc:{fr:"Chaque année avant le 15 avril",en:"Every year before April 15",  es:"Cada año antes del 15 de abril"},urgency:"critical",time:365, weight:15},
    {id:"n400_form",           label:{fr:"Formulaire N-400",             en:"Form N-400",                es:"Formulario N-400"},               desc:{fr:"Demande de naturalisation",     en:"Naturalization application",   es:"Solicitud de naturalización"},   urgency:"high",    time:90,  weight:20},
    {id:"civic_test",          label:{fr:"Test civique (100 questions)", en:"Civic test (100 questions)",es:"Test cívico (100 preguntas)"},    desc:{fr:"Histoire et gouvernement US",   en:"US history and government",    es:"Historia y gobierno de EE.UU."}, urgency:"high",    time:60,  weight:20},
    {id:"oath",                label:{fr:"Cérémonie du serment",         en:"Oath ceremony",             es:"Ceremonia del juramento"},        desc:{fr:"Tu deviens citoyen américain !",en:"You become a US citizen!",    es:"¡Te conviertes en ciudadano!"},  urgency:"normal",  time:30,  weight:15},
    {id:"us_passport",         label:{fr:"Passeport américain",          en:"US Passport",               es:"Pasaporte americano"},            desc:{fr:"Voyager sans visa",             en:"Travel without visa",          es:"Viajar sin visa"},               urgency:"normal",  time:60,  weight:10},
  ],
  5:[
    {id:"renew_greencard",   label:{fr:"Renouveler Green Card (I-90)", en:"Renew Green Card (I-90)",   es:"Renovar Green Card (I-90)"},      desc:{fr:"Tous les 10 ans",               en:"Every 10 years",               es:"Cada 10 años"},                  urgency:"high",    time:180, weight:20},
    {id:"taxes_lifetime",    label:{fr:"Taxes IRS — chaque année ✓",  en:"IRS taxes — every year ✓", es:"Impuestos IRS — cada año ✓"},     desc:{fr:"15 avril — sans exception",     en:"April 15 — no exception",     es:"15 de abril — sin excepción"},   urgency:"critical",time:365, weight:25},
    {id:"renew_passport_us", label:{fr:"Renouveler passeport US",      en:"Renew US passport",        es:"Renovar pasaporte americano"},    desc:{fr:"Tous les 10 ans",               en:"Every 10 years",               es:"Cada 10 años"},                  urgency:"normal",  time:180, weight:15},
    {id:"update_address",    label:{fr:"Mettre à jour adresse USCIS", en:"Update USCIS address",     es:"Actualizar dirección USCIS"},     desc:{fr:"En cas de déménagement",        en:"When you move",                es:"Cuando te mudes"},               urgency:"normal",  time:30,  weight:10},
    {id:"community",         label:{fr:"Communauté Kuabo",             en:"Kuabo Community",          es:"Comunidad Kuabo"},                desc:{fr:"Aide les nouveaux immigrants",  en:"Help new immigrants",          es:"Ayuda a nuevos inmigrantes"},    urgency:"normal",  time:0,   weight:30},
  ],
};

// ══════════════════════════════════════════════
// ARMY GUIDE
// ══════════════════════════════════════════════
const ARMY_GUIDE: Record<string,Record<Lang,{title:string;desc:string;steps:string[];tip:string}>> = {
  army:{
    fr:{title:"🎖️ Ton parcours Army + DV",desc:"Tu es dans l'US Army avec une DV Lottery. Tu as des avantages uniques.",steps:["Logement fourni sur la base militaire — pas besoin de chercher un appartement","SSN fourni par l'Army dès ton enrôlement","TRICARE couvre toi et ta famille gratuitement","Naturalisation possible après seulement 1 an de service actif","Salaire garanti dès le premier jour"],tip:"Parle au JAG Officer (avocat militaire gratuit) pour toutes tes questions légales."},
    en:{title:"🎖️ Your Army + DV Journey",desc:"You're in the US Army with a DV Lottery. You have unique advantages.",steps:["Housing provided on base — no need to find an apartment","SSN provided by the Army upon enlistment","TRICARE covers you and your family for free","Citizenship possible after just 1 year of active duty","Salary guaranteed from day one"],tip:"Talk to your JAG Officer (free military lawyer) for all your legal questions."},
    es:{title:"🎖️ Tu camino Army + DV",desc:"Estás en el US Army con una DV Lottery. Tienes ventajas únicas.",steps:["Alojamiento en la base militar — no necesitas buscar apartamento","SSN proporcionado por el Army al alistarte","TRICARE te cubre a ti y a tu familia gratis","Ciudadanía posible después de solo 1 año de servicio activo","Salario garantizado desde el primer día"],tip:"Habla con el JAG Officer (abogado militar gratuito) para tus preguntas legales."},
  },
  army_interest:{
    fr:{title:"🤔 Rejoindre l'Army avec une DV",desc:"Voilà comment t'engager dans l'US Army avec ton statut DV.",steps:["Va sur goarmy.com ou trouve un recruteur dans ta ville","Tu dois avoir 17-35 ans et parler anglais correctement","Passe le test ASVAB (test d'aptitude militaire)","Choisis ta spécialité (MOS) selon tes compétences","Commence le Boot Camp — 10 semaines de formation de base"],tip:"L'Army offre la naturalisation accélérée en 1 an — un énorme avantage pour les détenteurs de DV."},
    en:{title:"🤔 Join the Army with a DV",desc:"Here's how to enlist in the US Army with your DV status.",steps:["Go to goarmy.com or find a recruiter in your city","You must be 17-35 years old and speak English adequately","Take the ASVAB test (military aptitude test)","Choose your specialty (MOS) based on your skills","Start Boot Camp — 10 weeks of basic training"],tip:"The Army offers fast-track naturalization in 1 year — a huge advantage for DV holders."},
    es:{title:"🤔 Unirse al Army con una DV",desc:"Así es como alistarte en el US Army con tu estatus DV.",steps:["Ve a goarmy.com o encuentra un reclutador en tu ciudad","Debes tener 17-35 años y hablar inglés adecuadamente","Toma el examen ASVAB (prueba de aptitud militar)","Elige tu especialidad (MOS) según tus habilidades","Comienza el Boot Camp — 10 semanas de entrenamiento básico"],tip:"El Army ofrece naturalización acelerada en 1 año — una enorme ventaja para los titulares de DV."},
  },
  army_unsure:{
    fr:{title:"❓ Army — les infos clés",desc:"Tu hésites encore. Voilà ce que tu dois savoir avant de décider.",steps:["L'Army accepte les détenteurs de DV Lottery — c'est un avantage rare","Tu gardes tes droits de résident permanent même en servant","La naturalisation accélérée est disponible après 1 an","Tu peux refuser et continuer ton parcours DV classique","Prends le temps de te renseigner sans pression"],tip:"Tu peux changer d'avis plus tard. Kuabo sera là pour t'aider quelle que soit ta décision."},
    en:{title:"❓ Army — key information",desc:"You're still undecided. Here's what you need to know.",steps:["The Army accepts DV Lottery holders — this is a rare advantage","You keep your permanent resident rights even while serving","Fast-track naturalization is available after 1 year","You can decline and continue your classic DV path","Take time to learn without pressure"],tip:"You can change your mind later. Kuabo will be here to help you whatever you decide."},
    es:{title:"❓ Army — información clave",desc:"Todavía estás indeciso. Esto es lo que necesitas saber.",steps:["El Army acepta titulares de DV Lottery — esta es una ventaja rara","Conservas tus derechos de residente permanente incluso mientras sirves","La naturalización acelerada está disponible después de 1 año","Puedes declinar y continuar tu camino DV clásico","Tómate tiempo para informarte sin presión"],tip:"Puedes cambiar de opinión más tarde. Kuabo estará aquí para ayudarte."},
  },
};

// ══════════════════════════════════════════════
// BADGES
// ══════════════════════════════════════════════
const BADGES: Record<string,{emoji:string;label:Record<Lang,string>}> = {
  ssn:             {emoji:"🪪",label:{fr:"SSN",        en:"SSN",       es:"SSN"        }},
  phone:           {emoji:"📱",label:{fr:"Connecté",   en:"Connected", es:"Conectado"  }},
  bank:            {emoji:"🏦",label:{fr:"Banque",     en:"Bank",      es:"Banco"      }},
  greencard:       {emoji:"💳",label:{fr:"Résident",   en:"Resident",  es:"Residente"  }},
  housing:         {emoji:"🏠",label:{fr:"Logement",   en:"Home",      es:"Hogar"      }},
  job:             {emoji:"💼",label:{fr:"Emploi",     en:"Job",       es:"Trabajo"    }},
  license:         {emoji:"🚗",label:{fr:"Permis",     en:"License",   es:"Licencia"   }},
  credit_score:    {emoji:"📈",label:{fr:"Crédit",     en:"Credit",    es:"Crédito"    }},
  taxes_first:     {emoji:"📊",label:{fr:"Taxes ✓",   en:"Taxes ✓",   es:"Impuestos ✓"}},
  n400_form:       {emoji:"🇺🇸",label:{fr:"N-400",    en:"N-400",     es:"N-400"      }},
  oath:            {emoji:"🤝",label:{fr:"Citoyen",   en:"Citizen",   es:"Ciudadano"  }},
};

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════
function useScrollToTop(tab: Tab) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [tab]);
}

function useStreak(userId: string | undefined) {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const today = new Date().toDateString();
    const key = "kuabo_streak_" + userId;
    const dateKey = "kuabo_streak_date_" + userId;
    const lastDate = localStorage.getItem(dateKey);
    const saved = parseInt(localStorage.getItem(key) || "0");
    if (lastDate === today) { setStreak(saved); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const next = lastDate === yesterday.toDateString() ? saved + 1 : 1;
    localStorage.setItem(key, String(next));
    localStorage.setItem(dateKey, today);
    setStreak(next);
  }, [userId]);
  return streak;
}

function getPhaseStats(completedSteps: string[]) {
  const phaseIds: PhaseId[] = [1, 2, 3, 4, 5];
  let currentPhase: PhaseId = 1;
  const phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }> = {} as any;
  phaseIds.forEach(pid => {
    const steps = PHASE_STEPS[pid];
    const done = steps.filter(s => completedSteps.includes(s.id)).length;
    const total = steps.length;
    phaseProgress[pid] = { done, total, pct: Math.round((done / total) * 100) };
  });
  for (const pid of phaseIds) {
    if (phaseProgress[pid].pct < 100) { currentPhase = pid; break; }
    currentPhase = 5;
  }
  return { currentPhase, phaseProgress };
}

function isPhaseUnlocked(phaseId: PhaseId, completedSteps: string[]): boolean {
  if (phaseId === 1) return true;
  const prev = (phaseId - 1) as PhaseId;
  return PHASE_STEPS[prev].every(s => completedSteps.includes(s.id));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function getDaysLeft(dateStr: string, days: number): number {
  const deadline = new Date(dateStr);
  deadline.setDate(deadline.getDate() + days);
  return Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

// ══════════════════════════════════════════════
// STEP MODAL
// ══════════════════════════════════════════════
function StepModal({ stepId, lang, completedSteps, onToggle, onClose }: {
  stepId: string | null; lang: Lang; completedSteps: string[];
  onToggle: (id: string) => void; onClose: () => void;
}) {
  if (!stepId) return null;
  const guide = STEP_GUIDES[stepId];
  const allSteps = [...PHASE_STEPS[1], ...PHASE_STEPS[2], ...PHASE_STEPS[3], ...PHASE_STEPS[4], ...PHASE_STEPS[5]];
  const stepData = allSteps.find(s => s.id === stepId);
  if (!stepData || !guide) return null;
  const isDone = completedSteps.includes(stepId);
  const urgColor = stepData.urgency === "critical" ? "#ef4444" : stepData.urgency === "high" ? "#f97316" : "#e8b84b";
  const L = {
    fr: { why: "Pourquoi c'est important", done: "✅ Marquer comme fait", undone: "↩️ Retirer", guide: "📖 Voir le guide complet →", explorer: "🗺️ Trouver un bureau", close: "Fermer" },
    en: { why: "Why it's important", done: "✅ Mark as done", undone: "↩️ Remove", guide: "📖 View full guide →", explorer: "🗺️ Find an office", close: "Close" },
    es: { why: "Por qué es importante", done: "✅ Marcar como hecho", undone: "↩️ Quitar", guide: "📖 Ver guía completa →", explorer: "🗺️ Encontrar una oficina", close: "Cerrar" },
  }[lang];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480, animation: "slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: urgColor, flexShrink: 0 }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f1ec" }}>{stepData.label[lang]}</div>
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 14, paddingLeft: 18 }}>{stepData.desc[lang]}</div>
        <div style={{ background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>💡 {L.why}</div>
          <div style={{ fontSize: 12, color: "#f4f1ec", lineHeight: 1.8 }}>{guide.why[lang]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => { onToggle(stepId); onClose(); }} style={{ width: "100%", padding: "13px", background: isDone ? "#141d2e" : "#22c55e", border: isDone ? "1px solid #1e2a3a" : "none", borderRadius: 12, color: isDone ? "#aaa" : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {isDone ? L.undone : L.done}
          </button>
          {guide.guideUrl && <button onClick={() => { onClose(); window.location.href = guide.guideUrl!; }} style={{ width: "100%", padding: "13px", background: "#e8b84b", border: "none", borderRadius: 12, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{L.guide}</button>}
          {guide.explorerType && <button onClick={() => { onClose(); window.location.href = `/near/${guide.explorerType}`; }} style={{ width: "100%", padding: "12px", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 12, color: "#2dd4bf", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗺️ {L.explorer}</button>}
          <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{L.close}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ARMY GUIDE MODAL
// ══════════════════════════════════════════════
function ArmyGuideModal({ armyStatus, lang, onClose }: { armyStatus: string | null; lang: Lang; onClose: () => void; }) {
  if (!armyStatus) return null;
  const guide = ARMY_GUIDE[armyStatus]; if (!guide) return null;
  const g = guide[lang];
  const color = armyStatus === "army" ? "#22c55e" : "#2dd4bf";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 700, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" as const, animation: "slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: "#f4f1ec", marginBottom: 5 }}>{g.title}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, lineHeight: 1.5 }}>{g.desc}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {g.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "#141d2e", border: `1px solid ${color}20`, borderRadius: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${color}15`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: "#f4f1ec", lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>
        <div style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10, padding: "11px 13px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 3 }}>💡 TIP</div>
          <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.6 }}>{g.tip}</div>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          {lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PHASE UNLOCK OVERLAY
// ══════════════════════════════════════════════
function PhaseUnlockOverlay({ phaseId, lang, onDone }: { phaseId: PhaseId | null; lang: Lang; onDone: () => void; }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!phaseId) return;
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(onDone, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [phaseId, onDone]);
  if (!phaseId) return null;
  const meta = PHASES_META[phaseId];
  const nextId = (phaseId + 1) as PhaseId;
  const nextMeta = phaseId < 5 ? PHASES_META[nextId] : null;
  const msg = meta.unlockMsg[lang];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.8,
    dur: 1.5 + Math.random() * 1.2,
    color: ["#e8b84b", "#22c55e", "#2dd4bf", "#f97316", "#a78bfa", "#f472b6", "#60a5fa"][i % 7],
    size: 8 + Math.random() * 10, rot: Math.random() * 360,
  }));
  return (
    <>
      <style>{`@keyframes phaseConfetti{0%{transform:translateY(-30px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(900deg);opacity:0}}@keyframes phasePop{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}20%{transform:translate(-50%,-50%) scale(1.1);opacity:1}50%{transform:translate(-50%,-50%) scale(1)}80%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(0.9);opacity:0}}@keyframes phaseBg{0%{opacity:0}10%{opacity:1}80%{opacity:1}100%{opacity:0}}@keyframes phaseEmoji{0%{transform:scale(0) rotate(-20deg)}50%{transform:scale(1.3) rotate(5deg)}100%{transform:scale(1) rotate(0deg)}}@keyframes phaseSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes phaseRing{0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.8}100%{transform:translate(-50%,-50%) scale(3);opacity:0}}@keyframes phaseBar{from{width:0%}to{width:100%}}`}</style>
      <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", animation: "phaseBg 4.2s ease forwards", cursor: "pointer" }} />
      {step >= 1 && particles.map(p => <div key={p.id} style={{ position: "fixed", left: p.x + "%", top: "-30px", width: p.size, height: p.size, borderRadius: "50%", background: p.color, zIndex: 2001, pointerEvents: "none", animation: `phaseConfetti ${p.dur}s ${p.delay}s ease-in forwards`, transform: `rotate(${p.rot}deg)` }} />)}
      <div style={{ position: "fixed", top: "50%", left: "50%", width: 200, height: 200, borderRadius: "50%", border: `4px solid ${meta.color}`, zIndex: 2001, pointerEvents: "none", animation: "phaseRing 1s ease-out forwards" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", zIndex: 2002, pointerEvents: "none", animation: "phasePop 4.2s cubic-bezier(.34,1.56,.64,1) forwards", width: 320 }}>
        <div style={{ background: "linear-gradient(135deg,#0a0e1a,#141d2e)", border: `2px solid ${meta.color}60`, borderRadius: 28, padding: "32px 24px 24px", textAlign: "center", boxShadow: `0 32px 80px rgba(0,0,0,0.8),0 0 60px ${meta.color}20` }}>
          {step >= 1 && <div style={{ fontSize: 68, marginBottom: 8, display: "inline-block", animation: "phaseEmoji 0.6s cubic-bezier(.34,1.56,.64,1)" }}>{meta.emoji}</div>}
          {step >= 1 && <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: meta.color, fontWeight: 700, marginBottom: 8 }}>✅ {lang === "fr" ? "COMPLÉTÉE" : lang === "es" ? "COMPLETADA" : "COMPLETED"}</div>}
          {step >= 2 && <div style={{ fontSize: 22, fontWeight: 900, color: "#f4f1ec", marginBottom: 8, lineHeight: 1.2, animation: "phaseSlide 0.4s ease" }}>{msg.title}</div>}
          {step >= 3 && <div style={{ fontSize: 12, color: "rgba(244,241,236,0.7)", lineHeight: 1.7, marginBottom: 18, animation: "phaseSlide 0.4s ease" }}>{msg.msg}</div>}
          {step >= 3 && nextMeta && (
            <div style={{ background: `${nextMeta.color}15`, border: `1px solid ${nextMeta.color}40`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, animation: "phaseSlide 0.5s ease" }}>
              <div style={{ fontSize: 10, color: nextMeta.color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 3 }}>🔓 {lang === "fr" ? "DÉBLOQUÉ" : lang === "es" ? "DESBLOQUEADO" : "UNLOCKED"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f1ec" }}>{nextMeta.emoji} Phase {nextId} — {nextMeta.name[lang]}</div>
            </div>
          )}
          <div style={{ height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(to right,${meta.color},${nextMeta?.color || meta.color})`, borderRadius: 3, animation: "phaseBar 4.2s linear forwards" }} />
          </div>
          <div style={{ fontSize: 10, color: "#333", marginTop: 6 }}>{lang === "fr" ? "Tape pour continuer" : lang === "es" ? "Toca para continuar" : "Tap to continue"}</div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// CIRCULAR HERO
// ══════════════════════════════════════════════
function CircularHero({ currentPhase, phaseProgress, lang }: {
  currentPhase: PhaseId;
  phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }>;
  lang: Lang;
}) {
  const meta = PHASES_META[currentPhase];
  const prog = phaseProgress[currentPhase];
  const size = 88, sw = 7, r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (prog.pct / 100) * circ;
  const nextPhase = (currentPhase + 1) as PhaseId;
  const nextMeta = currentPhase < 5 ? PHASES_META[nextPhase] : null;
  const leftCount = prog.total - prog.done;
  const L = {
    fr: { done: `${prog.done} étape${prog.done !== 1 ? "s" : ""} complétée${prog.done !== 1 ? "s" : ""}`, left: leftCount === 0 ? "Toutes complétées ! 🎉" : `${leftCount} restante${leftCount !== 1 ? "s" : ""} pour débloquer` },
    en: { done: `${prog.done} step${prog.done !== 1 ? "s" : ""} completed`, left: leftCount === 0 ? "All completed! 🎉" : `${leftCount} left to unlock` },
    es: { done: `${prog.done} paso${prog.done !== 1 ? "s" : ""} completado${prog.done !== 1 ? "s" : ""}`, left: leftCount === 0 ? "¡Todos completados! 🎉" : `${leftCount} restante${leftCount !== 1 ? "s" : ""} para desbloquear` },
  }[lang];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(135deg,#141d2e,#0f1521)", border: `1px solid ${meta.color}30`, borderRadius: 18, padding: "16px", marginBottom: 12, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20px", right: "-20px", width: 80, height: 80, background: `radial-gradient(circle,${meta.color}08,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={meta.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{prog.pct}%</div>
          <div style={{ fontSize: 8, color: "#aaa", marginTop: 2, letterSpacing: "0.04em" }}>Phase {currentPhase}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: meta.color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 3 }}>{meta.emoji} Phase {currentPhase} — {meta.name[lang]}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f1ec", marginBottom: 3 }}>{L.done}</div>
        <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>
          {nextMeta ? `${L.left} ${nextMeta.emoji} ${nextMeta.name[lang]}` : L.left}
        </div>
        <div style={{ height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden", marginTop: 10 }}>
          <div style={{ height: "100%", width: prog.pct + "%", background: `linear-gradient(to right,${meta.color},${nextMeta?.color || meta.color})`, borderRadius: 3, transition: "width 0.8s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// COUNTDOWN SECTION
// ══════════════════════════════════════════════
function CountdownSection({ arrivalDate, lang, completedSteps, onOpenStep }: {
  arrivalDate: string | null; lang: Lang; completedSteps: string[]; onOpenStep: (id: string) => void;
}) {
  if (!arrivalDate) return null;
  const allDeadlines = [
    { id: "ssn", days: 10 }, { id: "phone", days: 1 }, { id: "bank", days: 14 },
    { id: "greencard", days: 21 }, { id: "housing", days: 30 }, { id: "license", days: 45 }, { id: "job", days: 90 },
    { id: "taxes_first", days: 90 }, { id: "real_id", days: 60 }, { id: "credit_score", days: 60 },
    { id: "taxes_annual", days: 365 }, { id: "taxes_annual_4", days: 365 }, { id: "taxes_lifetime", days: 365 },
    { id: "renew_greencard", days: 3650 },
  ];
  const allPhaseSteps = [...PHASE_STEPS[1], ...PHASE_STEPS[2], ...PHASE_STEPS[3], ...PHASE_STEPS[4], ...PHASE_STEPS[5]];
  const pending = allDeadlines
    .filter(d => !completedSteps.includes(d.id))
    .map(d => ({ ...d, daysLeft: getDaysLeft(arrivalDate, d.days), dateStr: addDays(arrivalDate, d.days) }))
    .filter(d => d.daysLeft <= 45)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (pending.length === 0) return null;
  const urgent = pending[0];
  const others = pending.slice(1, 4);
  const isOverdue = urgent.daysLeft < 0;
  const urgColor = isOverdue || urgent.daysLeft <= 3 ? "#ef4444" : urgent.daysLeft <= 10 ? "#f97316" : "#e8b84b";
  const urgentStep = allPhaseSteps.find(s => s.id === urgent.id);
  if (!urgentStep) return null;
  const stepEmoji: Record<string, string> = { ssn: "🪪", bank: "🏦", greencard: "💳", housing: "🏠", phone: "📱", job: "💼", license: "🚗", taxes_first: "📊", real_id: "🪪", credit_score: "📈", taxes_annual: "📊", taxes_annual_4: "📊", taxes_lifetime: "📊", renew_greencard: "💳" };
  const L = {
    fr: { urgentTitle: "Étape urgente à régler", overdue: "En retard !", days: "jours restants", deadline: "Deadline", next: "Prochaines deadlines", done: "Fait", guide: "Guide" },
    en: { urgentTitle: "Urgent step to complete", overdue: "Overdue!", days: "days left", deadline: "Deadline", next: "Upcoming deadlines", done: "Done", guide: "Guide" },
    es: { urgentTitle: "Paso urgente a completar", overdue: "¡Atrasado!", days: "días restantes", deadline: "Fecha límite", next: "Próximas fechas límite", done: "Hecho", guide: "Guía" },
  }[lang];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ background: `${urgColor}08`, border: `1px solid ${urgColor}35`, borderRadius: 14, padding: "14px", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: urgColor, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>⏱ {L.urgentTitle}</div>
          <div style={{ fontSize: 9, color: "#555" }}>{L.deadline} : {urgent.dateStr}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 32, flexShrink: 0 }}>{stepEmoji[urgent.id] || "📋"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{urgentStep.label[lang]}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: urgColor, lineHeight: 1 }}>{isOverdue ? L.overdue : `${Math.abs(urgent.daysLeft)}`}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{!isOverdue && L.days}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onOpenStep(urgent.id)} style={{ flex: 1, padding: "9px 8px", background: "#22c55e", border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✅ {L.done}</button>
          <button onClick={() => onOpenStep(urgent.id)} style={{ flex: 1, padding: "9px 8px", background: "#e8b84b", border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📖 {L.guide}</button>
          {STEP_GUIDES[urgent.id]?.explorerType && (
            <button onClick={() => window.location.href = `/near/${STEP_GUIDES[urgent.id].explorerType}`} style={{ padding: "9px 10px", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 10, color: "#2dd4bf", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>🗺️</button>
          )}
        </div>
      </div>
      {others.length > 0 && (
        <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 600 }}>📅 {L.next}</div>
          {others.map((d, i) => {
            const s = allPhaseSteps.find(st => st.id === d.id);
            const dc = d.daysLeft <= 7 ? "#ef4444" : d.daysLeft <= 14 ? "#f97316" : "#e8b84b";
            return (
              <div key={d.id} onClick={() => onOpenStep(d.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < others.length - 1 ? "1px solid #1a2438" : "none", cursor: "pointer" }}>
                <div style={{ fontSize: 12, color: "#aaa" }}>{d.daysLeft <= 7 ? "🔴" : d.daysLeft <= 14 ? "🟠" : "🟡"} {s?.label[lang] || d.id}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: dc }}>{d.daysLeft} {lang === "fr" ? "j" : "d"} →</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ARMY BANNER
// ══════════════════════════════════════════════
function ArmyBanner({ armyStatus, lang, onViewGuide }: { armyStatus: string; lang: Lang; onViewGuide: () => void; }) {
  const guide = ARMY_GUIDE[armyStatus]; if (!guide) return null;
  const g = guide[lang];
  const color = armyStatus === "army" ? "#22c55e" : "#2dd4bf";
  const badge = {
    fr: { army: "🎖️ Soldat actif", army_interest: "🤔 Intéressé par l'Army", army_unsure: "❓ Army — à explorer" },
    en: { army: "🎖️ Active soldier", army_interest: "🤔 Interested in Army", army_unsure: "❓ Army — to explore" },
    es: { army: "🎖️ Soldado activo", army_interest: "🤔 Interesado en Army", army_unsure: "❓ Army — por explorar" },
  }[lang][armyStatus as "army" | "army_interest" | "army_unsure"] || "🎖️ Army";
  const btnL = { fr: "Voir mon guide Army →", en: "View my Army guide →", es: "Ver mi guía Army →" }[lang];
  return (
    <div style={{ background: `${color}06`, border: `1px solid ${color}25`, borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 5 }}>{badge}</div>
      <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5, marginBottom: 8 }}>{g.desc}</div>
      <button onClick={onViewGuide} style={{ width: "100%", padding: "9px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 10, color, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{btnL}</button>
    </div>
  );
}

// ══════════════════════════════════════════════
// AD BANNER — depuis Firestore admin_banners
// ══════════════════════════════════════════════
function AdBanner({ lang, userState, userCountry }: { lang: Lang; userState: string; userCountry: string; }) {
  const [ad, setAd] = useState<any>(null);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const snap = await getDocs(collection(db, "admin_banners"));
        let found: any = null;
        snap.forEach(d => {
          const data = d.data() as any;
          if (!data.active) return;
          if ((data.state === "ALL" || data.state === userState) && (data.country === "ALL" || data.country === userCountry)) {
            found = { id: d.id, ...data };
          }
        });
        setAd(found);
      } catch { /**/ }
      setLoaded(true);
    };
    fetchAd();
  }, [userState, userCountry]);
  if (!loaded || !ad || closed) return null;
  const title = ad["title_" + lang] || ad.title_fr || ad.title || "";
  const subtitle = ad["subtitle_" + lang] || ad.subtitle_fr || ad.subtitle || "";
  const cta = ad["cta_" + lang] || ad.cta_fr || ad.cta || "";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 8, color: "#333", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3, textAlign: "right" as const }}>
        {lang === "fr" ? "Publicité · Partenaire Kuabo" : lang === "es" ? "Publicidad · Socio Kuabo" : "Ad · Kuabo Partner"}
      </div>
      <div style={{ position: "relative", width: "100%", height: 100, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(232,184,75,0.1)", cursor: "pointer", display: "flex", background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}
        onClick={() => ad.link_url && window.open(ad.link_url, "_blank")}>
        <button onClick={e => { e.stopPropagation(); setClosed(true); }} style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", color: "#aaa", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, fontFamily: "inherit" }}>✕</button>
        {ad.image_url ? (
          <img src={ad.image_url} alt={title} style={{ width: 100, height: 100, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 100, height: 100, background: "rgba(232,184,75,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>📢</div>
        )}
        <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 2 }}>
            {lang === "fr" ? "Partenaire officiel" : lang === "es" ? "Socio oficial" : "Official Partner"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f1ec", marginBottom: 2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>{subtitle}</div>}
          {cta && <div style={{ fontSize: 10, color: "#e8b84b", fontWeight: 600 }}>{cta} →</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PHASE CARD
// ══════════════════════════════════════════════
function PhaseCard({ phaseId, lang, completedSteps, onOpenStep, isActive, isUnlocked }: {
  phaseId: PhaseId; lang: Lang; completedSteps: string[];
  onOpenStep: (id: string) => void; isActive: boolean; isUnlocked: boolean;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const meta = PHASES_META[phaseId];
  const steps = PHASE_STEPS[phaseId];
  const done = steps.filter(s => completedSteps.includes(s.id)).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);
  const isComplete = pct === 100;
  const L = {
    fr: { locked: "🔒 Termine la phase précédente d'abord", steps: "étapes", inProgress: "En cours" },
    en: { locked: "🔒 Complete previous phase first", steps: "steps", inProgress: "In progress" },
    es: { locked: "🔒 Completa la fase anterior primero", steps: "pasos", inProgress: "En curso" },
  }[lang];
  return (
    <div style={{ marginBottom: 8, background: isActive ? "#141d2e" : isComplete ? "rgba(34,197,94,0.05)" : "#0f1521", border: `1px solid ${isActive ? meta.color + "50" : isComplete ? "rgba(34,197,94,0.2)" : "#1e2a3a"}`, borderRadius: 14, overflow: "hidden", opacity: isUnlocked ? 1 : 0.55, transition: "all 0.3s" }}>
      <div onClick={() => isUnlocked && setExpanded(!expanded)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: isUnlocked ? "pointer" : "default" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: isUnlocked ? `${meta.color}12` : "#1a2438", border: `1.5px solid ${isUnlocked ? meta.color + "35" : "#2a3448"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {isUnlocked ? meta.emoji : <Lock size={16} color="#555" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
            <span style={{ fontSize: 9, color: meta.color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Phase {phaseId}</span>
            {isComplete && <span style={{ fontSize: 9, color: "#22c55e" }}>✅</span>}
            {isActive && !isComplete && <span style={{ fontSize: 9, color: meta.color, background: `${meta.color}15`, padding: "1px 5px", borderRadius: 8 }}>{L.inProgress}</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: isUnlocked ? "#f4f1ec" : "#555" }}>{meta.emoji} {meta.name[lang]}</div>
          {isUnlocked && <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{meta.desc[lang]}</div>}
          {!isUnlocked && <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{L.locked}</div>}
        </div>
        {isUnlocked && (
          <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: isComplete ? "#22c55e" : meta.color }}>{pct}%</div>
            <div style={{ fontSize: 9, color: "#555" }}>{done}/{total} {L.steps}</div>
          </div>
        )}
        {isUnlocked && <ChevronRight size={14} color="#555" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />}
      </div>
      {isUnlocked && (
        <div style={{ height: 3, background: "#1e2a3a", margin: "0 14px 10px" }}>
          <div style={{ height: "100%", width: pct + "%", background: isComplete ? "#22c55e" : meta.color, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
      )}
      {expanded && isUnlocked && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map(step => {
            const isDone = completedSteps.includes(step.id);
            const urgColor = step.urgency === "critical" ? "#ef4444" : step.urgency === "high" ? "#f97316" : meta.color;
            const guide = STEP_GUIDES[step.id];
            return (
              <div key={step.id} style={{ borderRadius: 10, background: isDone ? "rgba(34,197,94,0.04)" : "#141d2e", border: `1px solid ${isDone ? "rgba(34,197,94,0.15)" : "#1e2a3a"}`, overflow: "hidden" }}>
                <div onClick={() => onOpenStep(step.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", cursor: "pointer", opacity: isDone ? 0.65 : 1 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: isDone ? "#22c55e" : "transparent", border: `2px solid ${isDone ? "#22c55e" : urgColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    {isDone && <CheckCircle2 size={11} color="#fff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: isDone ? "#555" : "#f4f1ec", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{step.label[lang]}</div>
                    <div style={{ fontSize: 9, color: "#555", marginTop: 1 }}>{step.desc[lang]}</div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: isDone ? "#22c55e" : urgColor, flexShrink: 0 }}>{isDone ? "✅" : step.urgency === "critical" ? "🔴" : step.urgency === "high" ? "🟠" : "📋"}</div>
                </div>
                {!isDone && guide && (
                  <div style={{ display: "flex", gap: 5, padding: "0 10px 8px" }}>
                    <button onClick={e => { e.stopPropagation(); onOpenStep(step.id); }} style={{ flex: 1, padding: "5px 6px", background: "rgba(232,184,75,0.08)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 7, color: "#e8b84b", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>💡 {lang === "fr" ? "Pourquoi ?" : lang === "es" ? "¿Por qué?" : "Why?"}</button>
                    {guide.guideUrl && <button onClick={e => { e.stopPropagation(); window.location.href = guide.guideUrl!; }} style={{ flex: 1, padding: "5px 6px", background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 7, color: "#2dd4bf", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📖 {lang === "fr" ? "Guide" : lang === "es" ? "Guía" : "Guide"}</button>}
                    {guide.explorerType && <button onClick={e => { e.stopPropagation(); window.location.href = `/near/${guide.explorerType}`; }} style={{ padding: "5px 7px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 7, color: "#a78bfa", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>🗺️</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// BADGES ROW
// ══════════════════════════════════════════════
function BadgesRow({ completedSteps, lang }: { completedSteps: string[]; lang: Lang; }) {
  const earned = Object.entries(BADGES).filter(([id]) => completedSteps.includes(id));
  if (earned.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 7, fontWeight: 600 }}>🏆 {lang === "fr" ? "Mes badges" : lang === "es" ? "Mis insignias" : "My badges"}</div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
        {earned.map(([id, badge]) => (
          <div key={id} style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 9, padding: "5px 9px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13 }}>{badge.emoji}</span>
            <span style={{ fontSize: 9, color: "#aaa", fontWeight: 500 }}>{badge.label[lang]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// DAILY TIP
// ══════════════════════════════════════════════
function DailyTip({ lang, userState, userCountry }: { lang: Lang; userState: string; userCountry: string; }) {
  const TIPS: Record<Lang, string[]> = {
    fr: ["Attends 10 jours après l'arrivée avant d'aller au bureau SSA pour le SSN.", "Achète une SIM T-Mobile dès l'aéroport — pas besoin de SSN.", "Tu peux ouvrir un compte Chase avec ton passeport seulement.", "Ta Green Card physique arrivera par courrier USCIS en 2-3 semaines.", "Zillow et Apartments.com sont les meilleurs sites pour trouver un logement.", "LinkedIn et Indeed sont les meilleurs sites pour chercher un emploi aux USA.", "Commence à construire ton credit score avec une secured credit card.", "Garde toujours une copie numérique de tes documents importants.", "Medicaid est gratuit si tes revenus sont bas — renseigne-toi dès que possible.", "Pour le permis, passe d'abord l'examen théorique en ligne sur le site DMV.", "📊 Rappel : la deadline pour les taxes IRS est le 15 avril de chaque année !", "La REAL ID est obligatoire pour prendre l'avion aux USA depuis mai 2025."],
    en: ["Wait 10 days after arrival before going to the SSA office for your SSN.", "Buy a T-Mobile SIM at the airport — no SSN needed.", "You can open a Chase account with your passport only.", "Your physical Green Card will arrive by USCIS mail in 2-3 weeks.", "Zillow and Apartments.com are the best sites to find housing.", "LinkedIn and Indeed are the best job search sites in the USA.", "Start building your credit score with a secured credit card.", "Always keep a digital copy of your important documents.", "Medicaid is free if your income is low — check eligibility as soon as possible.", "For your license, take the written test online on the DMV website first.", "📊 Reminder: the IRS tax deadline is April 15 every year!", "REAL ID is required for domestic flights in the USA since May 2025."],
    es: ["Espera 10 días después de llegar antes de ir a la oficina SSA para tu SSN.", "Compra una SIM de T-Mobile en el aeropuerto — no necesitas SSN.", "Puedes abrir una cuenta en Chase solo con tu pasaporte.", "Tu Green Card física llegará por correo USCIS en 2-3 semanas.", "Zillow y Apartments.com son los mejores sitios para encontrar vivienda.", "LinkedIn e Indeed son los mejores sitios de búsqueda de empleo en EE.UU.", "Comienza a construir tu historial crediticio con una tarjeta de crédito asegurada.", "Siempre guarda una copia digital de tus documentos importantes.", "Medicaid es gratuito si tus ingresos son bajos — infórmate lo antes posible.", "Para la licencia, haz primero el examen teórico en línea en el sitio del DMV.", "📊 Recordatorio: ¡la fecha límite del IRS es el 15 de abril de cada año!", "REAL ID es obligatorio para vuelos domésticos en EE.UU. desde mayo 2025."],
  };
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const f = async () => {
      try {
        const snap = await getDocs(collection(db, "admin_messages"));
        let found: string | null = null;
        snap.forEach(d => {
          const data = d.data() as any;
          if (!data.active || data.type !== "conseil") return;
          if ((data.state === "ALL" || data.state === userState) && (data.country === "ALL" || data.country === userCountry))
            found = data["text_" + lang] || data.text_fr || null;
        });
        setAdminMsg(found);
      } catch { /**/ }
      setLoaded(true);
    };
    f();
  }, [lang, userState, userCountry]);
  const tip = adminMsg || TIPS[lang][new Date().getDate() % TIPS[lang].length];
  const isAdmin = !!adminMsg;
  return (
    <div style={{ background: isAdmin ? "rgba(232,184,75,0.05)" : "rgba(45,212,191,0.05)", border: "1px solid " + (isAdmin ? "rgba(232,184,75,0.2)" : "rgba(45,212,191,0.15)"), borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{isAdmin ? "📢" : "💡"}</span>
      <div>
        <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: isAdmin ? "#e8b84b" : "#2dd4bf", fontWeight: 600, marginBottom: 4 }}>{isAdmin ? (lang === "fr" ? "Message Kuabo" : lang === "es" ? "Mensaje Kuabo" : "Kuabo Message") : (lang === "fr" ? "Conseil du jour" : lang === "es" ? "Consejo del día" : "Tip of the day")}</div>
        <div style={{ fontSize: 12, color: "#f4f1ec", lineHeight: 1.6 }}>{loaded ? tip : "..."}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN EVENTS
// ══════════════════════════════════════════════
function AdminEvents({ lang, userState, userCountry, userId }: { lang: Lang; userState: string; userCountry: string; userId: string; }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [participating, setParticipating] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const f = async () => {
      try {
        const snap = await getDocs(collection(db, "admin_events"));
        const found: any[] = [];
        snap.forEach(d => {
          const data = d.data() as any;
          if (!data.active) return;
          if ((data.state === "ALL" || data.state === userState) && (data.country === "ALL" || data.country === userCountry))
            found.push({ id: d.id, ...data, isParticipating: (data.participants || []).includes(userId) });
        });
        found.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(found);
        const part: Record<string, boolean> = {};
        found.forEach(e => { part[e.id] = e.isParticipating; });
        setParticipating(part);
      } catch { /**/ }
      setLoaded(true);
    };
    f();
  }, [lang, userState, userCountry, userId]);
  const handleParticipate = async (eventId: string) => {
    if (!userId) return;
    const isIn = participating[eventId];
    setParticipating(prev => ({ ...prev, [eventId]: !isIn }));
    try {
      const eventRef = doc(db, "admin_events", eventId);
      const snap = await getDoc(eventRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const participants: string[] = data.participants || [];
      await updateDoc(eventRef, { participants: isIn ? participants.filter((id: string) => id !== userId) : [...participants, userId] });
    } catch { /**/ }
  };
  if (!loaded || events.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 600 }}>📅 {lang === "fr" ? "Événements Kuabo" : lang === "es" ? "Eventos Kuabo" : "Kuabo Events"}</div>
      {events.map(event => {
        const title = event["title_" + lang] || event.title_fr || "";
        const isIn = participating[event.id];
        const dateStr = new Date(event.date).toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US", { day: "numeric", month: "long" });
        return (
          <div key={event.id} style={{ background: "#141d2e", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 12, padding: "12px", overflow: "hidden", position: "relative", marginBottom: 8 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right,#2dd4bf,#e8b84b)" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f1ec", marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#2dd4bf", marginBottom: 1 }}>📅 {dateStr}{event.time ? ` · ${event.time}` : ""}</div>
                {event.location && <div style={{ fontSize: 10, color: "#aaa" }}>📍 {event.location}</div>}
                <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>👥 {(event.participants || []).length} {lang === "fr" ? "participants" : lang === "es" ? "participantes" : "participants"}</div>
              </div>
              <button onClick={() => handleParticipate(event.id)} style={{ padding: "7px 12px", borderRadius: 18, border: "1px solid " + (isIn ? "rgba(34,197,94,0.4)" : "rgba(45,212,191,0.4)"), background: isIn ? "rgba(34,197,94,0.1)" : "rgba(45,212,191,0.1)", color: isIn ? "#22c55e" : "#2dd4bf", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" as const }}>
                {isIn ? (lang === "fr" ? "✓ Inscrit" : lang === "es" ? "✓ Inscrito" : "✓ Going") : (lang === "fr" ? "Je participe" : lang === "es" ? "Participar" : "Join")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// KUABO AI BUTTON
// ══════════════════════════════════════════════
function KuaboAIButton({ lang, completedSteps, userState, userCity }: { lang: Lang; completedSteps: string[]; userState: string; userCity: string; }) {
  const location = userCity || userState || (lang === "fr" ? "ta zone" : lang === "es" ? "tu zona" : "your area");
  const L = { fr: { title: "Demande à Kuabo AI", sub: `Ton assistant — ${location}` }, en: { title: "Ask Kuabo AI", sub: `Your assistant — ${location}` }, es: { title: "Pregunta a Kuabo AI", sub: `Tu asistente — ${location}` } }[lang];
  return (
    <button onClick={() => { localStorage.setItem("completedSteps", JSON.stringify(completedSteps)); window.location.href = "/chat"; }} style={{ width: "100%", background: "linear-gradient(135deg,rgba(232,184,75,0.08),rgba(45,212,191,0.05))", border: "1px solid rgba(232,184,75,0.25)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer", fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f1ec" }}>{L.title}</div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{L.sub}</div>
        </div>
      </div>
      <span style={{ color: "#e8b84b", fontSize: 16 }}>→</span>
    </button>
  );
}

// ══════════════════════════════════════════════
// STREAK CARD
// ══════════════════════════════════════════════
function StreakCard({ streak, lang }: { streak: number; lang: Lang; }) {
  const data = { fr: { label: "jours de suite", msg: streak >= 7 ? "Tu es en feu 🔥" : streak >= 3 ? "Continue comme ça !" : "Reviens chaque jour !" }, en: { label: "days in a row", msg: streak >= 7 ? "You're on fire 🔥" : streak >= 3 ? "Keep it up!" : "Come back every day!" }, es: { label: "días seguidos", msg: streak >= 7 ? "¡Estás en llamas 🔥!" : streak >= 3 ? "¡Sigue así!" : "¡Vuelve cada día!" } }[lang];
  const color = streak >= 7 ? "#ef4444" : streak >= 3 ? "#f97316" : "#e8b84b";
  return (
    <div style={{ background: "#0f1521", border: "1px solid " + color + "25", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: color + "12", border: "1px solid " + color + "25", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Flame size={20} color={color} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{streak}</span>
          <span style={{ fontSize: 11, color: "#aaa" }}>{data.label}</span>
        </div>
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{data.msg}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SOS BUTTON
// ══════════════════════════════════════════════
function SOSButton({ lang }: { lang: Lang; }) {
  const [open, setOpen] = useState(false);
  const contacts: Record<Lang, { icon: string; label: string; number: string; display: string; priority: boolean }[]> = {
    fr: [{ icon: "🚨", label: "Urgence — Police / Pompiers / Médecin", number: "911", display: "911", priority: true }, { icon: "🏠", label: "Aide sociale, logement, nourriture (24/7)", number: "211", display: "211", priority: true }, { icon: "🛂", label: "USCIS — Questions immigration", number: "18003755283", display: "1-800-375-5283", priority: false }, { icon: "🪪", label: "SSA — Sécurité sociale", number: "18007721213", display: "1-800-772-1213", priority: false }],
    en: [{ icon: "🚨", label: "Emergency — Police / Fire / Medical", number: "911", display: "911", priority: true }, { icon: "🏠", label: "Social help, housing, food (24/7)", number: "211", display: "211", priority: true }, { icon: "🛂", label: "USCIS — Immigration", number: "18003755283", display: "1-800-375-5283", priority: false }, { icon: "🪪", label: "SSA — Social Security", number: "18007721213", display: "1-800-772-1213", priority: false }],
    es: [{ icon: "🚨", label: "Emergencia — Policía / Bomberos / Médico", number: "911", display: "911", priority: true }, { icon: "🏠", label: "Ayuda social, vivienda, comida (24/7)", number: "211", display: "211", priority: true }, { icon: "🛂", label: "USCIS — Inmigración", number: "18003755283", display: "1-800-375-5283", priority: false }, { icon: "🪪", label: "SSA — Seguro Social", number: "18007721213", display: "1-800-772-1213", priority: false }],
  };
  const btnLabel = { fr: "Aide urgente", en: "Emergency help", es: "Ayuda urgente" }[lang];
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ width: "100%", padding: "12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit", marginTop: 4 }}>
        <PhoneCall size={14} color="#ef4444" /> 🆘 {btnLabel}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}><PhoneCall size={16} color="#ef4444" /> 🆘 {btnLabel}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contacts[lang].map((c, i) => (
                <button key={i} onClick={() => { window.location.href = "tel:" + c.number; }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: c.priority ? "rgba(239,68,68,0.05)" : "#141d2e", border: "1px solid " + (c.priority ? "rgba(239,68,68,0.18)" : "#1e2a3a"), borderRadius: 11, cursor: "pointer", width: "100%", textAlign: "left" as const, fontFamily: "inherit" }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#fff", marginBottom: 1 }}>{c.label}</div>
                    <div style={{ fontSize: 14, color: c.priority ? "#ef4444" : "#e8b84b", fontWeight: 700 }}>{c.display}</div>
                  </div>
                  <PhoneCall size={13} color={c.priority ? "#ef4444" : "#22c55e"} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// DOCUMENTS TAB
// ══════════════════════════════════════════════
function DocumentsTab({ lang, completedSteps }: { lang: Lang; completedSteps: string[]; }) {
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [lostModal, setLostModal] = useState<string | null>(null);
  const [conservation, setConservation] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("doc_conservation") || "{}"); } catch { return {}; }
  });

  type DocItem = { id: string; icon: string; label: string; desc: string; linked: string | null; alwaysOk: boolean; guideId: string | null; info: string; lostSteps: string[]; };

  const docs: Record<Lang, DocItem[]> = {
    fr: [
      { id: "passport",  icon: "🛂", label: "Passeport",           desc: "Document d'identité international",      linked: null,        alwaysOk: true,  guideId: null,        info: "Ton passeport est valide 6 mois minimum. Garde-le toujours en lieu sûr. Fais-en une copie numérique sur Google Drive.", lostSteps: ["Contacte l'ambassade de ton pays aux USA", "Prends rendez-vous pour un passeport d'urgence", "Apporte 2 photos d'identité + preuve de citoyenneté", "Délai : 24-72h pour un passeport d'urgence"] },
      { id: "visa",      icon: "🟩", label: "Visa immigrant (DV)", desc: "DV Lottery — tampon dans ton passeport",  linked: null,        alwaysOk: true,  guideId: null,        info: "Le tampon DV prouve ton entrée légale. Il sert de preuve de statut pendant 1 an.", lostSteps: ["Le visa est dans ton passeport", "Si passeport perdu → contacte l'ambassade", "Contacte USCIS au 1-800-375-5283"] },
      { id: "ssn_card",  icon: "🪪", label: "Carte SSN",           desc: "Reçue 2 semaines après le bureau SSA",   linked: "ssn",       alwaysOk: false, guideId: "ssn",       info: "Ton SSN est permanent et ne change jamais. Ne le partage qu'avec ton employeur ou ta banque.", lostSteps: ["Va sur ssa.gov/ssnumber", "Clique sur 'Replace a Social Security Card'", "Apporte passeport + Green Card au bureau SSA", "C'est gratuit — 3 remplacements max par an"] },
      { id: "sim",       icon: "📱", label: "SIM / Numéro US",     desc: "T-Mobile ou Mint Mobile — Jour 1",       linked: "phone",     alwaysOk: false, guideId: "phone",     info: "Ton numéro US est essentiel pour les vérifications bancaires et les employeurs.", lostSteps: ["Va dans une boutique T-Mobile ou Mint Mobile", "Montre une pièce d'identité", "Un nouveau SIM est généralement gratuit ou $5-10", "Tu gardes le même numéro"] },
      { id: "greencard", icon: "💳", label: "Green Card physique", desc: "Courrier USCIS — 2 à 3 semaines",        linked: "greencard", alwaysOk: false, guideId: "greencard", info: "Ta Green Card est valide 10 ans. C'est la preuve officielle de ta résidence permanente.", lostSteps: ["Va sur uscis.gov/i90", "Remplis le formulaire I-90 en ligne", "Paye les frais de remplacement", "Délai : 3-6 mois pour recevoir la nouvelle carte"] },
      { id: "bank_card", icon: "🏦", label: "Carte bancaire",      desc: "Chase ou BofA — passeport seulement",    linked: "bank",      alwaysOk: false, guideId: "bank",      info: "Ta carte bancaire US te permet de payer partout et de recevoir ton salaire.", lostSteps: ["Bloque immédiatement la carte via l'app bancaire", "Appelle le numéro au dos de ta carte", "Une nouvelle carte arrive par courrier en 3-5 jours", "Vérifie les transactions récentes pour fraude"] },
      { id: "license_c", icon: "🚗", label: "Permis de conduire",  desc: "Examen théorique + pratique DMV",        linked: "license",   alwaysOk: false, guideId: "license",   info: "Ton permis US est aussi une pièce d'identité valable. Avec le REAL ID tu peux prendre l'avion sans passeport.", lostSteps: ["Va sur le site du DMV de ton état", "Prends rendez-vous pour un remplacement", "Apporte passeport + preuve d'adresse", "Frais : $20-$40 selon l'état"] },
    ],
    en: [
      { id: "passport",  icon: "🛂", label: "Passport",             desc: "International ID document",               linked: null,        alwaysOk: true,  guideId: null,        info: "Your passport is valid for 6 months minimum. Make a digital copy on Google Drive right now.", lostSteps: ["Contact your country's embassy in the USA", "Schedule an emergency passport appointment", "Bring 2 ID photos + proof of citizenship", "Delay: 24-72h for an emergency passport"] },
      { id: "visa",      icon: "🟩", label: "Immigrant Visa (DV)",  desc: "DV Lottery — stamp in your passport",     linked: null,        alwaysOk: true,  guideId: null,        info: "The DV stamp proves your legal entry. It serves as proof of status for 1 year.", lostSteps: ["The visa is in your passport", "If passport lost → contact the embassy", "Contact USCIS at 1-800-375-5283"] },
      { id: "ssn_card",  icon: "🪪", label: "SSN Card",             desc: "Received 2 weeks after SSA office",       linked: "ssn",       alwaysOk: false, guideId: "ssn",       info: "Your SSN is permanent and never changes. Only share it with your employer or bank.", lostSteps: ["Go to ssa.gov/ssnumber", "Click 'Replace a Social Security Card'", "Bring passport + Green Card to SSA office", "It's free — max 3 replacements per year"] },
      { id: "sim",       icon: "📱", label: "SIM / US Phone Number",desc: "T-Mobile or Mint Mobile — Day 1",         linked: "phone",     alwaysOk: false, guideId: "phone",     info: "Your US number is essential for bank verifications and employers.", lostSteps: ["Go to a T-Mobile or Mint Mobile store", "Show an ID", "A new SIM is usually free or $5-10", "You keep the same number"] },
      { id: "greencard", icon: "💳", label: "Physical Green Card",  desc: "USCIS mail — 2 to 3 weeks",              linked: "greencard", alwaysOk: false, guideId: "greencard", info: "Your Green Card is valid for 10 years. It's official proof of your permanent residency.", lostSteps: ["Go to uscis.gov/i90", "Fill out Form I-90 online", "Pay the replacement fee", "Delay: 3-6 months to receive the new card"] },
      { id: "bank_card", icon: "🏦", label: "Bank Card",            desc: "Chase or BofA — passport only",          linked: "bank",      alwaysOk: false, guideId: "bank",      info: "Your US bank card lets you pay everywhere and receive your salary.", lostSteps: ["Immediately block the card via your banking app", "Call the number on the back of your card", "A new card arrives by mail in 3-5 days", "Check recent transactions for fraud"] },
      { id: "license_c", icon: "🚗", label: "Driver's License",     desc: "Written + practical DMV test",           linked: "license",   alwaysOk: false, guideId: "license",   info: "Your US license is also valid ID. With REAL ID you can fly domestically without a passport.", lostSteps: ["Go to your state's DMV website", "Schedule a replacement appointment", "Bring passport + proof of address", "Replacement fee: $20-$40 depending on state"] },
    ],
    es: [
      { id: "passport",  icon: "🛂", label: "Pasaporte",            desc: "Documento de identidad internacional",    linked: null,        alwaysOk: true,  guideId: null,        info: "Tu pasaporte es válido por 6 meses mínimo. Haz una copia digital en Google Drive ahora.", lostSteps: ["Contacta la embajada de tu país en EE.UU.", "Programa una cita para pasaporte de emergencia", "Lleva 2 fotos de identidad + prueba de ciudadanía", "Plazo: 24-72h para un pasaporte de emergencia"] },
      { id: "visa",      icon: "🟩", label: "Visa inmigrante (DV)", desc: "DV Lottery — sello en tu pasaporte",      linked: null,        alwaysOk: true,  guideId: null,        info: "El sello DV prueba tu entrada legal. Sirve como prueba de estatus durante 1 año.", lostSteps: ["La visa está en tu pasaporte", "Si pierdes el pasaporte → contacta la embajada", "Contacta USCIS al 1-800-375-5283"] },
      { id: "ssn_card",  icon: "🪪", label: "Tarjeta SSN",          desc: "Recibida 2 semanas después SSA",          linked: "ssn",       alwaysOk: false, guideId: "ssn",       info: "Tu SSN es permanente y nunca cambia. Solo compártelo con tu empleador o banco.", lostSteps: ["Ve a ssa.gov/ssnumber", "Haz clic en 'Replace a Social Security Card'", "Lleva pasaporte + Green Card a la oficina SSA", "Es gratis — máximo 3 reemplazos por año"] },
      { id: "sim",       icon: "📱", label: "SIM / Número US",      desc: "T-Mobile o Mint Mobile — Día 1",         linked: "phone",     alwaysOk: false, guideId: "phone",     info: "Tu número de EE.UU. es esencial para verificaciones bancarias y empleadores.", lostSteps: ["Ve a una tienda T-Mobile o Mint Mobile", "Muestra una identificación", "Un nuevo SIM es generalmente gratis o $5-10", "Conservas el mismo número"] },
      { id: "greencard", icon: "💳", label: "Green Card física",    desc: "Correo USCIS — 2 a 3 semanas",           linked: "greencard", alwaysOk: false, guideId: "greencard", info: "Tu Green Card es válida por 10 años. Es prueba oficial de tu residencia permanente.", lostSteps: ["Ve a uscis.gov/i90", "Completa el Formulario I-90 en línea", "Paga la tarifa de reemplazo", "Plazo: 3-6 meses para recibir la nueva tarjeta"] },
      { id: "bank_card", icon: "🏦", label: "Tarjeta bancaria",     desc: "Chase o BofA — solo pasaporte",          linked: "bank",      alwaysOk: false, guideId: "bank",      info: "Tu tarjeta bancaria de EE.UU. te permite pagar en todas partes y recibir tu salario.", lostSteps: ["Bloquea inmediatamente la tarjeta a través de la app bancaria", "Llama al número al dorso de tu tarjeta", "Una nueva tarjeta llega por correo en 3-5 días", "Verifica transacciones recientes por fraude"] },
      { id: "license_c", icon: "🚗", label: "Licencia de conducir", desc: "Examen teórico + práctico DMV",          linked: "license",   alwaysOk: false, guideId: "license",   info: "Tu licencia de EE.UU. también es identificación válida. Con REAL ID puedes volar sin pasaporte.", lostSteps: ["Ve al sitio web del DMV de tu estado", "Programa una cita de reemplazo", "Lleva pasaporte + prueba de domicilio", "Tarifa: $20-$40 según el estado"] },
    ],
  };

  const CONS: Record<Lang, { id: string; label: string }[]> = {
    fr: [{ id: "originals", label: "Originaux dans un endroit sûr (pas le portefeuille)" }, { id: "google_drive", label: "Copies numériques sur Google Drive ou iCloud" }, { id: "family_copy", label: "Copies physiques chez un proche de confiance" }, { id: "ssn_memorize", label: "SSN mémorisé — carte rangée en lieu sûr" }, { id: "gc_safe", label: "Green Card rangée — pas dans le portefeuille" }],
    en: [{ id: "originals", label: "Originals in a safe place (not your wallet)" }, { id: "google_drive", label: "Digital copies on Google Drive or iCloud" }, { id: "family_copy", label: "Physical copies with a trusted person" }, { id: "ssn_memorize", label: "SSN memorized — card stored safely" }, { id: "gc_safe", label: "Green Card stored safely — not in wallet" }],
    es: [{ id: "originals", label: "Originales en un lugar seguro (no la billetera)" }, { id: "google_drive", label: "Copias digitales en Google Drive o iCloud" }, { id: "family_copy", label: "Copias físicas con una persona de confianza" }, { id: "ssn_memorize", label: "SSN memorizado — tarjeta guardada en lugar seguro" }, { id: "gc_safe", label: "Green Card guardada — no en la billetera" }],
  };

  const L = {
    fr: { title: "Mes Documents", sub: "Coche ce que tu as déjà — on t'aide pour le reste", ok: "OK", pending: "En attente", missing: "Manquant", score: "Score documentaire", infoTitle: "À savoir", lostTitle: "Si tu perds ce document", lostBtn: "J'ai perdu ce document", guideBtn: "Voir le guide →", explorerBtn: "Trouver un bureau", conservTitle: "📦 Check-list de conservation", conservSub: "Coche pour confirmer que tu as bien rangé tes documents" },
    en: { title: "My Documents", sub: "Check what you already have — we'll help with the rest", ok: "OK", pending: "Pending", missing: "Missing", score: "Document score", infoTitle: "Good to know", lostTitle: "If you lose this document", lostBtn: "I lost this document", guideBtn: "View guide →", explorerBtn: "Find an office", conservTitle: "📦 Storage checklist", conservSub: "Check to confirm you've safely stored your documents" },
    es: { title: "Mis Documentos", sub: "Marca lo que ya tienes — te ayudamos con el resto", ok: "OK", pending: "Pendiente", missing: "Faltante", score: "Puntuación documentos", infoTitle: "Bueno saber", lostTitle: "Si pierdes este documento", lostBtn: "Perdí este documento", guideBtn: "Ver guía →", explorerBtn: "Encontrar una oficina", conservTitle: "📦 Lista de conservación", conservSub: "Marca para confirmar que guardaste bien tus documentos" },
  }[lang];

  const list = docs[lang];
  const getStatus = (d: DocItem) => { if (d.alwaysOk) return "ok"; if (d.linked && completedSteps.includes(d.linked)) return "ok"; if (d.linked) return "pending"; return "missing"; };
  const sColor = { ok: "#22c55e", pending: "#e8b84b", missing: "#ef4444" };
  const sBg = { ok: "rgba(34,197,94,0.07)", pending: "rgba(232,184,75,0.07)", missing: "rgba(239,68,68,0.05)" };
  const sBorder = { ok: "rgba(34,197,94,0.18)", pending: "rgba(232,184,75,0.18)", missing: "rgba(239,68,68,0.15)" };
  const sLabel = { ok: L.ok, pending: L.pending, missing: L.missing };
  const counts = { ok: 0, pending: 0, missing: 0 };
  list.forEach(d => { counts[getStatus(d) as keyof typeof counts]++; });
  const docScore = Math.round((counts.ok / list.length) * 100);
  const toggleCons = (id: string) => { const u = { ...conservation, [id]: !conservation[id] }; setConservation(u); localStorage.setItem("doc_conservation", JSON.stringify(u)); };
  const selDoc = list.find(d => d.id === activeDoc);
  const lostDoc = list.find(d => d.id === lostModal);
  const EXP: Record<string, string> = { ssn_card: "ssn", greencard: "uscis", bank_card: "bank", license_c: "dmv", sim: "", passport: "", visa: "" };

  return (
    <div>
      {activeDoc && selDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setActiveDoc(null)}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480, animation: "slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 26 }}>{selDoc.icon}</span>
              <div><div style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ec" }}>{selDoc.label}</div><div style={{ fontSize: 11, color: "#aaa" }}>{selDoc.desc}</div></div>
            </div>
            <div style={{ background: "rgba(232,184,75,0.05)", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 10, padding: "11px 13px", marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 5 }}>💡 {L.infoTitle}</div>
              <div style={{ fontSize: 12, color: "#f4f1ec", lineHeight: 1.7 }}>{selDoc.info}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {selDoc.guideId && <button onClick={() => { setActiveDoc(null); window.location.href = `/guide/${selDoc.guideId}`; }} style={{ width: "100%", padding: "12px", background: "#e8b84b", color: "#000", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{L.guideBtn}</button>}
              {EXP[selDoc.id] && <button onClick={() => { setActiveDoc(null); window.location.href = `/near/${EXP[selDoc.id]}`; }} style={{ width: "100%", padding: "11px", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 11, color: "#2dd4bf", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗺️ {L.explorerBtn}</button>}
              <button onClick={() => { setActiveDoc(null); setLostModal(selDoc.id); }} style={{ width: "100%", padding: "11px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 11, color: "#ef4444", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🆘 {L.lostBtn}</button>
            </div>
          </div>
        </div>
      )}
      {lostModal && lostDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setLostModal(null)}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480, animation: "slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 3 }}>🆘 {L.lostTitle}</div>
            <div style={{ fontSize: 13, color: "#f4f1ec", marginBottom: 14 }}>{lostDoc.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {lostDoc.lostSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 12, color: "#f4f1ec", lineHeight: 1.6 }}>{step}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setLostModal(null)} style={{ width: "100%", marginTop: 14, padding: "12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close"}</button>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{L.title}</div>
        <div style={{ fontSize: 11, color: "#aaa" }}>{L.sub}</div>
      </div>
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{L.score}</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: docScore >= 80 ? "#22c55e" : docScore >= 50 ? "#e8b84b" : "#ef4444" }}>{docScore}%</div>
        </div>
        <div style={{ height: 5, background: "#1e2a3a", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", width: docScore + "%", background: docScore >= 80 ? "linear-gradient(to right,#22c55e,#2dd4bf)" : docScore >= 50 ? "linear-gradient(to right,#e8b84b,#f97316)" : "linear-gradient(to right,#ef4444,#f97316)", borderRadius: 5, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
          {([["ok", L.ok, "#22c55e", "rgba(34,197,94,0.07)", "rgba(34,197,94,0.18)"], ["pending", L.pending, "#e8b84b", "rgba(232,184,75,0.07)", "rgba(232,184,75,0.18)"], ["missing", L.missing, "#ef4444", "rgba(239,68,68,0.07)", "rgba(239,68,68,0.18)"]] as const).map(([key, lbl, color, bg, border]) => (
            <div key={key} style={{ flex: 1, background: bg, border: "1px solid " + border, borderRadius: 9, padding: "7px 5px", textAlign: "center" as const }}>
              <div style={{ fontSize: 17, fontWeight: 700, color }}>{counts[key as keyof typeof counts]}</div>
              <div style={{ fontSize: 8, color: "#aaa", marginTop: 1 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
        {list.map(d => {
          const s = getStatus(d);
          return (
            <div key={d.id} onClick={() => setActiveDoc(d.id)} style={{ background: "#141d2e", border: "1px solid " + sBorder[s as keyof typeof sBorder], borderRadius: 11, padding: "12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "opacity 0.15s", WebkitTapHighlightColor: "transparent" }}
              onPointerDown={e => (e.currentTarget.style.opacity = "0.7")} onPointerUp={e => (e.currentTarget.style.opacity = "1")} onPointerLeave={e => (e.currentTarget.style.opacity = "1")}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{d.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#fff", marginBottom: 1 }}>{d.label}</div>
                <div style={{ fontSize: 10, color: "#aaa" }}>{d.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <div style={{ padding: "2px 7px", borderRadius: 18, fontSize: 9, fontWeight: 600, background: sBg[s as keyof typeof sBg], color: sColor[s as keyof typeof sColor], border: "1px solid " + sBorder[s as keyof typeof sBorder], whiteSpace: "nowrap" as const }}>{sLabel[s as keyof typeof sLabel]}</div>
                <ChevronRight size={13} color="#555" />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "rgba(45,212,191,0.04)", border: "1px solid rgba(45,212,191,0.13)", borderRadius: 12, padding: "14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#2dd4bf", marginBottom: 3 }}>{L.conservTitle}</div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>{L.conservSub}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {CONS[lang].map(item => {
            const checked = !!conservation[item.id];
            return (
              <div key={item.id} onClick={() => toggleCons(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, border: "2px solid " + (checked ? "#2dd4bf" : "#2a3448"), background: checked ? "#2dd4bf" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  {checked && <svg width="11" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="#0f1521" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontSize: 12, color: checked ? "#aaa" : "#f4f1ec", textDecoration: checked ? "line-through" : "none", transition: "all 0.2s", lineHeight: 1.4 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (Object.values(conservation).filter(Boolean).length / CONS[lang].length * 100) + "%", background: "linear-gradient(to right,#2dd4bf,#22c55e)", borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 3, textAlign: "right" as const }}>{Object.values(conservation).filter(Boolean).length}/{CONS[lang].length}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════
function ProfileTab({ userName, userEmail, userCountry, userState, userCity, lang, completedSteps, armyStatus, onArmyChange, changeLang, onLogout, onDeleteAccount }: {
  userName: string; userEmail: string; userCountry: string; userState: string; userCity: string;
  lang: Lang; completedSteps: string[]; armyStatus: string;
  onArmyChange: (s: string) => void; changeLang: (l: Lang) => void; onLogout: () => void; onDeleteAccount: () => void;
}) {
  const [commVisible, setCommVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [msgEnabled, setMsgEnabled] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [displayName, setDisplayName] = useState(userName);
  const [showArmyModal, setShowArmyModal] = useState(false);

  const { currentPhase, phaseProgress } = getPhaseStats(completedSteps);
  const globalPct = Math.round(Object.values(phaseProgress).reduce((acc, p) => acc + p.pct, 0) / 5);

  useEffect(() => {
    if (profileLoaded) return;
    const load = async () => {
      const user = auth.currentUser; if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setCommVisible(data?.communityVisible || false);
          setNotifEnabled(data?.notifEnabled || false);
          setMsgEnabled(data?.msgEnabled !== false);
        }
      } catch { /**/ }
      setProfileLoaded(true);
    };
    load();
  }, [profileLoaded]);

  const saveToggle = useCallback(async (field: string, value: boolean) => {
    const user = auth.currentUser; if (!user) return;
    try { await updateDoc(doc(db, "users", user.uid), { [field]: value }); } catch { /**/ }
  }, []);
  const handleCommToggle = useCallback(() => { const v = !commVisible; setCommVisible(v); saveToggle("communityVisible", v); }, [commVisible, saveToggle]);
  const handleNotifToggle = useCallback(() => { const v = !notifEnabled; setNotifEnabled(v); saveToggle("notifEnabled", v); }, [notifEnabled, saveToggle]);
  const handleMsgToggle = useCallback(() => { const v = !msgEnabled; setMsgEnabled(v); saveToggle("msgEnabled", v); }, [msgEnabled, saveToggle]);

  const saveName = useCallback(async () => {
    if (!newName.trim()) return;
    const user = auth.currentUser; if (!user) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: newName.trim() });
      localStorage.setItem("userName", newName.trim());
      setDisplayName(newName.trim());
      setNameSaved(true);
      setTimeout(() => { setNameSaved(false); setEditingName(false); }, 1500);
    } catch { /**/ }
    setSavingName(false);
  }, [newName]);

  const handlePasswordReset = useCallback(async () => {
    const user = auth.currentUser; if (!user?.email) return;
    setPasswordSent(false); setPasswordError("");
    try { await sendPasswordResetEmail(auth, user.email); setPasswordSent(true); }
    catch { setPasswordError(lang === "fr" ? "Erreur — réessaie" : lang === "es" ? "Error" : "Error — try again"); }
  }, [lang]);

  const handleShare = useCallback(() => {
    const messages: Record<Lang, string> = { fr: `Salut ! J'utilise Kuabo pour m'installer aux USA. Rejoins-moi : https://kuabo.co 🌍`, en: `Hey! I use Kuabo to settle in the USA. Join me: https://kuabo.co 🌍`, es: `¡Hola! Uso Kuabo para instalarme en EE.UU. Únete: https://kuabo.co 🌍` };
    if (navigator.share) navigator.share({ title: "Kuabo", text: messages[lang], url: "https://kuabo.co" }).catch(() => { });
    else navigator.clipboard.writeText(messages[lang]).catch(() => { });
  }, [lang]);

  const Toggle = useCallback(({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width: 46, height: 25, borderRadius: 13, background: value ? "#e8b84b" : "#2a3448", border: "none", cursor: "pointer", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
    </button>
  ), []);

  const ARMY_OPTS: Record<Lang, { value: string; label: string; icon: string }[]> = {
    fr: [{ value: "army", label: "Je suis dans l'Army", icon: "🎖️" }, { value: "army_interest", label: "Je veux m'y engager", icon: "🤔" }, { value: "army_unsure", label: "Je ne sais pas encore", icon: "❓" }, { value: "", label: "Retirer — parcours DV classique", icon: "🎰" }],
    en: [{ value: "army", label: "I'm in the Army", icon: "🎖️" }, { value: "army_interest", label: "I want to enlist", icon: "🤔" }, { value: "army_unsure", label: "I'm not sure yet", icon: "❓" }, { value: "", label: "Remove — classic DV path", icon: "🎰" }],
    es: [{ value: "army", label: "Estoy en el Army", icon: "🎖️" }, { value: "army_interest", label: "Quiero alistarme", icon: "🤔" }, { value: "army_unsure", label: "Todavía no sé", icon: "❓" }, { value: "", label: "Quitar — camino DV clásico", icon: "🎰" }],
  };

  const L = {
    fr: { title: "Mon Profil", globalScore: "Score global Kuabo", phase: "Phase", of: "sur", saveName: "Sauvegarder", cancelName: "Annuler", nameSaved: "✅ Nom modifié !", editNameTitle: "Modifier ton nom", editNameSub: "Entre ton nouveau nom", security: "Sécurité", changePass: "Changer le mot de passe", passSent: "✅ Email envoyé !", preferences: "Préférences", language: "Langue", privacy: "Confidentialité", commMap: "Carte communauté", commSub: "Apparaître anonymement", messages: "Messages", msgSub: "Recevoir des messages", notifications: "Notifications", notifSub: "Rappels quotidiens", share: "Partager Kuabo", shareSub: "Inviter un ami immigrant", help: "Aide", reportBug: "Signaler un bug", suggest: "Suggérer une fonctionnalité", legal: "Légal", terms: "Conditions d'utilisation", privacy2: "Politique de confidentialité", account: "Compte", logout: "Déconnexion", deleteAccount: "Supprimer mon compte", deleteSub: "Action irréversible", version: "Version 1.0 · Kuabo", phases: "Mes phases", armySection: "Statut Army", armyBadge: armyStatus === "army" ? "🎖️ Soldat actif" : armyStatus === "army_interest" ? "🤔 Intéressé Army" : "❓ Army — indécis", armyChange: "Modifier / Corriger", armyRemove: "Retirer le statut Army", armyModalTitle: "Modifier ton statut Army" },
    en: { title: "My Profile", globalScore: "Global Kuabo Score", phase: "Phase", of: "of", saveName: "Save", cancelName: "Cancel", nameSaved: "✅ Name updated!", editNameTitle: "Edit your name", editNameSub: "Enter your new name", security: "Security", changePass: "Change password", passSent: "✅ Email sent!", preferences: "Preferences", language: "Language", privacy: "Privacy", commMap: "Community map", commSub: "Appear anonymously", messages: "Messages", msgSub: "Receive messages", notifications: "Notifications", notifSub: "Daily reminders", share: "Share Kuabo", shareSub: "Invite an immigrant friend", help: "Help", reportBug: "Report a bug", suggest: "Suggest a feature", legal: "Legal", terms: "Terms of Service", privacy2: "Privacy Policy", account: "Account", logout: "Logout", deleteAccount: "Delete my account", deleteSub: "Irreversible action", version: "Version 1.0 · Kuabo", phases: "My phases", armySection: "Army Status", armyBadge: armyStatus === "army" ? "🎖️ Active soldier" : armyStatus === "army_interest" ? "🤔 Interested in Army" : "❓ Army — undecided", armyChange: "Edit / Correct", armyRemove: "Remove Army status", armyModalTitle: "Edit your Army status" },
    es: { title: "Mi Perfil", globalScore: "Puntuación global Kuabo", phase: "Fase", of: "de", saveName: "Guardar", cancelName: "Cancelar", nameSaved: "✅ ¡Nombre actualizado!", editNameTitle: "Editar tu nombre", editNameSub: "Ingresa tu nuevo nombre", security: "Seguridad", changePass: "Cambiar contraseña", passSent: "✅ ¡Email enviado!", preferences: "Preferencias", language: "Idioma", privacy: "Privacidad", commMap: "Mapa comunidad", commSub: "Aparecer anónimamente", messages: "Mensajes", msgSub: "Recibir mensajes", notifications: "Notificaciones", notifSub: "Recordatorios diarios", share: "Compartir Kuabo", shareSub: "Invitar un amigo inmigrante", help: "Ayuda", reportBug: "Reportar un error", suggest: "Sugerir una función", legal: "Legal", terms: "Términos de Servicio", privacy2: "Política de Privacidad", account: "Cuenta", logout: "Cerrar sesión", deleteAccount: "Eliminar mi cuenta", deleteSub: "Acción irreversible", version: "Versión 1.0 · Kuabo", phases: "Mis fases", armySection: "Estado Army", armyBadge: armyStatus === "army" ? "🎖️ Soldado activo" : armyStatus === "army_interest" ? "🤔 Interesado en Army" : "❓ Army — indeciso", armyChange: "Editar / Corregir", armyRemove: "Quitar estado Army", armyModalTitle: "Editar tu estado Army" },
  }[lang];

  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "👤";
  const size = 92, sw = 6, r = (size - sw) / 2, circ = 2 * Math.PI * r, offset = circ - (globalPct / 100) * circ;
  const currentPhaseMeta = PHASES_META[currentPhase];
  const Section = ({ title }: { title: string }) => (<div style={{ fontSize: 9, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 7, marginTop: 16, paddingLeft: 2 }}>{title}</div>);

  return (
    <div style={{ paddingBottom: 20 }}>
      {editingName && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setEditingName(false)}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480, animation: "slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
            {nameSaved ? (
              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{L.nameSaved}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{displayName}</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ec", marginBottom: 3 }}>{L.editNameTitle}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>{L.editNameSub}</div>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={displayName} autoFocus onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }} style={{ width: "100%", padding: "13px 14px", background: "#141d2e", border: "1px solid #e8b84b", borderRadius: 11, color: "#f4f1ec", fontSize: 15, fontFamily: "inherit", outline: "none", marginBottom: 14, boxSizing: "border-box" as const }} />
                <div style={{ display: "flex", gap: 9 }}>
                  <button onClick={() => setEditingName(false)} style={{ flex: 1, padding: "12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{L.cancelName}</button>
                  <button onClick={saveName} disabled={savingName || !newName.trim()} style={{ flex: 1, padding: "12px", background: "#e8b84b", border: "none", borderRadius: 11, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: savingName ? 0.7 : 1 }}>{savingName ? "..." : L.saveName}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showArmyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 700, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowArmyModal(false)}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480, animation: "slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ec", marginBottom: 3 }}>{L.armyModalTitle}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 14 }}>{lang === "fr" ? "Tu peux corriger ton statut Army ici." : lang === "es" ? "Puedes corregir tu estado Army aquí." : "You can correct your Army status here."}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ARMY_OPTS[lang].map(opt => {
                const isSel = armyStatus === opt.value;
                const isRem = opt.value === "";
                return (
                  <button key={opt.value} onClick={async () => {
                    setShowArmyModal(false); onArmyChange(opt.value);
                    const user = auth.currentUser;
                    if (user) { try { await updateDoc(doc(db, "users", user.uid), { armyStatus: opt.value || null, isArmy: opt.value.startsWith("army"), reason: opt.value || "dv" }); } catch { /**/ } }
                  }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: isSel ? "rgba(34,197,94,0.07)" : isRem ? "rgba(239,68,68,0.04)" : "#141d2e", border: "1px solid " + (isSel ? "rgba(34,197,94,0.25)" : isRem ? "rgba(239,68,68,0.18)" : "#1e2a3a"), borderRadius: 11, cursor: "pointer", width: "100%", textAlign: "left" as const, fontFamily: "inherit" }}>
                    <span style={{ fontSize: 17 }}>{opt.icon}</span>
                    <span style={{ fontSize: 12, color: isSel ? "#22c55e" : isRem ? "#ef4444" : "#f4f1ec", fontWeight: isSel ? 600 : 400, flex: 1 }}>{opt.label}</span>
                    {isSel && <span style={{ fontSize: 11, color: "#22c55e" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{L.title}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: size, height: size, marginBottom: 8 }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={currentPhaseMeta.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#1a2438", border: `2px solid ${currentPhaseMeta.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: currentPhaseMeta.color }}>{initials}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{displayName}</div>
          <button onClick={() => { setNewName(displayName); setNameSaved(false); setEditingName(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, display: "flex", alignItems: "center" }}><Edit2 size={12} color="#aaa" /></button>
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5 }}>{userEmail}</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, justifyContent: "center" }}>
          <div style={{ padding: "2px 9px", borderRadius: 18, background: `${currentPhaseMeta.color}14`, border: `1px solid ${currentPhaseMeta.color}35`, fontSize: 10, color: currentPhaseMeta.color, fontWeight: 700 }}>{currentPhaseMeta.emoji} {L.phase} {currentPhase} — {currentPhaseMeta.name[lang]}</div>
          {armyStatus && <div style={{ padding: "2px 9px", borderRadius: 18, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)", fontSize: 10, color: "#22c55e", fontWeight: 700 }}>{L.armyBadge}</div>}
          {(userCity || userState) && <div style={{ padding: "2px 9px", borderRadius: 18, background: "rgba(45,212,191,0.07)", border: "1px solid rgba(45,212,191,0.18)", fontSize: 10, color: "#2dd4bf", fontWeight: 600 }}>📍 {userCity || userState}</div>}
        </div>
      </div>

      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "12px", marginBottom: 3 }}>
        <div style={{ fontSize: 9, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 7 }}>{L.globalScore}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: currentPhaseMeta.color, lineHeight: 1 }}>{globalPct}%</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 4, background: "#1e2a3a", borderRadius: 4, overflow: "hidden", marginBottom: 2 }}>
              <div style={{ height: "100%", width: globalPct + "%", background: `linear-gradient(to right,${currentPhaseMeta.color},#2dd4bf)`, borderRadius: 4, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 10, color: "#aaa" }}>{L.phase} {currentPhase} {L.of} 5 — {currentPhaseMeta.name[lang]}</div>
          </div>
        </div>
      </div>

      <Section title={L.phases} />
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, marginBottom: 4 }}>
        {([1, 2, 3, 4, 5] as PhaseId[]).map(pid => {
          const meta = PHASES_META[pid]; const prog = phaseProgress[pid]; const unlocked = isPhaseUnlocked(pid, completedSteps); const complete = prog.pct === 100;
          return (<div key={pid} style={{ flex: "1 0 calc(33% - 5px)", background: complete ? "rgba(34,197,94,0.05)" : pid === currentPhase ? `${meta.color}10` : "#141d2e", border: `1px solid ${complete ? "rgba(34,197,94,0.25)" : pid === currentPhase ? meta.color + "35" : "#1e2a3a"}`, borderRadius: 9, padding: "7px", textAlign: "center" as const, opacity: unlocked ? 1 : 0.4 }}><div style={{ fontSize: 18 }}>{unlocked ? meta.emoji : "🔒"}</div><div style={{ fontSize: 8, color: complete ? "#22c55e" : pid === currentPhase ? meta.color : "#555", fontWeight: 600, marginTop: 1 }}>{prog.pct}%</div></div>);
        })}
      </div>

      {armyStatus && (
        <>
          <Section title={L.armySection} />
          <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 11, padding: "11px 13px", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🎖️</div>
                <div><div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>{L.armyBadge}</div><div style={{ fontSize: 10, color: "#555" }}>DV + Army</div></div>
              </div>
              <button onClick={() => setShowArmyModal(true)} style={{ padding: "5px 10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 7, color: "#22c55e", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{L.armyChange}</button>
            </div>
            <button onClick={async () => { onArmyChange(""); const user = auth.currentUser; if (user) { try { await updateDoc(doc(db, "users", user.uid), { armyStatus: null, isArmy: false }); } catch { /**/ } } }} style={{ width: "100%", padding: "7px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 7, color: "#ef4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✕ {L.armyRemove}</button>
          </div>
        </>
      )}

      <Section title={L.security} />
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "11px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔐</div>
            <span style={{ fontSize: 12, color: "#fff" }}>{L.changePass}</span>
          </div>
          <button onClick={handlePasswordReset} style={{ background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.25)", borderRadius: 7, padding: "5px 10px", color: "#e8b84b", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Envoyer" : lang === "es" ? "Enviar" : "Send"}</button>
        </div>
        {passwordSent && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 7, paddingLeft: 39 }}>{L.passSent}</div>}
        {passwordError && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 7, paddingLeft: 39 }}>{passwordError}</div>}
      </div>

      <Section title={L.preferences} />
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "11px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center" }}><Globe size={14} color="#e8b84b" /></div>
            <span style={{ fontSize: 12, color: "#fff" }}>{L.language}</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["fr", "en", "es"] as Lang[]).map(lg => (<button key={lg} onClick={() => changeLang(lg)} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid", borderColor: lang === lg ? "#e8b84b" : "#2a3448", background: lang === lg ? "rgba(232,184,75,0.1)" : "transparent", color: lang === lg ? "#e8b84b" : "#aaa", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{lg.toUpperCase()}</button>))}
          </div>
        </div>
      </div>

      <Section title={L.privacy} />
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[{ icon: "🗺️", label: L.commMap, sub: L.commSub, value: commVisible, onToggle: handleCommToggle }, { icon: "💬", label: L.messages, sub: L.msgSub, value: msgEnabled, onToggle: handleMsgToggle }, { icon: "🔔", label: L.notifications, sub: L.notifSub, value: notifEnabled, onToggle: handleNotifToggle }].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{item.icon}</div>
              <div><div style={{ fontSize: 12, color: "#fff" }}>{item.label}</div><div style={{ fontSize: 10, color: "#555" }}>{item.sub}</div></div>
            </div>
            <Toggle value={item.value} onToggle={item.onToggle} />
          </div>
        ))}
      </div>

      <Section title={L.share} />
      <button onClick={handleShare} style={{ width: "100%", background: "linear-gradient(135deg,rgba(232,184,75,0.07),rgba(45,212,191,0.04))", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 11, padding: "11px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(232,184,75,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👥</div>
          <div style={{ textAlign: "left" as const }}><div style={{ fontSize: 12, fontWeight: 500, color: "#f4f1ec" }}>{L.share}</div><div style={{ fontSize: 10, color: "#aaa" }}>{L.shareSub}</div></div>
        </div>
        <span style={{ color: "#e8b84b", fontSize: 15 }}>↗</span>
      </button>

      <Section title={L.help} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[{ icon: "📧", label: "support@kuabo.co", action: () => { window.location.href = "mailto:support@kuabo.co"; } }, { icon: "💬", label: "WhatsApp +1 (970) 534-0694", action: () => { window.open("https://wa.me/19705340694", "_blank"); } }, { icon: "🌐", label: "kuabo.co", action: () => { window.open("https://kuabo.co", "_blank"); } }, { icon: "🐛", label: L.reportBug, action: () => { window.location.href = "mailto:support@kuabo.co?subject=Bug Kuabo"; } }, { icon: "💡", label: L.suggest, action: () => { window.location.href = "mailto:support@kuabo.co?subject=Suggestion Kuabo"; } }].map((item, i) => (
          <button key={i} onClick={item.action} style={{ width: "100%", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "10px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{item.icon}</div><span style={{ fontSize: 12, color: "#fff" }}>{item.label}</span></div>
            <ChevronRight size={13} color="#555" />
          </button>
        ))}
      </div>

      <Section title={L.legal} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[{ icon: "📄", label: L.terms, action: () => { window.open("/terms", "_blank"); } }, { icon: "🔒", label: L.privacy2, action: () => { window.open("/privacy", "_blank"); } }].map((item, i) => (
          <button key={i} onClick={item.action} style={{ width: "100%", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "10px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{item.icon}</div><span style={{ fontSize: 12, color: "#fff" }}>{item.label}</span></div>
            <ChevronRight size={13} color="#555" />
          </button>
        ))}
      </div>

      <Section title={L.account} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <button onClick={onLogout} style={{ width: "100%", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 11, padding: "10px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center" }}><LogOut size={13} color="#ef4444" /></div><span style={{ fontSize: 12, color: "#ef4444" }}>{L.logout}</span></div>
          <ChevronRight size={13} color="#ef4444" />
        </button>
        <button onClick={onDeleteAccount} style={{ width: "100%", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 11, padding: "10px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🗑️</div><div style={{ textAlign: "left" as const }}><div style={{ fontSize: 12, color: "#ef4444" }}>{L.deleteAccount}</div><div style={{ fontSize: 9, color: "#555" }}>{L.deleteSub}</div></div></div>
          <ChevronRight size={13} color="#ef4444" />
        </button>
      </div>
      <div style={{ textAlign: "center" as const, fontSize: 10, color: "#333", paddingTop: 10 }}>{L.version}</div>
    </div>
  );
}

// ══════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════
function BottomNav({ activeTab, setActiveTab, lang }: { activeTab: Tab; setActiveTab: (t: Tab) => void; lang: Lang; }) {
  const L = { fr: { home: "Accueil", documents: "Documents", explorer: "Explorer", profile: "Profil" }, en: { home: "Home", documents: "Documents", explorer: "Explorer", profile: "Profile" }, es: { home: "Inicio", documents: "Documentos", explorer: "Explorar", profile: "Perfil" } }[lang];
  const tabs: [Tab, React.ReactNode, string][] = [
    ["home", <Home size={21} />, L.home],
    ["documents", <FileText size={21} />, L.documents],
    ["explorer", <MapPin size={21} />, L.explorer],
    ["profile", <User size={21} />, L.profile],
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: 65, background: "#0f1521", borderTop: "1px solid #1e2a3a", display: "flex", alignItems: "center", zIndex: 200 }}>
      {tabs.map(([id, icon, label]) => {
        const active = activeTab === id;
        return (
          <button key={id} onClick={() => setActiveTab(id as Tab)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer", position: "relative", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
            {active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, borderRadius: "0 0 3px 3px", background: "#e8b84b" }} />}
            <div style={{ color: active ? "#e8b84b" : "#4a5568", transition: "color 0.15s" }}>{icon}</div>
            <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, color: active ? "#e8b84b" : "#4a5568", transition: "color 0.15s" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD MAIN
// ══════════════════════════════════════════════
export default function Dashboard() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userCountry, setUserCountry] = useState("us");
  const [userState, setUserState] = useState("");
  const [userCity, setUserCity] = useState("");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const [toast, setToast] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [arrivalDate, setArrivalDate] = useState<string | null>(null);
  const [armyStatus, setArmyStatus] = useState("");
  const [phaseUnlockAnim, setPhaseUnlockAnim] = useState<PhaseId | null>(null);
  const [showArmyGuide, setShowArmyGuide] = useState(false);
  const [activeStepModal, setActiveStepModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [preChecklist, setPreChecklist] = useState<Record<string, boolean>>({});

  const streak = useStreak(userId);
  useScrollToTop(activeTab);

  const T: Record<Lang, Record<string, string>> = {
    fr: { logout: "Déconnexion", undo: "Annuler", completed: "Complétées", integration: "Phase actuelle", remaining: "Restantes", m0: "Bienvenue ! Commence par ta première étape 🚀", m1: "Tu avances bien, continue !", m2: "Tu es sur la bonne voie 🔥", m3: "Presque terminé 💪", m4: "Phase 1 complétée — place aux Fondations ! 🏗️" },
    en: { logout: "Logout", undo: "Undo", completed: "Completed", integration: "Current phase", remaining: "Remaining", m0: "Welcome! Start with your first step 🚀", m1: "You're doing great, keep going!", m2: "You're on the right track 🔥", m3: "Almost done 💪", m4: "Phase 1 done — time for Foundations! 🏗️" },
    es: { logout: "Cerrar sesión", undo: "Deshacer", completed: "Completadas", integration: "Fase actual", remaining: "Restantes", m0: "¡Bienvenido! Empieza con tu primer paso 🚀", m1: "Vas muy bien, ¡sigue así!", m2: "Vas por buen camino 🔥", m3: "Casi terminado 💪", m4: "¡Fase 1 lista — a construir los Cimientos! 🏗️" },
  };
  const text = T[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    const savedName = localStorage.getItem("userName") || "";
    if (savedLang && ["fr", "en", "es"].includes(savedLang)) setLang(savedLang);
    if (savedName) setUserName(savedName);
    const saved = localStorage.getItem("preChecklist");
    if (saved) try { setPreChecklist(JSON.parse(saved)); } catch { /**/ }
    const timeout = setTimeout(() => setReady(true), 5000);
    const unsub = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.uid); setUserEmail(user.email || "");
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() as any : {};
        const name = data?.name || user.displayName || user.email?.split("@")[0] || "User";
        const userLang = (data?.lang as Lang) || savedLang || "fr";
        setUserName(name); setLang(userLang);
        setCompletedSteps(data?.completedSteps || []);
        setUserCountry(data?.country || "us");
        setUserState(data?.location?.state || "");
        setUserCity(data?.location?.city || "");
        setArrivalDate(data?.arrivalDate || null);
        setArmyStatus(data?.armyStatus || "");
        localStorage.setItem("userName", name); localStorage.setItem("lang", userLang);
      } catch { /**/ }
      setReady(true);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const changeLang = useCallback(async (l: Lang) => {
    setLang(l); localStorage.setItem("lang", l); setMenuOpen(false);
    const user = auth.currentUser;
    if (user) { try { await updateDoc(doc(db, "users", user.uid), { lang: l }); } catch { /**/ } }
  }, []);

  const toggleStep = useCallback(async (stepId: string) => {
    const user = auth.currentUser; if (!user) return;
    const msgs = { removed: { fr: "❌ Étape retirée", en: "❌ Step removed", es: "❌ Paso eliminado" }, done: { fr: "✅ Étape complétée !", en: "✅ Step completed!", es: "✅ ¡Paso completado!" } };
    setCompletedSteps(prev => {
      const isDone = prev.includes(stepId);
      const updated = isDone ? prev.filter(s => s !== stepId) : [...prev, stepId];
      if (!isDone) {
        const phaseIds: PhaseId[] = [1, 2, 3, 4, 5];
        for (const pid of phaseIds) {
          const phaseStepIds = PHASE_STEPS[pid].map(s => s.id);
          const wasComplete = phaseStepIds.every(id => prev.includes(id));
          const nowComplete = phaseStepIds.every(id => updated.includes(id));
          if (!wasComplete && nowComplete) { setTimeout(() => setPhaseUnlockAnim(pid), 500); break; }
        }
      }
      setToast(isDone ? msgs.removed[lang] : msgs.done[lang]);
      setLastAction(stepId);
      setTimeout(() => setToast(null), 3000);
      updateDoc(doc(db, "users", user.uid), { completedSteps: updated }).catch(() => { });
      return updated;
    });
  }, [lang]);

  const undo = useCallback(async () => {
    if (!lastAction) return; const user = auth.currentUser; if (!user) return;
    setCompletedSteps(prev => { const updated = prev.filter(s => s !== lastAction); updateDoc(doc(db, "users", user.uid), { completedSteps: updated }).catch(() => { }); return updated; });
    setToast(null); setLastAction(null);
  }, [lastAction]);

  const handleLogout = useCallback(async () => { try { await signOut(auth); } catch { /**/ } window.location.href = "/login"; }, []);

  const handleDeleteAccount = async () => {
    const user = auth.currentUser; if (!user) return;
    if (deleteInput !== "DELETE") { setDeleteError(lang === "fr" ? "Tape DELETE pour confirmer" : lang === "es" ? "Escribe DELETE para confirmar" : "Type DELETE to confirm"); return; }
    setDeleting(true);
    try {
      const snap = await getDoc(doc(db, "users", user.uid)); const data = snap.exists() ? snap.data() : {};
      await setDoc(doc(db, "deleted_users", user.uid), { ...data, deletedAt: new Date().toISOString(), originalUid: user.uid, originalEmail: user.email });
      await updateDoc(doc(db, "users", user.uid), { deleted: true, deletedAt: new Date().toISOString(), name: "***", email: "***", location: null, communityVisible: false });
      await deleteUser(user); localStorage.clear(); window.location.href = "/home";
    } catch (err: any) {
      setDeleteError(err.code === "auth/requires-recent-login" ? (lang === "fr" ? "Reconnecte-toi d'abord" : lang === "es" ? "Vuelve a iniciar sesión" : "Please sign in again first") : (lang === "fr" ? "Erreur — réessaie" : lang === "es" ? "Error" : "Error — try again"));
      setDeleting(false);
    }
  };

  const { currentPhase, phaseProgress } = getPhaseStats(completedSteps);
  const currentPhaseMeta = PHASES_META[currentPhase];
  const phase1Done = PHASE_STEPS[1].filter(s => completedSteps.includes(s.id)).length;
  const motivMsg = phase1Done === 0 ? text.m0 : phase1Done < 2 ? text.m1 : phase1Done < 4 ? text.m2 : phaseProgress[1].pct < 100 ? text.m3 : text.m4;

  const CHECKLIST_ITEMS: Record<Lang, { id: string; label: string }[]> = {
    fr: [{ id: "passport", label: "Passeport valide (6 mois minimum)" }, { id: "visa", label: "Visa immigrant approuvé" }, { id: "ticket", label: "Billet d'avion confirmé" }, { id: "cash", label: "Argent liquide ($500 minimum)" }, { id: "insurance", label: "Assurance voyage souscrite" }, { id: "contacts", label: "Contacts d'urgence notés" }, { id: "address", label: "Adresse temporaire aux USA" }, { id: "copies", label: "Copies des documents importants" }],
    en: [{ id: "passport", label: "Valid passport (6 months minimum)" }, { id: "visa", label: "Approved immigrant visa" }, { id: "ticket", label: "Confirmed flight ticket" }, { id: "cash", label: "Cash ($500 minimum)" }, { id: "insurance", label: "Travel insurance purchased" }, { id: "contacts", label: "Emergency contacts noted" }, { id: "address", label: "Temporary address in USA" }, { id: "copies", label: "Copies of important documents" }],
    es: [{ id: "passport", label: "Pasaporte válido (6 meses mínimo)" }, { id: "visa", label: "Visa de inmigrante aprobada" }, { id: "ticket", label: "Billete de avión confirmado" }, { id: "cash", label: "Efectivo ($500 mínimo)" }, { id: "insurance", label: "Seguro de viaje contratado" }, { id: "contacts", label: "Contactos de emergencia anotados" }, { id: "address", label: "Dirección temporal en EE.UU." }, { id: "copies", label: "Copias de documentos importantes" }],
  };

  if (!ready) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0b0f1a", gap: 14 }}>
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "serif" }}><span style={{ color: "#e8b84b" }}>Ku</span><span style={{ color: "#f4f1ec" }}>abo</span></div>
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="17" cy="17" r="13" fill="none" stroke="#1e2a3a" strokeWidth="4" />
        <circle cx="17" cy="17" r="13" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="82" strokeDashoffset="62" />
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: "#0b0f1a", minHeight: "100dvh", color: "#fff" }}>

      {/* OVERLAYS */}
      <PhaseUnlockOverlay phaseId={phaseUnlockAnim} lang={lang} onDone={() => setPhaseUnlockAnim(null)} />
      <ArmyGuideModal armyStatus={showArmyGuide ? armyStatus : null} lang={lang} onClose={() => setShowArmyGuide(false)} />
      <StepModal stepId={activeStepModal} lang={lang} completedSteps={completedSteps} onToggle={toggleStep} onClose={() => setActiveStepModal(null)} />

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => { setShowDeleteModal(false); setDeleteStep(1); setDeleteInput(""); setDeleteError(""); }}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: "20px 20px 0 0", padding: "22px 18px 44px", width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 22px" }} />
            {deleteStep === 1 && (
              <>
                <div style={{ fontSize: 38, textAlign: "center", marginBottom: 14 }}>⚠️</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#ef4444", textAlign: "center", marginBottom: 10 }}>{lang === "fr" ? "Supprimer ton compte ?" : lang === "es" ? "¿Eliminar tu cuenta?" : "Delete your account?"}</div>
                <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", lineHeight: 1.7, marginBottom: 22 }}>{lang === "fr" ? "Cette action est irréversible." : lang === "es" ? "Esta acción es irreversible." : "This action is irreversible."}</div>
                <div style={{ display: "flex", gap: 9 }}>
                  <button onClick={() => { setShowDeleteModal(false); setDeleteStep(1); }} style={{ flex: 1, padding: "12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, color: "#f4f1ec", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Annuler" : lang === "es" ? "Cancelar" : "Cancel"}</button>
                  <button onClick={() => setDeleteStep(2)} style={{ flex: 1, padding: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 11, color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Continuer" : lang === "es" ? "Continuar" : "Continue"}</button>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <div style={{ fontSize: 38, textAlign: "center", marginBottom: 14 }}>🗑️</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#ef4444", textAlign: "center", marginBottom: 7 }}>{lang === "fr" ? "Confirmation finale" : lang === "es" ? "Confirmación final" : "Final confirmation"}</div>
                <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", lineHeight: 1.7, marginBottom: 18 }}>{lang === "fr" ? `Tape "DELETE" pour confirmer.` : lang === "es" ? `Escribe "DELETE" para confirmar.` : `Type "DELETE" to confirm.`}</div>
                <input value={deleteInput} onChange={e => { setDeleteInput(e.target.value); setDeleteError(""); }} placeholder="DELETE" style={{ width: "100%", padding: "12px 13px", background: "#141d2e", border: "1px solid " + (deleteInput === "DELETE" ? "#ef4444" : "#1e2a3a"), borderRadius: 11, color: "#f4f1ec", fontSize: 15, fontFamily: "inherit", outline: "none", marginBottom: 10, boxSizing: "border-box" as const, textAlign: "center" as const, letterSpacing: "0.1em" }} />
                {deleteError && <div style={{ fontSize: 11, color: "#ef4444", textAlign: "center", marginBottom: 10 }}>⚠️ {deleteError}</div>}
                <div style={{ display: "flex", gap: 9 }}>
                  <button onClick={() => { setDeleteStep(1); setDeleteInput(""); setDeleteError(""); }} style={{ flex: 1, padding: "12px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, color: "#f4f1ec", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Retour" : lang === "es" ? "Volver" : "Back"}</button>
                  <button onClick={handleDeleteAccount} disabled={deleting || deleteInput !== "DELETE"} style={{ flex: 1, padding: "12px", background: deleteInput === "DELETE" ? "#ef4444" : "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 11, color: deleteInput === "DELETE" ? "#fff" : "#ef4444", fontSize: 13, fontWeight: 600, cursor: deleteInput === "DELETE" ? "pointer" : "default", fontFamily: "inherit", opacity: deleting ? 0.7 : 1 }}>
                    {deleting ? (lang === "fr" ? "Suppression..." : lang === "es" ? "Eliminando..." : "Deleting...") : (lang === "fr" ? "Supprimer définitivement" : lang === "es" ? "Eliminar definitivamente" : "Delete permanently")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ minHeight: "100dvh", background: "#0b0f1a", color: "#fff", padding: "16px 16px 90px", maxWidth: 480, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: "bold", fontSize: 19 }}><span style={{ color: "#e8b84b" }}>Ku</span>abo</div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <div style={{ background: "#1a2438", padding: "6px 11px", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: "#aaa" }} onClick={() => setMenuOpen(!menuOpen)}>
              <Globe size={12} color="#aaa" />
              <span style={{ maxWidth: 75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{userName}</span>
              <ChevronRight size={12} color="#aaa" style={{ transform: menuOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </div>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "110%", background: "#1a2438", padding: "7px", borderRadius: 10, minWidth: 145, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <div style={{ padding: "7px 9px", cursor: "pointer", fontSize: 12, borderRadius: 6 }} onClick={() => changeLang("fr")}>🇫🇷 Français</div>
                <div style={{ padding: "7px 9px", cursor: "pointer", fontSize: 12, borderRadius: 6 }} onClick={() => changeLang("en")}>🇺🇸 English</div>
                <div style={{ padding: "7px 9px", cursor: "pointer", fontSize: 12, borderRadius: 6 }} onClick={() => changeLang("es")}>🇪🇸 Español</div>
                <hr style={{ borderColor: "#2a3448", margin: "5px 0" }} />
                <div style={{ padding: "7px 9px", cursor: "pointer", fontSize: 12, borderRadius: 6, color: "#ef4444", display: "flex", alignItems: "center", gap: 5 }} onClick={handleLogout}><LogOut size={12} /> {text.logout}</div>
              </div>
            )}
          </div>
        </div>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <>
            {/* ✅ CIRCULAR PROGRESS HERO */}
            <CircularHero currentPhase={currentPhase} phaseProgress={phaseProgress} lang={lang} />

            {/* STATS */}
            <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
              <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "9px 7px", textAlign: "center" as const }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: currentPhaseMeta.color, lineHeight: 1 }}>{phaseProgress[currentPhase].done}</div>
                <div style={{ fontSize: 9, color: "#555", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{text.completed}</div>
              </div>
              <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "9px 7px", textAlign: "center" as const }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: currentPhaseMeta.color, lineHeight: 1 }}>{phaseProgress[currentPhase].pct}%</div>
                <div style={{ fontSize: 9, color: "#555", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{text.integration}</div>
              </div>
              <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, padding: "9px 7px", textAlign: "center" as const }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: currentPhaseMeta.color, lineHeight: 1 }}>{phaseProgress[currentPhase].total - phaseProgress[currentPhase].done}</div>
                <div style={{ fontSize: 9, color: "#555", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{text.remaining}</div>
              </div>
            </div>

            {/* ✅ COUNTDOWN DEADLINE */}
            <CountdownSection arrivalDate={arrivalDate} lang={lang} completedSteps={completedSteps} onOpenStep={setActiveStepModal} />

            {/* ✅ ARMY BANNER */}
            {armyStatus && <ArmyBanner armyStatus={armyStatus} lang={lang} onViewGuide={() => setShowArmyGuide(true)} />}

            <StreakCard streak={streak} lang={lang} />
            <DailyTip lang={lang} userState={userState} userCountry={userCountry} />
            {userId && <AdminEvents lang={lang} userState={userState} userCountry={userCountry} userId={userId} />}
            <KuaboAIButton lang={lang} completedSteps={completedSteps} userState={userState} userCity={userCity} />

            {/* ✅ BADGES */}
            <BadgesRow completedSteps={completedSteps} lang={lang} />

            {/* ✅ AD BANNER — seulement si admin a posté une pub */}
            <AdBanner lang={lang} userState={userState} userCountry={userCountry} />

            {/* Checklist avant départ */}
            {phaseProgress[1].done === 0 && (
              <div style={{ marginBottom: 12, background: "rgba(232,184,75,0.05)", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 14, padding: "14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", marginBottom: 3 }}>{lang === "fr" ? "📋 Checklist avant ton départ" : lang === "es" ? "📋 Lista antes de partir" : "📋 Pre-departure checklist"}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>{lang === "fr" ? "Coche tout avant de prendre l'avion" : lang === "es" ? "Marca todo antes de tomar el avión" : "Check everything before your flight"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {CHECKLIST_ITEMS[lang].map(item => {
                    const checked = !!preChecklist[item.id];
                    return (
                      <div key={item.id} onClick={() => { const updated = { ...preChecklist, [item.id]: !checked }; setPreChecklist(updated); localStorage.setItem("preChecklist", JSON.stringify(updated)); }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, border: "2px solid " + (checked ? "#e8b84b" : "#2a3448"), background: checked ? "#e8b84b" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                          {checked && <svg width="11" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <span style={{ fontSize: 12, color: checked ? "#555" : "#f4f1ec", textDecoration: checked ? "line-through" : "none" }}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ✅ PHASES */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600 }}>🗺️ {lang === "fr" ? "Ton parcours Kuabo" : lang === "es" ? "Tu camino Kuabo" : "Your Kuabo Journey"}</div>
              {([1, 2, 3, 4, 5] as PhaseId[]).map(pid => (
                <PhaseCard key={pid} phaseId={pid} lang={lang} completedSteps={completedSteps} onOpenStep={setActiveStepModal} isActive={pid === currentPhase} isUnlocked={isPhaseUnlocked(pid, completedSteps)} />
              ))}
            </div>

            <SOSButton lang={lang} />
          </>
        )}

        {activeTab === "documents" && <div style={{ marginTop: 4 }}><DocumentsTab lang={lang} completedSteps={completedSteps} /></div>}
        {activeTab === "explorer" && <ExplorerTab lang={lang} />}
        {activeTab === "profile" && (
          <div style={{ marginTop: 4 }}>
            <ProfileTab userName={userName} userEmail={userEmail} userCountry={userCountry} userState={userState} userCity={userCity} lang={lang} completedSteps={completedSteps} armyStatus={armyStatus} onArmyChange={setArmyStatus} changeLang={changeLang} onLogout={handleLogout} onDeleteAccount={() => setShowDeleteModal(true)} />
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div style={{ position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)", background: "#1a2438", padding: "9px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>{toast}</span>
            {lastAction && <span onClick={undo} style={{ marginLeft: 9, cursor: "pointer", color: "#e8b84b", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 3 }}><Undo2 size={12} /> {text.undo}</span>}
          </div>
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes checkPop { 0% { transform: scale(0) } 60% { transform: scale(1.2) } 100% { transform: scale(1) } }
      `}</style>
    </div>
  );
}
