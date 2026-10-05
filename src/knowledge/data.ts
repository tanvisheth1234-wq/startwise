// src/knowledge/data.ts — the reviewed knowledge base: sources, licence rules, schemes, roadmap steps
// and starting cost estimates. This is DATA, not AI output: the rule engine filters it with plain code.
// Seed it into the database with `npm run db:seed`.
//
// Status: every record is "check_locally" until a person opens the official page and confirms it.
// verifyNotes says exactly what still needs checking. Never mark a record "verified" without checking.

import type { RuleCondition } from "@/contracts/compliance";
import type { SchemeCondition } from "@/contracts/funding";
import type { Phase } from "@/contracts/common";

export type L = { en: string; hi: string; mr: string };
type Category = "legal" | "money" | "market" | "operations";

export type SourceRecord = { key: string; title: string; url: string; publisher: string; lastVerified: string | null; status: "verified" | "check_locally" };
export type RuleRecord = {
  key: string; name: string; authority: string; appliesTo: RuleCondition; whyNeeded: L; explanation: L;
  costText: L | null; timeText: L | null; documents: L[]; phase: Phase; dependsOn: string[]; officialUrl: string;
  sourceKey: string; lastVerified: string | null; status: "verified" | "check_locally"; verifyNotes: string | null;
  /** Plain-language name shown first; the official name is shown as a small tag. */
  plainName: L;
};
export type SchemeRecord = {
  key: string; name: string; provider: string; benefit: L; eligibility: SchemeCondition & { needsWoman?: boolean };
  whyTemplate: L; documents: L[]; womenFocused: boolean; officialUrl: string; sourceKey: string;
  lastVerified: string | null; status: "verified" | "check_locally";
};
export type TaskTemplate = {
  key: string; phase: Phase; category: Category; title: L; description: L | null; dependsOn: string[];
  dayOffset: number; appliesTo: { businessTypes: string[]; stages: string[] }; ruleKey: string | null;
  /** Where in the app the task is done (relative to /plan/[id]). */
  href: string;
};
export type CostTemplate = { businessType: string; label: L; kind: "one_time" | "monthly" | "per_unit"; amountInr: number };

const ALL = ["*"];

// ------------------------------------------------------------------ sources
export const SOURCES: SourceRecord[] = [
  { key: "fssai_foscos", title: "FSSAI – Kind of Business: licence/registration criteria (updated 01.04.2026)", url: "https://foscos.fssai.gov.in/assets/docs/Revised_2ndApril2026KindofBusinessEligibility.pdf", publisher: "Food Safety and Standards Authority of India", lastVerified: "2026-10-04", status: "verified" },
  { key: "udyam", title: "Udyam Registration portal", url: "https://udyamregistration.gov.in", publisher: "Ministry of MSME, Government of India", lastVerified: "2026-10-04", status: "verified" },
  { key: "gst_portal", title: "GST portal – registration", url: "https://www.gst.gov.in", publisher: "Goods and Services Tax Network", lastVerified: null, status: "check_locally" },
  { key: "mh_shops", title: "Maharashtra Shops and Establishments – online intimation", url: "https://mahakamgar.maharashtra.gov.in", publisher: "Labour Department, Government of Maharashtra", lastVerified: null, status: "check_locally" },
  { key: "mh_ptax", title: "Maharashtra Profession Tax (PTEC)", url: "https://mahagst.gov.in", publisher: "Maharashtra GST Department", lastVerified: null, status: "check_locally" },
  { key: "pmc", title: "Pune Municipal Corporation", url: "https://www.pmc.gov.in", publisher: "Pune Municipal Corporation", lastVerified: null, status: "check_locally" },
  { key: "legal_metrology", title: "Legal Metrology (Packaged Commodities) Rules", url: "https://consumeraffairs.nic.in", publisher: "Department of Consumer Affairs", lastVerified: null, status: "check_locally" },
  { key: "mudra", title: "Pradhan Mantri MUDRA Yojana", url: "https://www.mudra.org.in", publisher: "MUDRA / Government of India", lastVerified: "2026-10-04", status: "verified" },
  { key: "pmegp", title: "PMEGP e-portal (KVIC)", url: "https://www.kviconline.gov.in/pmegpeportal", publisher: "Khadi and Village Industries Commission", lastVerified: null, status: "check_locally" },
  { key: "standup", title: "Stand-Up India", url: "https://www.standupmitra.in", publisher: "SIDBI / Government of India", lastVerified: "2026-10-04", status: "verified" },
  { key: "cmegp", title: "Chief Minister's Employment Generation Programme (Maharashtra)", url: "https://maha-cmegp.gov.in", publisher: "Directorate of Industries, Maharashtra", lastVerified: null, status: "check_locally" },
  { key: "mavim", title: "MAVIM – Mahila Arthik Vikas Mahamandal", url: "https://www.mavimindia.org", publisher: "Government of Maharashtra", lastVerified: null, status: "check_locally" },
  { key: "cgtmse", title: "Credit Guarantee Fund Trust for Micro and Small Enterprises", url: "https://www.cgtmse.in", publisher: "CGTMSE (SIDBI and Ministry of MSME)", lastVerified: null, status: "check_locally" },
  { key: "startup_india", title: "Startup India", url: "https://www.startupindia.gov.in", publisher: "DPIIT, Government of India", lastVerified: null, status: "check_locally" },
];

// ------------------------------------------------------------------ rules
const cond = (c: Partial<RuleCondition>): RuleCondition => ({
  businessTypes: ALL, cities: ALL, premises: ["home", "shop"], sellsOnline: null, minMonthlySalesInr: null, maxMonthlySalesInr: null, ...c,
});

// ₹1.5 crore a year = ₹12,50,000 a month: the FSSAI registration limit for bakery wares, home-based
// food and most food businesses (FSSAI "Kind of Business" criteria, updated 01.04.2026; verified 04.10.2026).
const FSSAI_BASIC_MONTHLY_MAX = 1_250_000;

