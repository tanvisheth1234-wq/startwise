// src/features/demo/fixture.ts — "Sunita's home bakery": the demo founder from the pitch deck (slide 5).
// Hand-written so the demo never depends on AI or luck. Dates are relative to "today".
import type { BusinessProfile, Lang } from "@/contracts/profile";
import type { Assumptions, RiskSnapshot, Templates, TestPlan } from "@/contracts/sections";

export function demoProfile(lang: Lang): BusinessProfile {
  return {
    stage: "new_idea",
    businessType: "home_food",
    product: lang === "mr" ? "होम बेकरी: केक आणि कुकीज" : lang === "hi" ? "होम बेकरी: केक और कुकीज़" : "home bakery: custom cakes and cookies",
    city: "Pune",
    locality: "Kothrud",
    premises: "home",
    sellsOnline: false,
    targetCustomer: lang === "mr" ? "कोथरूडमधील कुटुंबं, वाढदिवस आणि ऑफिस पार्ट्या" : lang === "hi" ? "कोथरूड के परिवार, बर्थडे और ऑफिस पार्टियाँ" : "Families in Kothrud, birthdays and office parties",
    budgetInr: 25000,
    hoursPerDay: 4,
    expectedMonthlySalesInr: null,
    language: lang,
    missingFields: [],
  };
}

export const DEMO_IDEA: Record<Lang, string> = {
  en: "I want to start a home bakery in Kothrud, Pune, making custom cakes and cookies from my kitchen.",
  hi: "मुझे पुणे के कोथरूड में घर से होम बेकरी शुरू करनी है, केक और कुकीज़ बनाकर बेचना है।",
  mr: "मला पुण्यात कोथरूडमध्ये घरून होम बेकरी सुरू करायची आहे, केक आणि कुकीज बनवून विकायचे आहेत.",
};

type T3 = Record<Lang, string>;
const tri = (en: string, hi: string, mr: string): T3 => ({ en, hi, mr });

const ASSUMPTIONS: { text: T3; kind: "must_be_true" | "open_question"; how: T3 }[] = [
  { kind: "must_be_true", text: tri("Families in Kothrud will pre-order custom cakes for birthdays", "कोथरूड के परिवार बर्थडे के लिए कस्टम केक पहले से ऑर्डर करेंगे", "कोथरूडमधील कुटुंबं वाढदिवसासाठी कस्टम केक आधीच ऑर्डर करतील"), how: tri("Share a cake photo in 3 society WhatsApp groups and count enquiries", "3 सोसायटी WhatsApp ग्रुप में केक की फ़ोटो भेजकर पूछताछ गिनें", "३ सोसायटी WhatsApp ग्रुपमध्ये केकचा फोटो टाकून चौकश्या मोजा") },
  { kind: "must_be_true", text: tri("People will pay ₹450 for a 500 g homemade cake", "लोग 500 ग्राम घर के बने केक के लिए ₹450 देंगे", "लोक ५०० ग्रॅम घरगुती केकसाठी ₹४५० देतील"), how: tri("Offer 5 pre-orders at ₹450 and see how many say yes", "₹450 पर 5 प्री-ऑर्डर ऑफ़र करें और देखें कितने हाँ कहते हैं", "₹४५० ला ५ प्री-ऑर्डर देऊन किती जण हो म्हणतात ते पाहा") },
  { kind: "must_be_true", text: tri("My home oven can bake 3 cakes a day", "मेरा घर का ओवन रोज़ 3 केक बना सकता है", "माझा घरचा ओव्हन रोज ३ केक बनवू शकतो"), how: tri("Bake 3 cakes back-to-back one evening and time it", "एक शाम लगातार 3 केक बनाकर समय देखें", "एका संध्याकाळी सलग ३ केक बनवून वेळ मोजा") },
  { kind: "open_question", text: tri("Will offices in Kothrud order cookie boxes for Diwali?", "क्या कोथरूड के ऑफिस दिवाली के लिए कुकी बॉक्स ऑर्डर करेंगे?", "कोथरूडमधील ऑफिस दिवाळीसाठी कुकी बॉक्स ऑर्डर करतील का?"), how: tri("Message 3 office admins with a sample box offer", "3 ऑफिस एडमिन को सैंपल बॉक्स ऑफ़र भेजें", "३ ऑफिस अॅडमिनना सॅम्पल बॉक्सची ऑफर पाठवा") },
];

export function demoAssumptions(lang: Lang): Assumptions {
  return { items: ASSUMPTIONS.map((a) => ({ text: a.text[lang], kind: a.kind, howToCheck: a.how[lang] })) };
}