export const RULES: RuleRecord[] = [
  {
    key: "fssai_basic_registration",
    name: "FSSAI Basic Registration",
    plainName: { en: "Food safety registration", hi: "खाद्य सुरक्षा पंजीकरण", mr: "अन्न सुरक्षा नोंदणी" },
    authority: "FSSAI (via FoSCoS)",
    appliesTo: cond({ businessTypes: ["home_food"], maxMonthlySalesInr: FSSAI_BASIC_MONTHLY_MAX }),
    whyNeeded: {
      en: "Anyone who makes and sells food, even from home, must be registered with FSSAI.",
      hi: "जो भी खाना बनाकर बेचता है, घर से भी, उसे FSSAI में पंजीकरण कराना ज़रूरी है।",
      mr: "जो कोणी अन्न बनवून विकतो, अगदी घरून सुद्धा, त्याने FSSAI कडे नोंदणी करणं आवश्यक आहे.",
    },
    explanation: {
      en: "Food businesses with yearly sales up to ₹1.5 crore (this covers home bakeries and tiffin services) need the FSSAI registration, not a full licence. You apply online on the FoSCoS website with a photo, an ID and your address. You get a 14-digit number to print on your labels and bills.",
      hi: "साल की बिक्री ₹1.5 करोड़ तक वाले खाद्य व्यवसायों (होम बेकरी और टिफ़िन सेवा सहित) को पूरा लाइसेंस नहीं, FSSAI पंजीकरण चाहिए। FoSCoS वेबसाइट पर फोटो, पहचान पत्र और पते के साथ ऑनलाइन आवेदन करें। आपको 14 अंकों का नंबर मिलेगा, जिसे लेबल और बिल पर छापना होता है।",
      mr: "वर्षाची विक्री ₹१.५ कोटींपर्यंत असलेल्या अन्न व्यवसायांना (होम बेकरी आणि डबा सेवेसह) पूर्ण परवाना नाही, FSSAI नोंदणी लागते. FoSCoS वेबसाइटवर फोटो, ओळखपत्र आणि पत्त्यासह ऑनलाइन अर्ज करा. तुम्हाला १४ अंकी क्रमांक मिळेल, तो लेबल आणि बिलावर छापायचा असतो.",
    },
    costText: { en: "₹100 per year", hi: "₹100 प्रति वर्ष", mr: "₹१०० प्रति वर्ष" },
    timeText: { en: "Usually 7–30 days", hi: "आमतौर पर 7–30 दिन", mr: "साधारण ७–३० दिवस" },
    documents: [
      { en: "Recent passport-size photo", hi: "हाल की पासपोर्ट साइज़ फोटो", mr: "अलीकडचा पासपोर्ट आकाराचा फोटो" },
      { en: "Photo ID (Aadhaar, PAN or voter ID)", hi: "फोटो पहचान पत्र (आधार, पैन या वोटर आईडी)", mr: "फोटो ओळखपत्र (आधार, पॅन किंवा मतदार ओळखपत्र)" },
      { en: "Address proof of the kitchen", hi: "रसोई के पते का प्रमाण", mr: "स्वयंपाकघराच्या पत्त्याचा पुरावा" },
    ],
    phase: "register", dependsOn: [], officialUrl: "https://foscos.fssai.gov.in", sourceKey: "fssai_foscos",
    lastVerified: "2026-10-04", status: "verified", verifyNotes: "Verified 04.10.2026 against FSSAI Kind of Business criteria (updated 01.04.2026): registration up to ₹1.5 Cr turnover, ₹100/year. Processing time is not stated there.",
  },
  {
    key: "fssai_state_licence",
    name: "FSSAI State Licence",
    plainName: { en: "Food safety licence (bigger sellers)", hi: "खाद्य सुरक्षा लाइसेंस (बड़े विक्रेता)", mr: "अन्न सुरक्षा परवाना (मोठे विक्रेते)" },
    authority: "FSSAI / Maharashtra FDA (via FoSCoS)",
    appliesTo: cond({ businessTypes: ["home_food"], minMonthlySalesInr: FSSAI_BASIC_MONTHLY_MAX + 1 }),
    whyNeeded: {
      en: "Once yearly food sales cross ₹1.5 crore, the FSSAI registration is no longer enough and you need a State Licence.",
      hi: "जब खाने की सालाना बिक्री ₹1.5 करोड़ से ज़्यादा हो जाए, तब FSSAI पंजीकरण काफ़ी नहीं रहता और स्टेट लाइसेंस चाहिए।",
      mr: "अन्नाची वार्षिक विक्री ₹१.५ कोटींच्या पुढे गेली की FSSAI नोंदणी पुरेशी राहत नाही आणि राज्य परवाना लागतो.",
    },
    explanation: {
      en: "Bigger food businesses apply for a State Licence on FoSCoS. It needs more papers, such as a kitchen layout and a water test report, and may include an inspection.",
      hi: "बड़े खाद्य व्यवसाय FoSCoS पर स्टेट लाइसेंस के लिए आवेदन करते हैं। इसमें रसोई का नक्शा, पानी की जाँच रिपोर्ट जैसे ज़्यादा कागज़ लगते हैं, और जाँच भी हो सकती है।",
      mr: "मोठे अन्न व्यवसाय FoSCoS वर राज्य परवान्यासाठी अर्ज करतात. त्यासाठी स्वयंपाकघराचा आराखडा, पाणी तपासणी अहवाल अशी जास्त कागदपत्रं लागतात आणि तपासणीही होऊ शकते.",
    },
    costText: { en: "₹5,000 per year", hi: "₹5,000 प्रति वर्ष", mr: "₹५,००० प्रति वर्ष" },
    timeText: { en: "Up to 60 days", hi: "60 दिन तक", mr: "६० दिवसांपर्यंत" },
    documents: [
      { en: "Kitchen layout plan", hi: "रसोई का नक्शा", mr: "स्वयंपाकघराचा आराखडा" },
      { en: "Water test report", hi: "पानी की जाँच रिपोर्ट", mr: "पाणी तपासणी अहवाल" },
      { en: "Photo ID and address proof", hi: "फोटो पहचान पत्र और पते का प्रमाण", mr: "फोटो ओळखपत्र आणि पत्त्याचा पुरावा" },
    ],
    phase: "register", dependsOn: [], officialUrl: "https://foscos.fssai.gov.in", sourceKey: "fssai_foscos",
    lastVerified: "2026-10-04", status: "verified", verifyNotes: "Fee and threshold verified 04.10.2026 (FSSAI criteria updated 01.04.2026). VERIFY: document list and timeline on FoSCoS.",
  },
  {
    key: "udyam_registration",
    name: "Udyam Registration",
    plainName: { en: "Small business (MSME) registration", hi: "लघु उद्योग (MSME) पंजीकरण", mr: "लघु उद्योग (MSME) नोंदणी" },
    authority: "Ministry of MSME",
    appliesTo: cond({}),
    whyNeeded: {
      en: "Not compulsory to start, but it is free and opens the door to MSME loans and government schemes.",
      hi: "शुरू करने के लिए ज़रूरी नहीं, पर यह मुफ़्त है और MSME लोन व सरकारी योजनाओं का रास्ता खोलता है।",
      mr: "सुरुवात करायला सक्तीचं नाही, पण हे मोफत आहे आणि MSME कर्ज व सरकारी योजनांचा मार्ग उघडतं.",
    },
    explanation: {
      en: "Udyam is a free online registration for micro and small businesses. You fill one form with your Aadhaar and PAN and get an Udyam certificate the same day. Banks often ask for it when you apply for a business loan.",
      hi: "उद्यम सूक्ष्म और लघु व्यवसायों का मुफ़्त ऑनलाइन पंजीकरण है। आधार और पैन से एक फ़ॉर्म भरें और उसी दिन उद्यम प्रमाणपत्र पाएँ। बिज़नेस लोन के लिए बैंक अक्सर इसे माँगते हैं।",
      mr: "उद्यम ही सूक्ष्म आणि लघु व्यवसायांसाठी मोफत ऑनलाइन नोंदणी आहे. आधार आणि पॅनसह एक फॉर्म भरा आणि त्याच दिवशी उद्यम प्रमाणपत्र मिळवा. व्यवसाय कर्जासाठी बँका अनेकदा ते मागतात.",
    },
    costText: { en: "Free", hi: "मुफ़्त", mr: "मोफत" },
    timeText: { en: "Same day", hi: "उसी दिन", mr: "त्याच दिवशी" },
    documents: [
      { en: "Aadhaar number (linked to your mobile)", hi: "आधार नंबर (मोबाइल से जुड़ा)", mr: "आधार क्रमांक (मोबाइलशी जोडलेला)" },
      { en: "PAN card (and GSTIN, if you have one)", hi: "पैन कार्ड (और GSTIN, अगर है)", mr: "पॅन कार्ड (आणि GSTIN, असल्यास)" },
      { en: "Bank account details", hi: "बैंक खाते का विवरण", mr: "बँक खात्याचा तपशील" },
    ],
    phase: "register", dependsOn: [], officialUrl: "https://udyamregistration.gov.in", sourceKey: "udyam",
    lastVerified: "2026-10-04", status: "verified", verifyNotes: "Verified 04.10.2026 on udyamregistration.gov.in: registration is totally free, Aadhaar-based and paperless.",
  },
  {
    key: "gst_registration",
    name: "GST Registration",
    plainName: { en: "GST registration (when sales grow)", hi: "GST पंजीकरण (बिक्री बढ़ने पर)", mr: "GST नोंदणी (विक्री वाढल्यावर)" },
    authority: "GSTN / Maharashtra GST",
    appliesTo: cond({ minMonthlySalesInr: 333_000 }),
    whyNeeded: {
      en: "GST registration becomes compulsory once yearly sales of goods cross ₹40 lakh (₹20 lakh for services like tailoring).",
      hi: "सामान की सालाना बिक्री ₹40 लाख (सिलाई जैसी सेवाओं के लिए ₹20 लाख) पार होने पर GST पंजीकरण ज़रूरी हो जाता है।",
      mr: "वस्तूंची वार्षिक विक्री ₹४० लाख (शिवणकामासारख्या सेवांसाठी ₹२० लाख) ओलांडली की GST नोंदणी सक्तीची होते.",
    },
    explanation: {
      en: "Most home businesses start far below this limit, so you probably don't need GST yet. Keep a simple record of monthly sales; we'll remind you as you get closer.",
      hi: "ज़्यादातर घरेलू व्यवसाय इस सीमा से काफ़ी नीचे शुरू होते हैं, इसलिए शायद अभी GST की ज़रूरत नहीं। हर महीने की बिक्री का सरल हिसाब रखें; सीमा के पास पहुँचने पर हम याद दिलाएँगे।",
      mr: "बहुतेक घरगुती व्यवसाय या मर्यादेपेक्षा खूप खाली सुरू होतात, त्यामुळे कदाचित आत्ता GST ची गरज नाही. दरमहा विक्रीची साधी नोंद ठेवा; मर्यादेच्या जवळ आल्यावर आम्ही आठवण करून देऊ.",
    },
    costText: { en: "Free to register", hi: "पंजीकरण मुफ़्त", mr: "नोंदणी मोफत" },
    timeText: { en: "About 7 working days", hi: "लगभग 7 कार्य दिवस", mr: "साधारण ७ कामकाजाचे दिवस" },
    documents: [
      { en: "PAN card", hi: "पैन कार्ड", mr: "पॅन कार्ड" },
      { en: "Aadhaar", hi: "आधार", mr: "आधार" },
      { en: "Address proof of the business", hi: "व्यवसाय के पते का प्रमाण", mr: "व्यवसायाच्या पत्त्याचा पुरावा" },
      { en: "Bank account proof", hi: "बैंक खाते का प्रमाण", mr: "बँक खात्याचा पुरावा" },
    ],
    phase: "launch", dependsOn: [], officialUrl: "https://www.gst.gov.in", sourceKey: "gst_portal",
    lastVerified: null, status: "check_locally", verifyNotes: "VERIFY: threshold for Maharashtra (goods ₹40 lakh, services ₹20 lakh).",
  },
  {
    key: "gst_online_seller",
    name: "GST for marketplace sellers",
    plainName: { en: "GST check for selling on Amazon, Meesho etc.", hi: "Amazon, Meesho आदि पर बेचने के लिए GST जाँच", mr: "Amazon, Meesho इ. वर विक्रीसाठी GST तपासणी" },
    authority: "GSTN",
    appliesTo: cond({ businessTypes: ["online_reselling"], sellsOnline: true }),
    whyNeeded: {
      en: "Selling through marketplaces has special GST rules. Small sellers inside one state may be exempt, but marketplaces often ask for a GSTIN.",
      hi: "मार्केटप्लेस से बेचने पर GST के अलग नियम हैं। एक ही राज्य में बेचने वाले छोटे विक्रेताओं को छूट मिल सकती है, पर मार्केटप्लेस अक्सर GSTIN माँगते हैं।",
      mr: "मार्केटप्लेसवरून विक्री करताना GST चे वेगळे नियम आहेत. एकाच राज्यात विकणाऱ्या लहान विक्रेत्यांना सूट मिळू शकते, पण मार्केटप्लेस अनेकदा GSTIN मागतात.",
    },
    explanation: {
      en: "If you only sell on WhatsApp and Instagram yourself, the normal GST limit applies. If you join Amazon, Flipkart or Meesho, check their seller rules and the GST portal before you sign up.",
      hi: "अगर आप सिर्फ़ खुद WhatsApp और Instagram पर बेचते हैं, तो सामान्य GST सीमा लागू होती है। Amazon, Flipkart या Meesho से जुड़ने से पहले उनके विक्रेता नियम और GST पोर्टल देख लें।",
      mr: "तुम्ही फक्त स्वतः WhatsApp आणि Instagram वर विकत असाल तर नेहमीची GST मर्यादा लागू होते. Amazon, Flipkart किंवा Meesho वर जाण्याआधी त्यांचे विक्रेता नियम आणि GST पोर्टल तपासा.",
    },
    costText: { en: "Free to register", hi: "पंजीकरण मुफ़्त", mr: "नोंदणी मोफत" },
    timeText: null,
    documents: [
      { en: "PAN card", hi: "पैन कार्ड", mr: "पॅन कार्ड" },
      { en: "Bank account proof", hi: "बैंक खाते का प्रमाण", mr: "बँक खात्याचा पुरावा" },
    ],
    phase: "register", dependsOn: [], officialUrl: "https://www.gst.gov.in", sourceKey: "gst_portal",
    lastVerified: null, status: "check_locally", verifyNotes: "VERIFY: current exemption for intra-state e-commerce suppliers.",
  },
  {
    key: "mh_shop_establishment",
    name: "Shops and Establishments intimation (Maharashtra)",
    plainName: { en: "Shop registration (if you open a shop)", hi: "दुकान पंजीकरण (दुकान खोलने पर)", mr: "दुकान नोंदणी (दुकान उघडल्यास)" },
    authority: "Labour Department, Maharashtra",
    appliesTo: cond({ premises: ["shop"] }),
    whyNeeded: {
      en: "A shop or workplace in Maharashtra must be registered or intimated with the Labour Department.",
      hi: "महाराष्ट्र में दुकान या कार्यस्थल का श्रम विभाग में पंजीकरण या सूचना देना ज़रूरी है।",
      mr: "महाराष्ट्रात दुकान किंवा कामाच्या जागेची कामगार विभागाकडे नोंदणी किंवा सूचना देणं आवश्यक आहे.",
    },
    explanation: {
      en: "Shops with fewer than 10 workers usually only file a simple online intimation. Bigger ones need full registration. Working from home without staff usually doesn't need this.",
      hi: "10 से कम कर्मचारियों वाली दुकानें आमतौर पर बस एक सरल ऑनलाइन सूचना देती हैं। बड़ी दुकानों को पूरा पंजीकरण चाहिए। बिना कर्मचारियों के घर से काम करने पर आमतौर पर इसकी ज़रूरत नहीं।",
      mr: "१० पेक्षा कमी कामगार असलेली दुकानं सहसा फक्त एक साधी ऑनलाइन सूचना देतात. मोठ्या दुकानांना पूर्ण नोंदणी लागते. कामगारांशिवाय घरून काम करताना सहसा याची गरज नसते.",
    },
    costText: { en: "Free for the intimation", hi: "सूचना के लिए मुफ़्त", mr: "सूचनेसाठी मोफत" },
    timeText: { en: "A few days", hi: "कुछ दिन", mr: "काही दिवस" },
    documents: [
      { en: "Shop address proof or rent agreement", hi: "दुकान के पते का प्रमाण या किराया अनुबंध", mr: "दुकानाच्या पत्त्याचा पुरावा किंवा भाडेकरार" },
      { en: "Owner's photo ID", hi: "मालिक का फोटो पहचान पत्र", mr: "मालकाचं फोटो ओळखपत्र" },
    ],
    phase: "register", dependsOn: [], officialUrl: "https://mahakamgar.maharashtra.gov.in", sourceKey: "mh_shops",
    lastVerified: null, status: "check_locally", verifyNotes: "VERIFY: worker threshold and portal link (Aaple Sarkar / mahakamgar).",
  },
  {
    key: "pmc_trade_licence",
    name: "PMC licence for food premises",
    plainName: { en: "Pune city licence (for a food shop)", hi: "पुणे नगर निगम लाइसेंस (खाने की दुकान के लिए)", mr: "पुणे महानगरपालिका परवाना (खाद्य दुकानासाठी)" },
    authority: "Pune Municipal Corporation",
    appliesTo: cond({ businessTypes: ["home_food"], premises: ["shop"], cities: ["pune"] }),
    whyNeeded: {
      en: "Food shops and eateries in Pune may need a licence from the municipal corporation in addition to FSSAI.",
      hi: "पुणे में खाने की दुकानों को FSSAI के साथ नगर निगम का लाइसेंस भी लग सकता है।",
      mr: "पुण्यात खाद्य दुकानांना FSSAI सोबत महानगरपालिकेचा परवानाही लागू शकतो.",
    },
    explanation: {
      en: "Ask at your PMC ward office which licence applies to your shop. Home kitchens without a shop front usually don't need it.",
      hi: "अपने PMC वार्ड कार्यालय में पूछें कि आपकी दुकान पर कौन सा लाइसेंस लागू होता है। बिना दुकान वाली घरेलू रसोई को आमतौर पर इसकी ज़रूरत नहीं।",
      mr: "तुमच्या PMC प्रभाग कार्यालयात विचारा की तुमच्या दुकानाला कोणता परवाना लागू होतो. दुकान नसलेल्या घरगुती स्वयंपाकघराला सहसा याची गरज नसते.",
    },
    costText: null, timeText: null,
    documents: [{ en: "Shop address proof", hi: "दुकान के पते का प्रमाण", mr: "दुकानाच्या पत्त्याचा पुरावा" }],
    phase: "register", dependsOn: ["fssai_basic_registration"], officialUrl: "https://www.pmc.gov.in", sourceKey: "pmc",
    lastVerified: null, status: "check_locally", verifyNotes: "VERIFY: exact licence name and process at a PMC ward office.",
  },
  {
    key: "mh_profession_tax",
    name: "Profession Tax enrolment (PTEC)",
    plainName: { en: "Maharashtra profession tax", hi: "महाराष्ट्र व्यवसाय कर", mr: "महाराष्ट्र व्यवसाय कर" },
    authority: "Maharashtra GST Department",
    appliesTo: cond({ cities: ["pune", "mumbai", "nagpur", "nashik", "thane", "pimpri-chinchwad"], minMonthlySalesInr: 50_000 }),
    whyNeeded: {
      en: "People running a business in Maharashtra may need to enrol for profession tax once the business is regular.",
      hi: "महाराष्ट्र में नियमित व्यवसाय चलाने वालों को व्यवसाय कर में नामांकन कराना पड़ सकता है।",
      mr: "महाराष्ट्रात नियमित व्यवसाय करणाऱ्यांना व्यवसाय करासाठी नावनोंदणी करावी लागू शकते.",
    },
    explanation: {
      en: "This is a small yearly state tax. Check on the Maharashtra GST website or with a local tax helper whether it applies to you yet.",
      hi: "यह एक छोटा सालाना राज्य कर है। महाराष्ट्र GST वेबसाइट या किसी स्थानीय टैक्स सलाहकार से पूछें कि यह अभी आप पर लागू होता है या नहीं।",
      mr: "हा एक लहान वार्षिक राज्य कर आहे. महाराष्ट्र GST वेबसाइटवर किंवा स्थानिक कर सल्लागाराकडे तपासा की तो तुम्हाला आत्ता लागू होतो का.",
    },
    costText: { en: "Up to ₹2,500 per year", hi: "₹2,500 प्रति वर्ष तक", mr: "₹२,५०० प्रति वर्षापर्यंत" },
    timeText: null,
    documents: [{ en: "PAN card", hi: "पैन कार्ड", mr: "पॅन कार्ड" }],
    phase: "launch", dependsOn: [], officialUrl: "https://mahagst.gov.in", sourceKey: "mh_ptax",
    lastVerified: null, status: "check_locally", verifyNotes: "VERIFY: who must enrol and the current amount.",
  },
  {
    key: "packaged_food_labels",
    name: "FSSAI Labelling & Display rules",
    plainName: { en: "Labels on packed products", hi: "पैक किए सामान पर लेबल", mr: "पॅक केलेल्या वस्तूंवर लेबल" },
    authority: "FSSAI / Legal Metrology",
    appliesTo: cond({ businessTypes: ["home_food", "online_reselling"] }),
    whyNeeded: {
      en: "Packed food or goods sold to customers need a proper label.",
      hi: "ग्राहकों को बेचे जाने वाले पैक खाने या सामान पर सही लेबल होना चाहिए।",
      mr: "ग्राहकांना विकल्या जाणाऱ्या पॅक केलेल्या अन्नावर किंवा वस्तूंवर योग्य लेबल हवं.",
    },
    explanation: {
      en: "A simple label shows the product name, ingredients, best-before date, price and your FSSAI number (for food). Fresh items made to order usually need less.",
      hi: "सरल लेबल पर उत्पाद का नाम, सामग्री, कब तक अच्छा रहेगा, कीमत और (खाने के लिए) आपका FSSAI नंबर होता है। ऑर्डर पर बने ताज़ा सामान के लिए आमतौर पर कम चाहिए।",
      mr: "साध्या लेबलवर उत्पादनाचं नाव, घटक, कधीपर्यंत चांगलं राहील, किंमत आणि (अन्नासाठी) तुमचा FSSAI क्रमांक असतो. ऑर्डरनुसार बनवलेल्या ताज्या वस्तूंसाठी सहसा कमी लागतं.",
    },
    costText: { en: "Printing cost only", hi: "सिर्फ़ छपाई का खर्च", mr: "फक्त छपाईचा खर्च" },
    timeText: null, documents: [],
    phase: "launch", dependsOn: [], officialUrl: "https://foscos.fssai.gov.in", sourceKey: "legal_metrology",
    lastVerified: null, status: "check_locally", verifyNotes: "VERIFY: labelling exemptions for made-to-order items.",
  },
];

// ------------------------------------------------------------------ schemes
const scheme = (c: Partial<SchemeCondition>): SchemeCondition => ({
  businessTypes: ALL, stages: ["new_idea", "existing"], states: ALL, womenOnly: false,
  minAge: null, maxAge: null, minInvestmentInr: null, maxInvestmentInr: null, ...c,
});

export const SCHEMES: SchemeRecord[] = [
  {
    key: "mudra_shishu", name: "PM MUDRA Yojana – Shishu", provider: "Banks, NBFCs and MFIs under MUDRA",
    benefit: { en: "Business loan up to ₹50,000 without collateral", hi: "बिना गिरवी ₹50,000 तक का बिज़नेस लोन", mr: "तारणाशिवाय ₹५०,००० पर्यंत व्यवसाय कर्ज" },
    eligibility: scheme({ maxInvestmentInr: 50_000 }),
    whyTemplate: { en: "Your starting budget fits a small Shishu loan.", hi: "आपका शुरुआती बजट छोटे शिशु लोन में फिट बैठता है।", mr: "तुमचं सुरुवातीचं बजेट लहान शिशु कर्जात बसतं." },
    documents: [
      { en: "Photo ID and address proof", hi: "फोटो पहचान पत्र और पते का प्रमाण", mr: "फोटो ओळखपत्र आणि पत्त्याचा पुरावा" },
      { en: "Simple business plan with costs", hi: "खर्च के साथ सरल बिज़नेस प्लान", mr: "खर्चासह साधा व्यवसाय आराखडा" },
      { en: "Quotations for what you'll buy", hi: "जो सामान खरीदेंगे उसके कोटेशन", mr: "जे खरेदी करणार त्याची कोटेशन्स" },
    ],
    womenFocused: false, officialUrl: "https://www.mudra.org.in", sourceKey: "mudra", lastVerified: "2026-10-04", status: "verified",
  },
  {
    key: "mudra_kishore", name: "PM MUDRA Yojana – Kishore", provider: "Banks, NBFCs and MFIs under MUDRA",
    benefit: { en: "Business loan from ₹50,000 to ₹5 lakh", hi: "₹50,000 से ₹5 लाख तक बिज़नेस लोन", mr: "₹५०,००० ते ₹५ लाखांपर्यंत व्यवसाय कर्ज" },
    eligibility: scheme({ minInvestmentInr: 50_001, maxInvestmentInr: 500_000 }),
    whyTemplate: { en: "Your plan needs more than ₹50,000, which is Kishore's range.", hi: "आपके प्लान को ₹50,000 से ज़्यादा चाहिए, जो किशोर की सीमा में है।", mr: "तुमच्या प्लॅनला ₹५०,००० पेक्षा जास्त लागतात, जे किशोरच्या मर्यादेत आहे." },
    documents: [
      { en: "Photo ID and address proof", hi: "फोटो पहचान पत्र और पते का प्रमाण", mr: "फोटो ओळखपत्र आणि पत्त्याचा पुरावा" },
      { en: "Business plan and cost estimates", hi: "बिज़नेस प्लान और खर्च का अनुमान", mr: "व्यवसाय आराखडा आणि खर्चाचा अंदाज" },
      { en: "Udyam certificate (helps)", hi: "उद्यम प्रमाणपत्र (मदद करता है)", mr: "उद्यम प्रमाणपत्र (उपयोगी)" },
    ],
    womenFocused: false, officialUrl: "https://www.mudra.org.in", sourceKey: "mudra", lastVerified: "2026-10-04", status: "verified",
  },
  {
    key: "pmegp", name: "PMEGP – PM's Employment Generation Programme", provider: "KVIC through banks",
    benefit: { en: "Subsidy of 15–35% on a new unit's project cost (higher for women)", hi: "नई इकाई की लागत पर 15–35% सब्सिडी (महिलाओं के लिए ज़्यादा)", mr: "नवीन युनिटच्या खर्चावर १५–३५% अनुदान (महिलांसाठी जास्त)" },
    eligibility: scheme({ stages: ["new_idea"], minAge: 18 }),
    whyTemplate: { en: "It's for brand-new businesses like yours, and women get a higher subsidy.", hi: "यह आपके जैसे नए व्यवसायों के लिए है, और महिलाओं को ज़्यादा सब्सिडी मिलती है।", mr: "हे तुमच्यासारख्या नवीन व्यवसायांसाठी आहे आणि महिलांना जास्त अनुदान मिळतं." },
    documents: [
      { en: "Aadhaar and PAN", hi: "आधार और पैन", mr: "आधार आणि पॅन" },
      { en: "Project report", hi: "प्रोजेक्ट रिपोर्ट", mr: "प्रकल्प अहवाल" },
      { en: "Education certificate (for bigger projects)", hi: "शिक्षा प्रमाणपत्र (बड़े प्रोजेक्ट के लिए)", mr: "शिक्षण प्रमाणपत्र (मोठ्या प्रकल्पांसाठी)" },
    ],
    womenFocused: false, officialUrl: "https://www.kviconline.gov.in/pmegpeportal", sourceKey: "pmegp", lastVerified: null, status: "check_locally",
  },
  {
    key: "cmegp", name: "CMEGP – Chief Minister's Employment Generation Programme", provider: "Directorate of Industries, Maharashtra",
    benefit: { en: "Maharashtra subsidy of 15–35% on a new project, with relaxed rules for women", hi: "नए प्रोजेक्ट पर महाराष्ट्र की 15–35% सब्सिडी, महिलाओं के लिए आसान नियम", mr: "नवीन प्रकल्पावर महाराष्ट्राचं १५–३५% अनुदान, महिलांसाठी शिथिल नियम" },
    eligibility: scheme({ stages: ["new_idea"], states: ["maharashtra"], minAge: 18, maxAge: 50 }),
    whyTemplate: { en: "You're starting a new business in Maharashtra.", hi: "आप महाराष्ट्र में नया व्यवसाय शुरू कर रहे हैं।", mr: "तुम्ही महाराष्ट्रात नवीन व्यवसाय सुरू करत आहात." },
    documents: [
      { en: "Maharashtra domicile proof", hi: "महाराष्ट्र अधिवास प्रमाण", mr: "महाराष्ट्र अधिवास दाखला" },
      { en: "Aadhaar and PAN", hi: "आधार और पैन", mr: "आधार आणि पॅन" },
      { en: "Project report", hi: "प्रोजेक्ट रिपोर्ट", mr: "प्रकल्प अहवाल" },
    ],
    womenFocused: false, officialUrl: "https://maha-cmegp.gov.in", sourceKey: "cmegp", lastVerified: null, status: "check_locally",
  },
  {
    key: "standup_india", name: "Stand-Up India", provider: "Scheduled commercial banks",
    benefit: { en: "Bank loan from ₹10 lakh to ₹1 crore for a new enterprise", hi: "नए उद्यम के लिए ₹10 लाख से ₹1 करोड़ तक बैंक लोन", mr: "नवीन उद्योगासाठी ₹१० लाख ते ₹१ कोटीपर्यंत बँक कर्ज" },
    eligibility: { ...scheme({ stages: ["new_idea"], minAge: 18, minInvestmentInr: 1_000_000 }), needsWoman: true },
    whyTemplate: { en: "Meant for women founders starting a bigger new enterprise.", hi: "बड़ा नया उद्यम शुरू करने वाली महिला उद्यमियों के लिए।", mr: "मोठा नवीन उद्योग सुरू करणाऱ्या महिला उद्योजकांसाठी." },
    documents: [
      { en: "Aadhaar and PAN", hi: "आधार और पैन", mr: "आधार आणि पॅन" },
      { en: "Project report with costs", hi: "खर्च के साथ प्रोजेक्ट रिपोर्ट", mr: "खर्चासह प्रकल्प अहवाल" },
      { en: "Proof of premises", hi: "जगह का प्रमाण", mr: "जागेचा पुरावा" },
    ],
    womenFocused: true, officialUrl: "https://www.standupmitra.in", sourceKey: "standup", lastVerified: "2026-10-04", status: "verified",
  },
  {
    key: "mavim", name: "MAVIM – Mahila Arthik Vikas Mahamandal", provider: "Government of Maharashtra",
    benefit: { en: "Support for women through self-help groups: training, savings and easier small loans", hi: "स्वयं सहायता समूहों से महिलाओं को मदद: प्रशिक्षण, बचत और आसान छोटे लोन", mr: "बचत गटांमार्फत महिलांना मदत: प्रशिक्षण, बचत आणि सोपी लहान कर्जं" },
    eligibility: { ...scheme({ states: ["maharashtra"] }), needsWoman: true },
    whyTemplate: { en: "A Maharashtra programme just for women founders.", hi: "सिर्फ़ महिला उद्यमियों के लिए महाराष्ट्र का कार्यक्रम।", mr: "फक्त महिला उद्योजकांसाठी महाराष्ट्राचा कार्यक्रम." },
    documents: [{ en: "Aadhaar", hi: "आधार", mr: "आधार" }, { en: "Contact your local MAVIM office or SHG", hi: "स्थानीय MAVIM कार्यालय या स्वयं सहायता समूह से संपर्क करें", mr: "स्थानिक MAVIM कार्यालय किंवा बचत गटाशी संपर्क करा" }],
    womenFocused: true, officialUrl: "https://www.mavimindia.org", sourceKey: "mavim", lastVerified: null, status: "check_locally",
  },
  {
    key: "cgtmse", name: "CGTMSE collateral-free loan guarantee", provider: "CGTMSE through banks",
    benefit: { en: "Bank loans without collateral; higher guarantee cover for women-owned businesses", hi: "बिना गिरवी बैंक लोन; महिलाओं के व्यवसायों को ज़्यादा गारंटी कवर", mr: "तारणाशिवाय बँक कर्ज; महिलांच्या व्यवसायांना जास्त हमी संरक्षण" },
    eligibility: scheme({ minInvestmentInr: 200_000 }),
    whyTemplate: { en: "Your plan may need a loan, and this helps you borrow without collateral.", hi: "आपके प्लान को लोन चाहिए हो सकता है, और यह बिना गिरवी उधार लेने में मदद करता है।", mr: "तुमच्या प्लॅनला कर्ज लागू शकतं आणि हे तारणाशिवाय कर्ज घ्यायला मदत करतं." },
    documents: [{ en: "Udyam certificate", hi: "उद्यम प्रमाणपत्र", mr: "उद्यम प्रमाणपत्र" }, { en: "Business plan", hi: "बिज़नेस प्लान", mr: "व्यवसाय आराखडा" }],
    womenFocused: false, officialUrl: "https://www.cgtmse.in", sourceKey: "cgtmse", lastVerified: null, status: "check_locally",
  },
];