export function demoRisk(lang: Lang): RiskSnapshot {
  return {
    strengths: [tri("Already bakes for family events", "पहले से पारिवारिक कार्यक्रमों के लिए बेक करती हैं", "आधीपासून कौटुंबिक कार्यक्रमांसाठी बेक करते")[lang], tri("Low start-up cost from home", "घर से शुरू करने का कम खर्च", "घरून सुरुवातीचा कमी खर्च")[lang]],
    unknowns: [tri("How many orders a week she can handle", "हफ़्ते में कितने ऑर्डर संभाल सकती हैं", "आठवड्याला किती ऑर्डर सांभाळू शकते")[lang]],
    risks: [
      { area: "operations", text: tri("Cream cakes can melt in transit", "क्रीम केक रास्ते में पिघल सकते हैं", "क्रीम केक वाटेत वितळू शकतात")[lang], evidenceNeeded: tri("Test 3 deliveries within 2 km", "2 किमी के अंदर 3 डिलीवरी आज़माएँ", "२ किमीच्या आत ३ डिलिव्हरी करून पाहा")[lang] },
      { area: "money", text: tri("Butter prices rise before Diwali", "दिवाली से पहले मक्खन महँगा होता है", "दिवाळीआधी लोण्याच्या किमती वाढतात")[lang], evidenceNeeded: tri("Compare 2 wholesale suppliers", "2 थोक विक्रेताओं से तुलना करें", "२ घाऊक विक्रेत्यांशी तुलना करा")[lang] },
    ],
  };
}

export function demoTestPlan(lang: Lang, startDate: string): TestPlan {
  const d = (day: 1 | 2 | 3 | 4 | 5 | 6 | 7, experiment: TestPlan["days"][number]["experiment"], action: T3, costInr: number) => ({ day, experiment, action: action[lang], costInr });
  return {
    startDate,
    targets: { enquiries: 10, orders: 3 },
    days: [
      d(1, "whatsapp_status", tri("Post a cake photo on WhatsApp status with 'Taking weekend orders'", "WhatsApp स्टेटस पर केक की फ़ोटो डालें: 'वीकेंड ऑर्डर ले रही हूँ'", "WhatsApp स्टेटसवर केकचा फोटो टाका: 'वीकेंड ऑर्डर घेत आहे'"), 0),
      d(2, "interviews", tri("Ask 5 neighbours what they pay for birthday cakes", "5 पड़ोसियों से पूछें वे बर्थडे केक के लिए कितना देते हैं", "५ शेजाऱ्यांना विचारा ते वाढदिवसाच्या केकसाठी किती देतात"), 0),
      d(3, "pilot_offer", tri("Bake 2 sample cakes and share tasting slices", "2 सैंपल केक बनाकर टुकड़े चखाएँ", "२ सॅम्पल केक बनवून चव द्या"), 300),
      d(4, "pre_orders", tri("Offer 5 pre-orders at ₹450 for the weekend", "वीकेंड के लिए ₹450 पर 5 प्री-ऑर्डर ऑफ़र करें", "वीकेंडसाठी ₹४५० ला ५ प्री-ऑर्डर द्या"), 0),
      d(5, "whatsapp_status", tri("Share happy-customer photos", "खुश ग्राहकों की फ़ोटो शेयर करें", "आनंदी ग्राहकांचे फोटो शेअर करा"), 0),
      d(6, "pilot_offer", tri("Deliver orders and ask for a review", "ऑर्डर पहुँचाएँ और रिव्यू माँगें", "ऑर्डर पोहोचवा आणि रिव्ह्यू मागा"), 100),
      d(7, "interviews", tri("Count enquiries and orders; decide GO or not", "पूछताछ और ऑर्डर गिनें; GO या नहीं तय करें", "चौकश्या आणि ऑर्डर मोजा; GO की नाही ठरवा"), 0),
    ],
  };
}

export function demoTemplates(lang: Lang): Templates {
  return {
    whatsappMessage: tri(
      "Hi! 🎂 I've started baking fresh custom cakes and cookies from my home in Kothrud. Taking weekend pre-orders: 500 g cake from ₹___. Would you like one for a birthday?",
      "नमस्ते! 🎂 मैंने कोथरूड में घर से ताज़े कस्टम केक और कुकीज़ बनाना शुरू किया है। वीकेंड प्री-ऑर्डर ले रही हूँ: 500 ग्राम केक ₹___ से। बर्थडे के लिए चाहिए?",
      "नमस्कार! 🎂 मी कोथरूडमध्ये घरून ताजे कस्टम केक आणि कुकीज बनवायला सुरुवात केली आहे. वीकेंड प्री-ऑर्डर घेत आहे: ५०० ग्रॅम केक ₹___ पासून. वाढदिवसासाठी हवा आहे का?",
    )[lang],
    poll: {
      question: tri("Which flavour should I bake first?", "पहले कौन सा फ़्लेवर बनाऊँ?", "आधी कोणता फ्लेवर बनवू?")[lang],
      options: [tri("Chocolate truffle", "चॉकलेट ट्रफ़ल", "चॉकलेट ट्रफल")[lang], tri("Eggless pineapple", "एगलेस पाइनएप्पल", "एगलेस पायनॅपल")[lang], tri("Red velvet", "रेड वेलवेट", "रेड वेल्वेट")[lang]],
    },
    priceCard: tri("Custom cake 500 g: ₹___ · Cookie box: ₹___ · Order 2 days ahead", "कस्टम केक 500 ग्राम: ₹___ · कुकी बॉक्स: ₹___ · 2 दिन पहले ऑर्डर करें", "कस्टम केक ५०० ग्रॅम: ₹___ · कुकी बॉक्स: ₹___ · २ दिवस आधी ऑर्डर करा")[lang],
  };
}