// ------------------------------------------------------------------ roadmap steps
const tpl = (
  key: string, phase: Phase, category: Category, dayOffset: number, title: L, href: string,
  extra: Partial<TaskTemplate> = {},
): TaskTemplate => ({
  key, phase, category, title, description: null, dependsOn: [], dayOffset,
  appliesTo: { businessTypes: ALL, stages: ["new_idea", "existing"] }, ruleKey: null, href, ...extra,
});

export const TASK_TEMPLATES: TaskTemplate[] = [
  tpl("validate.test_sprint", "validate", "market", 0,
    { en: "Run your 7-day test with 10 people", hi: "10 लोगों के साथ 7 दिन का टेस्ट चलाइए", mr: "१० लोकांसोबत ७ दिवसांची चाचणी करा" }, "validate",
    { appliesTo: { businessTypes: ALL, stages: ["new_idea"] } }),
  tpl("prepare.costs", "prepare", "money", 3,
    { en: "Work out your costs and price", hi: "अपना खर्च और कीमत तय कीजिए", mr: "तुमचा खर्च आणि किंमत ठरवा" }, "money"),
  tpl("prepare.bank_upi", "prepare", "money", 5,
    { en: "Keep a separate bank account or UPI for the business", hi: "बिज़नेस के लिए अलग बैंक खाता या UPI रखिए", mr: "व्यवसायासाठी वेगळं बँक खातं किंवा UPI ठेवा" }, "first-customers"),
  tpl("prepare.kitchen", "prepare", "operations", 5,
    { en: "Set up a clean, separate work corner", hi: "एक साफ़, अलग काम की जगह बनाइए", mr: "स्वच्छ, वेगळी कामाची जागा तयार करा" }, "",
    { appliesTo: { businessTypes: ["home_food", "tailoring_boutique"], stages: ["new_idea"] } }),
  tpl("prepare.packaging", "prepare", "operations", 7,
    { en: "Choose your packaging", hi: "अपनी पैकेजिंग चुनिए", mr: "तुमचं पॅकेजिंग निवडा" }, "money",
    { appliesTo: { businessTypes: ["home_food", "online_reselling"], stages: ["new_idea", "existing"] } }),
  tpl("pilot.first_orders", "pilot", "market", 14,
    { en: "Get your first 5 customers from friends and neighbours", hi: "दोस्तों और पड़ोसियों में से पहले 5 ग्राहक बनाइए", mr: "मित्र आणि शेजाऱ्यांमधून पहिले ५ ग्राहक मिळवा" }, "first-customers",
    { dependsOn: ["validate.test_sprint"] }),
  tpl("pilot.feedback", "pilot", "market", 18,
    { en: "Collect feedback and happy-customer photos", hi: "फ़ीडबैक और खुश ग्राहकों की फ़ोटो लीजिए", mr: "अभिप्राय आणि आनंदी ग्राहकांचे फोटो घ्या" }, "first-customers",
    { dependsOn: ["pilot.first_orders"] }),
  tpl("launch.whatsapp", "launch", "market", 21,
    { en: "Set up your WhatsApp Business catalogue", hi: "अपना WhatsApp Business कैटलॉग बनाइए", mr: "तुमचा WhatsApp Business कॅटलॉग तयार करा" }, "first-customers"),
  tpl("launch.marketing_plan", "launch", "market", 22,
    { en: "Start your weekly posting plan", hi: "अपना साप्ताहिक पोस्टिंग प्लान शुरू कीजिए", mr: "तुमचा साप्ताहिक पोस्टिंग प्लॅन सुरू करा" }, "marketing"),
  tpl("launch.google_profile", "launch", "market", 25,
    { en: "Create a free Google Business Profile", hi: "मुफ़्त Google Business Profile बनाइए", mr: "मोफत Google Business Profile तयार करा" }, "first-customers"),
  tpl("improve.review_month", "improve", "money", 45,
    { en: "Review your first month's sales and costs", hi: "पहले महीने की बिक्री और खर्च देखिए", mr: "पहिल्या महिन्याची विक्री आणि खर्च तपासा" }, "money",
    { dependsOn: ["pilot.first_orders"] }),
];

/** Rules become roadmap tasks too ("rule:<key>"), placed by phase. */
export const RULE_TASK_DAY: Record<Phase, number> = { validate: 0, prepare: 7, register: 10, pilot: 14, launch: 28, improve: 45 };

// ------------------------------------------------------------------ starting cost estimates
// Rough Pune estimates to start the conversation. Every number is editable and labelled "estimate".
export const COST_TEMPLATES: CostTemplate[] = [
  { businessType: "home_food", kind: "one_time", amountInr: 8000, label: { en: "Oven / baking tools", hi: "ओवन / बेकिंग के औज़ार", mr: "ओव्हन / बेकिंगची साधनं" } },
  { businessType: "home_food", kind: "one_time", amountInr: 2500, label: { en: "Moulds, trays and containers", hi: "साँचे, ट्रे और डिब्बे", mr: "साचे, ट्रे आणि डबे" } },
  { businessType: "home_food", kind: "one_time", amountInr: 1500, label: { en: "First packaging stock", hi: "पहला पैकेजिंग स्टॉक", mr: "पहिला पॅकेजिंग साठा" } },
  { businessType: "home_food", kind: "one_time", amountInr: 100, label: { en: "FSSAI registration fee", hi: "FSSAI पंजीकरण शुल्क", mr: "FSSAI नोंदणी शुल्क" } },
  { businessType: "home_food", kind: "monthly", amountInr: 1200, label: { en: "Extra gas and electricity", hi: "अतिरिक्त गैस और बिजली", mr: "जास्तीचा गॅस आणि वीज" } },
  { businessType: "home_food", kind: "monthly", amountInr: 500, label: { en: "Phone and internet for orders", hi: "ऑर्डर के लिए फ़ोन और इंटरनेट", mr: "ऑर्डरसाठी फोन आणि इंटरनेट" } },
  { businessType: "home_food", kind: "per_unit", amountInr: 180, label: { en: "Ingredients per item", hi: "हर आइटम की सामग्री", mr: "प्रत्येक वस्तूचे साहित्य" } },
  { businessType: "home_food", kind: "per_unit", amountInr: 30, label: { en: "Box and packing per item", hi: "हर आइटम का डिब्बा और पैकिंग", mr: "प्रत्येक वस्तूचा डबा आणि पॅकिंग" } },

  { businessType: "tailoring_boutique", kind: "one_time", amountInr: 12000, label: { en: "Sewing machine", hi: "सिलाई मशीन", mr: "शिलाई मशीन" } },
  { businessType: "tailoring_boutique", kind: "one_time", amountInr: 2000, label: { en: "Scissors, tapes and tools", hi: "कैंची, फीता और औज़ार", mr: "कात्री, टेप आणि साधनं" } },
  { businessType: "tailoring_boutique", kind: "monthly", amountInr: 600, label: { en: "Electricity and thread stock", hi: "बिजली और धागे का स्टॉक", mr: "वीज आणि धाग्याचा साठा" } },
  { businessType: "tailoring_boutique", kind: "monthly", amountInr: 400, label: { en: "Phone and internet", hi: "फ़ोन और इंटरनेट", mr: "फोन आणि इंटरनेट" } },
  { businessType: "tailoring_boutique", kind: "per_unit", amountInr: 60, label: { en: "Lining, buttons, thread per piece", hi: "हर पीस का अस्तर, बटन, धागा", mr: "प्रत्येक नगाचे अस्तर, बटणं, धागा" } },

  { businessType: "online_reselling", kind: "one_time", amountInr: 15000, label: { en: "First stock", hi: "पहला स्टॉक", mr: "पहिला साठा" } },
  { businessType: "online_reselling", kind: "one_time", amountInr: 1500, label: { en: "Photo setup (light, backdrop)", hi: "फ़ोटो सेटअप (लाइट, बैकड्रॉप)", mr: "फोटो सेटअप (लाइट, बॅकड्रॉप)" } },
  { businessType: "online_reselling", kind: "monthly", amountInr: 800, label: { en: "Phone, internet and ads", hi: "फ़ोन, इंटरनेट और विज्ञापन", mr: "फोन, इंटरनेट आणि जाहिराती" } },
  { businessType: "online_reselling", kind: "per_unit", amountInr: 450, label: { en: "Buying price per piece", hi: "हर पीस का खरीद मूल्य", mr: "प्रत्येक नगाची खरेदी किंमत" } },
  { businessType: "online_reselling", kind: "per_unit", amountInr: 60, label: { en: "Packing and shipping per order", hi: "हर ऑर्डर की पैकिंग और शिपिंग", mr: "प्रत्येक ऑर्डरचं पॅकिंग आणि शिपिंग" } },
];