/** Day offsets (from the test start) and what happened. Totals: 12 enquiries, 4 orders → GO. */
export const DEMO_RESULTS = [
  { dayOffset: 0, enquiries: 3, orders: 0 },
  { dayOffset: 1, enquiries: 2, orders: 0 },
  { dayOffset: 3, enquiries: 4, orders: 2 },
  { dayOffset: 5, enquiries: 3, orders: 2 },
];

export const DEMO_DIARY: { daysAgo: number; text: T3; kind: "sale" | "expense" | "enquiry"; item: string; quantity: number | null; amountInr: number | null; customer: string | null }[] = [
  { daysAgo: 0, kind: "sale", item: "Chocolate truffle cake", quantity: 1, amountInr: 450, customer: "Priya", text: tri("Sold 1 chocolate truffle cake to Priya for 450", "प्रिया को 1 चॉकलेट ट्रफ़ल केक 450 में बेचा", "प्रियाला १ चॉकलेट ट्रफल केक ४५० ला विकला") },
  { daysAgo: 1, kind: "sale", item: "Cookie box", quantity: 2, amountInr: 560, customer: "Meera", text: tri("Sold 2 cookie boxes to Meera for 560", "मीरा को 2 कुकी बॉक्स 560 में बेचे", "मीराला २ कुकी बॉक्स ५६० ला विकले") },
  { daysAgo: 2, kind: "expense", item: "Butter and cream", quantity: null, amountInr: 640, customer: null, text: tri("Spent 640 on butter and cream", "मक्खन और क्रीम पर 640 खर्च किए", "लोणी आणि क्रीमवर ६४० खर्च केले") },
  { daysAgo: 3, kind: "enquiry", item: "Birthday cake", quantity: null, amountInr: null, customer: "Anjali", text: tri("Anjali asked about an eggless birthday cake", "अंजलि ने एगलेस बर्थडे केक के बारे में पूछा", "अंजलीने एगलेस वाढदिवसाच्या केकबद्दल विचारलं") },
  { daysAgo: 4, kind: "sale", item: "Pineapple cake", quantity: 1, amountInr: 450, customer: "Kavita", text: tri("Sold a pineapple cake to Kavita for 450", "कविता को पाइनएप्पल केक 450 में बेचा", "कविताला पायनॅपल केक ४५० ला विकला") },
];

export const DEMO_NOTES: T3[] = [
  tri("Anjali's daughter is vegetarian, so eggless cakes could be a big thing in our society", "अंजलि की बेटी शाकाहारी है, एगलेस केक हमारी सोसायटी में चल सकते हैं", "अंजलीची मुलगी शाकाहारी आहे, एगलेस केक आमच्या सोसायटीत चालू शकतात"),
  tri("The oven takes 45 min per cake. Maybe buy a second one before Diwali?", "ओवन में एक केक 45 मिनट लेता है। दिवाली से पहले दूसरा ले लूँ?", "ओव्हनला एका केकला ४५ मिनिटं लागतात. दिवाळीआधी दुसरा घ्यावा का?"),
  tri("Office near Karve Road asked about 20 cookie boxes for Diwali", "कर्वे रोड के ऑफिस ने दिवाली के लिए 20 कुकी बॉक्स पूछे", "कर्वे रोडजवळच्या ऑफिसने दिवाळीसाठी २० कुकी बॉक्सबद्दल विचारलं"),
  tri("Scared my mother-in-law will think this is a waste of time", "डर है सासू माँ को लगेगा यह समय की बर्बादी है", "सासूबाईंना हे वेळ वाया घालवणं वाटेल याची भीती वाटते"),
];

/** Roadmap tasks already done in the demo (by key). */
export const DEMO_DONE_TASKS = ["validate.test_sprint", "prepare.costs", "prepare.bank_upi", "rule:udyam_registration", "pilot.first_orders"];