/** Starting price suggestion per type (editable; shown as an estimate). */
export const DEFAULT_PRICE: Record<string, { price: number; units: number }> = {
  home_food: { price: 450, units: 40 },
  tailoring_boutique: { price: 350, units: 50 },
  online_reselling: { price: 799, units: 40 },
  other: { price: 300, units: 40 },
};

// ------------------------------------------------------------------ local price ranges (Pune)
// Rough ranges from typical local listings, shown only as an estimate with "check 3 local sellers".
// VERIFY: collect current prices from 3–5 Pune sellers before relying on these.
export type PriceRange = { businessType: string; kind: string; item: L; lowInr: number; highInr: number };
export const PRICE_RANGES: PriceRange[] = [
  { businessType: "home_food", kind: "bakery", item: { en: "Custom cake (1 kg)", hi: "कस्टम केक (1 किलो)", mr: "कस्टम केक (१ किलो)" }, lowInr: 600, highInr: 1200 },
  { businessType: "home_food", kind: "bakery", item: { en: "Cookies box (250 g)", hi: "कुकीज़ का डिब्बा (250 ग्राम)", mr: "कुकीजचा डबा (२५० ग्रॅम)" }, lowInr: 200, highInr: 350 },
  { businessType: "home_food", kind: "bakery", item: { en: "Brownies (box of 6)", hi: "ब्राउनी (6 का डिब्बा)", mr: "ब्राउनी (६ चा डबा)" }, lowInr: 300, highInr: 500 },
  { businessType: "home_food", kind: "sweets", item: { en: "Modak (box of 11)", hi: "मोदक (11 का डिब्बा)", mr: "मोदक (११ चा डबा)" }, lowInr: 250, highInr: 450 },
  { businessType: "tailoring_boutique", kind: "tailoring", item: { en: "Blouse stitching", hi: "ब्लाउज़ सिलाई", mr: "ब्लाउज शिलाई" }, lowInr: 300, highInr: 800 },
  { businessType: "tailoring_boutique", kind: "tailoring", item: { en: "Kurti stitching", hi: "कुर्ती सिलाई", mr: "कुर्ती शिलाई" }, lowInr: 400, highInr: 900 },
  { businessType: "tailoring_boutique", kind: "tailoring", item: { en: "Alterations", hi: "फिटिंग/बदलाव", mr: "फिटिंग/बदल" }, lowInr: 80, highInr: 250 },
  { businessType: "online_reselling", kind: "clothes", item: { en: "Kurti", hi: "कुर्ती", mr: "कुर्ती" }, lowInr: 399, highInr: 899 },
  { businessType: "online_reselling", kind: "clothes", item: { en: "Saree (daily wear)", hi: "साड़ी (रोज़ की)", mr: "साडी (रोजची)" }, lowInr: 699, highInr: 1800 },
];
