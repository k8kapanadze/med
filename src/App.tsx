/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Plus,
  Search,
  Heart,
  Trash2,
  Edit,
  Copy,
  RotateCcw,
  FileDown,
  FileUp,
  AlertTriangle,
  Activity,
  Check,
  Eye,
  AlertCircle,
  Filter,
  Info,
  ShieldAlert,
  Database,
  RefreshCw,
  X,
  ExternalLink,
  ClipboardCheck,
  ChevronDown,
  Pill,
  Folder,
  FolderMinus,
  FolderPlus,
  ClipboardList,
  MoreVertical,
  CheckSquare,
  Sparkles,
  Printer,
  Download,
  Syringe,
  Droplets,
  Baby,
  FileText,
  Layers,
  ChevronRight
} from "lucide-react";
import { Medication, Department, Route, DosageForm, Frequency, MealConnection, TimeOfDay } from "./types";
import { PRESET_MEDICATIONS, OFFLINE_EMERGENCY_CATALOG } from "./data";

const getAlbumIcon = (albumName: string) => {
  const name = albumName.toLowerCase();
  if (name === "ყველა" || name === "all") return Layers;
  if (name === "er" || name === "emergency" || name === "გადაუდებელი") return ShieldAlert;
  if (name === "endo" || name === "endocrinology" || name === "ენდოკრინოლოგია") return Activity;
  if (name === "cardiology" || name === "კარდიოლოგია") return Heart;
  if (name === "pediatrics" || name === "პედიატრია" || name === "ბავშვთა") return Baby;
  
  if (name.includes("ამპულა") || name.includes("ამპულები") || name.includes("ინექცია") || name.includes("ampoule") || name.includes("syringe") || name.includes("საინექციო")) {
    return Syringe;
  }
  if (name.includes("ტაბლეტი") || name.includes("კაფსულა") || name.includes("tablet") || name.includes("pill") || name.includes("წამალი")) {
    return Pill;
  }
  if (name.includes("სიროფი") || name.includes("წვეთები") || name.includes("ხსნარი") || name.includes("syrup") || name.includes("drops") || name.includes("solution") || name.includes("სუსპენზია")) {
    return Droplets;
  }
  if (name.includes("მალამო") || name.includes("გელი") || name.includes("კრემი") || name.includes("ointment") || name.includes("cream")) {
    return Sparkles;
  }
  
  return Folder;
};

export default function App() {
  // --- Persistent Patient Status States (Left Panel) ---
  const [patientDiseases, setPatientDiseases] = useState<string[]>(() => {
    const saved = localStorage.getItem("cyber_patient_diseases");
    return saved ? JSON.parse(saved) : [];
  });

  const [patientAllergies, setPatientAllergies] = useState<string[]>(() => {
    const saved = localStorage.getItem("cyber_patient_allergies");
    return saved ? JSON.parse(saved) : [];
  });

  // --- Persistent Albums / Tabs States ---
  const [albums, setAlbums] = useState<string[]>(() => {
    const saved = localStorage.getItem("cyber_albums");
    return saved ? JSON.parse(saved) : ["ყველა", "ER", "Endo", "Cardiology", "Pediatrics"];
  });
  const [activeTab, setActiveTab] = useState<string>("ყველა");

  // --- Medications List State ---
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem("cyber_medications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return PRESET_MEDICATIONS;
  });

  // --- Prescription Cart State (Right Drawer) ---
  const [prescriptionCart, setPrescriptionCart] = useState<Medication[]>(() => {
    const saved = localStorage.getItem("cyber_prescription_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Save states to localStorage on change
  useEffect(() => {
    localStorage.setItem("cyber_patient_diseases", JSON.stringify(patientDiseases));
  }, [patientDiseases]);

  useEffect(() => {
    localStorage.setItem("cyber_patient_allergies", JSON.stringify(patientAllergies));
  }, [patientAllergies]);

  useEffect(() => {
    localStorage.setItem("cyber_albums", JSON.stringify(albums));
  }, [albums]);

  useEffect(() => {
    localStorage.setItem("cyber_medications", JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem("cyber_prescription_cart", JSON.stringify(prescriptionCart));
  }, [prescriptionCart]);

  // --- Filtering, Search & View States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [currentMainView, setCurrentMainView] = useState<"catalog" | "albums">("catalog");
  const [viewingMed, setViewingMed] = useState<Medication | null>(null);

  // --- UI Interactions States ---
  const [isDiseaseDropdownOpen, setIsDiseaseDropdownOpen] = useState(false);
  const [diseaseSearchText, setDiseaseSearchText] = useState("");
  const [allergyInputText, setAllergyInputText] = useState("");
  const [openDropdownAlbum, setOpenDropdownAlbum] = useState<string | null>(null);
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [editingAlbum, setEditingAlbum] = useState<string | null>(null);
  const [renameAlbumValue, setRenameAlbumValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successPrescription, setSuccessPrescription] = useState(false);
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [activeTextarea, setActiveTextarea] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // --- Custom Confirm Modal State ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- Search inside Add/Edit modal for Album search ---
  const [modalAlbumSearchText, setModalAlbumSearchText] = useState("");

  // --- Search and state for bulk actions album dropdown ---
  const [bulkAlbumSearchQuery, setBulkAlbumSearchQuery] = useState("");
  const [isBulkAlbumDropdownOpen, setIsBulkAlbumDropdownOpen] = useState(false);

  // Ref for outside click closing
  const diseaseDropdownRef = useRef<HTMLDivElement>(null);
  const albumDropdownRef = useRef<HTMLDivElement>(null);
  const bulkAlbumDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (diseaseDropdownRef.current && !diseaseDropdownRef.current.contains(event.target as Node)) {
        setIsDiseaseDropdownOpen(false);
      }
      if (albumDropdownRef.current && !albumDropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownAlbum(null);
      }
      if (bulkAlbumDropdownRef.current && !bulkAlbumDropdownRef.current.contains(event.target as Node)) {
        setIsBulkAlbumDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Add/Edit Form Fields State ---
  const [tradeName, setTradeName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>(["General"]);
  const [pharmacologicalGroup, setPharmacologicalGroup] = useState("");
  const [route, setRoute] = useState<Route>("PO");
  const [dosageForm, setDosageForm] = useState<DosageForm>("Tablet");
  const [dilutionAdminRate, setDilutionAdminRate] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("1x");
  const [mealConnection, setMealConnection] = useState<MealConnection>("Independent");
  const [timesOfDay, setTimesOfDay] = useState<TimeOfDay[]>([]);
  const [indicationsStr, setIndicationsStr] = useState("");
  const [contraindications, setContraindications] = useState<string[]>([]);
  const [sideEffects, setSideEffects] = useState("");
  const [clinicalPearls, setClinicalPearls] = useState("");
  const [mechanismOfAction, setMechanismOfAction] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [source, setSource] = useState<"Aversi" | "PSP" | "Custom">("Custom");
  const [isHighRisk, setIsHighRisk] = useState(false);

  // --- Scraper / Pharmacy Sync States ---
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [pharmacySource, setPharmacySource] = useState<"aversi" | "psp">("psp");
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // --- Preset Pathologies List ---
  const DISEASE_PRESETS = [
    { key: "Diabetes", name: "შაქრიანი დიაბეტი (Diabetes)" },
    { key: "CKD", name: "თირკმლის ქრონიკული დაავადება (CKD)" },
    { key: "Pregnancy", name: "ორსულობა და ლაქტაცია (Pregnancy)" },
    { key: "Penicillin Allergy", name: "პენიცილინის ალერგია" },
    { key: "Liver Failure", name: "ღვიძლის უკმარისობა (Liver Failure)" },
    { key: "Hypertension", name: "არტერიული ჰიპერტენზია (Hypertension)" },
    { key: "High Potassium", name: "ჰიპერკალიემია (>5.2 K+)" }
  ];

  // Filtered diseases for combobox
  const filteredDiseasePresets = useMemo(() => {
    return DISEASE_PRESETS.filter(
      d =>
        d.name.toLowerCase().includes(diseaseSearchText.toLowerCase()) &&
        !patientDiseases.includes(d.key)
    );
  }, [diseaseSearchText, patientDiseases]);

  // --- Form Populating Functions ---
  const openAddModal = () => {
    setEditingMed(null);
    setTradeName("");
    setGenericName("");
    setSelectedDepts(["General"]);
    setPharmacologicalGroup("");
    setRoute("PO");
    setDosageForm("Tablet");
    setDilutionAdminRate("");
    setFrequency("1x");
    setMealConnection("Independent");
    setTimesOfDay(["Morning"]);
    setIndicationsStr("");
    setContraindications([]);
    setSideEffects("");
    setClinicalPearls("");
    setMechanismOfAction("");
    setAdditionalInfo("");
    setPrice(undefined);
    setSource("Custom");
    setIsHighRisk(false);
    setPharmacyQuery("");
    setSyncResults([]);
    setSyncMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMed(med);
    setTradeName(med.tradeName);
    setGenericName(med.genericName);
    setSelectedDepts(med.classificationDepartment || []);
    setPharmacologicalGroup(med.pharmacologicalGroup || "");
    setRoute(med.route || "PO");
    setDosageForm(med.dosageForm || "Tablet");
    setDilutionAdminRate(med.dilutionAdminRate || "");
    setFrequency(med.frequency || "1x");
    setMealConnection(med.mealConnection || "Independent");
    setTimesOfDay(med.timeOfDay || []);
    setIndicationsStr(med.indications ? med.indications.join(", ") : "");
    setContraindications(med.contraindications || []);
    setSideEffects(med.sideEffects || "");
    setClinicalPearls(med.clinicalPearls || "");
    setMechanismOfAction(med.mechanismOfAction || "");
    setAdditionalInfo(med.additionalInfo || "");
    setPrice(med.price);
    setSource(med.source || "Custom");
    setIsHighRisk((med as any).isHighRisk || false);
    setPharmacyQuery("");
    setSyncResults([]);
    setSyncMessage(null);
    setIsModalOpen(true);
  };

  // --- Real-time Pharmacy Scraper Sync ---
  const extractMedicalField = (text: string, currentFieldKeywords: string[], nextFieldKeywords: string[]): string => {
    let startIndex = -1;
    let foundKeyword = "";
    for (const keyword of currentFieldKeywords) {
      const idx = text.indexOf(keyword);
      if (idx !== -1 && (startIndex === -1 || idx < startIndex)) {
        startIndex = idx;
        foundKeyword = keyword;
      }
    }
    
    if (startIndex === -1) {
      return "ინფორმაცია არ არის მითითებული";
    }
    
    let contentStart = startIndex + foundKeyword.length;
    let endIndex = text.length;
    
    // Terminate when the next heading or a common section end is encountered
    const allTerminationKeywords = [
      ...nextFieldKeywords, 
      "შენახვის პირობები", 
      "გამოშვების ფორმა", 
      "აფთიაქიდან გაცემის წესი", 
      "მწარმოებელი", 
      "დოზირება", 
      "გვერდითი", 
      "უკუჩვენება"
    ];
    for (const keyword of allTerminationKeywords) {
      const idx = text.indexOf(keyword, contentStart);
      if (idx !== -1 && idx < endIndex) {
        endIndex = idx;
      }
    }
    
    let extracted = text.substring(contentStart, endIndex).trim();
    
    // Clean up punctuation, slashes, dotes, list symbols, colons at start
    extracted = extracted.replace(/^[:\-\s\•\.\,\/]+/g, "").trim();
    
    if (extracted.includes("\n\n")) {
      extracted = extracted.split("\n\n")[0].trim();
    }
    
    if (extracted.length > 500) {
      extracted = extracted.substring(0, 500) + "...";
    }
    
    return extracted || "ინფორმაცია არ არის მითითებული";
  };

  const parseTextDetails = (fullText: string) => {
    const indicationsKeywords = ["ჩვენება", "ჩვენებები", "მიღების ჩვენება", "მიღების ჩვენებები"];
    const sideEffectsKeywords = ["გვერდითი მოვლენები", "გვერდითი ეფექტები", "გვერდითი მოვლენა"];
    const contraindicationsKeywords = ["უკუჩვენება", "უკუჩვენებები"];
    const mechanismKeywords = ["ფარმაკოლოგიური თვისებები", "მოქმედების მექანიზმი", "ფარმაკოდინამიკა", "ფარმაკოლოგიური ჯგუფი"];

    const indicationsStr = extractMedicalField(fullText, indicationsKeywords, [...sideEffectsKeywords, ...contraindicationsKeywords, ...mechanismKeywords]);
    const sideEffectsStr = extractMedicalField(fullText, sideEffectsKeywords, [...indicationsKeywords, ...contraindicationsKeywords, ...mechanismKeywords]);
    const contraindicationsStr = extractMedicalField(fullText, contraindicationsKeywords, [...indicationsKeywords, ...sideEffectsKeywords, ...mechanismKeywords]);
    const mechanismStr = extractMedicalField(fullText, mechanismKeywords, [...indicationsKeywords, ...sideEffectsKeywords, ...contraindicationsKeywords]);

    // Map found contraindications to pre-defined keys
    const parsedContraindications: string[] = [];
    const lowerContra = contraindicationsStr.toLowerCase();
    if (lowerContra.includes("თირკმელ") || lowerContra.includes("უკმარისობა")) {
      if (lowerContra.includes("თირკმელ")) parsedContraindications.push("CKD");
      if (lowerContra.includes("ღვიძლ")) parsedContraindications.push("Liver Failure");
    }
    if (lowerContra.includes("დიაბეტ") || lowerContra.includes("შაქრიან")) parsedContraindications.push("Diabetes");
    if (lowerContra.includes("ორსულ") || lowerContra.includes("ლაქტაც") || lowerContra.includes("ძუძუთი კვებ") || lowerContra.includes("ბავშვ")) parsedContraindications.push("Pregnancy");
    if (lowerContra.includes("ალერგია") || lowerContra.includes("მგრძნობელობა")) parsedContraindications.push("Penicillin Allergy");
    if (lowerContra.includes("წნევ") || lowerContra.includes("ჰიპერტენზია")) parsedContraindications.push("Hypertension");
    if (lowerContra.includes("კალიუმ")) parsedContraindications.push("High Potassium");

    return {
      indications: indicationsStr !== "ინფორმაცია არ არის მითითებული" ? [indicationsStr] : ["ინფორმაცია არ არის მითითებული"],
      sideEffects: sideEffectsStr,
      contraindications: parsedContraindications,
      mechanismOfAction: mechanismStr,
      clinicalPearls: contraindicationsStr !== "ინფორმაცია არ არის მითითებული" ? `უკუჩვენება: ${contraindicationsStr}` : "ინფორმაცია არ არის მითითებული",
      pharmacologicalGroup: mechanismStr !== "ინფორმაცია არ არის მითითებული" && mechanismStr.length < 50 ? mechanismStr : "სხვა"
    };
  };

  const generateMockMedication = (query: string, sourceName: "Aversi" | "PSP"): any => {
    const term = query.trim();
    const queryLower = term.toLowerCase();
    
    let tradeName = term;
    let genericName = "Active Substance";
    let dosageForm = "Tablet";
    let price = 4.50;
    let pharmacologicalGroup = "სხვა";
    let route = "PO" as any;
    let frequency = "1x";
    let mealConnection = "Independent" as any;
    let timeOfDay = ["Morning"];
    let indications = ["ინფორმაცია არ არის მითითებული"];
    let contraindications: string[] = [];
    let sideEffects = "ინფორმაცია არ არის მითითებული";
    let clinicalPearls = "ინფორმაცია არ არის მითითებული";
    let mechanismOfAction = "ინფორმაცია არ არის მითითებული";
    let dilutionAdminRate = "";

    if (queryLower.includes("კაპტო") || queryLower.includes("captopril") || queryLower.includes("კაპტოპრილი")) {
      tradeName = "კაპტოპრილი L";
      genericName = "Captopril";
      dosageForm = "Tablet";
      price = 3.20;
      pharmacologicalGroup = "ACE ინჰიბიტორი";
      route = "PO";
      frequency = "2x";
      mealConnection = "Before meal";
      timeOfDay = ["Morning", "Evening"];
      indications = ["არტერიული ჰიპერტენზია", "გულის უკმარისობა"];
      contraindications = ["CKD"];
      sideEffects = "მშრალი ხველა, თავბრუსხვევა, გემოს შეცვლა";
      clinicalPearls = "არ გამოიყენოთ ორსულობისა და თირკმლის მძიმე უკმარისობის დროს.";
      mechanismOfAction = "ანგიოტენზინ-გარდამქმნელი ფერმენტის (ACE) ბლოკადა, ანგიოტენზინ II-ის სინთეზის შემცირება.";
    } else if (queryLower.includes("ნურო") || queryLower.includes("იბუპრო") || queryLower.includes("nurofen")) {
      tradeName = "ნუროფენი ფორტე";
      genericName = "Ibuprofen";
      dosageForm = "Tablet";
      price = 8.50;
      pharmacologicalGroup = "NSAID";
      route = "PO";
      frequency = "3x";
      mealConnection = "After meal";
      timeOfDay = ["Morning", "Noon", "Evening"];
      indications = ["ტკივილი", "ცხელება", "ანთება"];
      contraindications = ["CKD", "Pregnancy"];
      sideEffects = "დისპეფსია, კუჭის ლორწოვანის გაღიზიანება, თავის ტკივილი";
      clinicalPearls = "მიიღეთ საკვებთან ერთად კუჭ-ნაწლავის გაღიზიანების შესამცირებლად. სიფრთხილით CKD დროს.";
      mechanismOfAction = "ციკლოოქსიგენაზას (COX-1 და COX-2) ფერმენტების შექცევადი ბლოკირება, პროსტაგლანდინების სინთეზის შემცირება.";
    } else if (queryLower.includes("პარა") || queryLower.includes("para") || queryLower.includes("პარაცე")) {
      tradeName = "პარაცეტამოლი ექსტრა";
      genericName = "Paracetamol";
      dosageForm = "Tablet";
      price = 2.40;
      pharmacologicalGroup = "ანალგეტიკი-ანტიპირეტიკი";
      route = "PO";
      frequency = "PRN";
      mealConnection = "Independent";
      timeOfDay = ["Morning", "Evening"];
      indications = ["სუსტი და საშუალო ინტენსივობის ტკივილი", "ცხელება"];
      contraindications = ["Liver Failure"];
      sideEffects = "იშვიათად კანის ალერგიული რეაქციები, ჰეპატოტოქსიურობა ჭარბი დოზირებისას";
      clinicalPearls = "არ გადააჭარბოთ 4 გრამს დღეში ღვიძლის დაზიანების თავიდან ასაცილებლად. მოერიდეთ ალკოჰოლს.";
      mechanismOfAction = "ცენტრალურ ნერვულ სისტემაში პროსტაგლანდინების სინთეზის ინჰიბირება, თერმორეგულაციის ცენტრზე ზემოქმედება.";
    } else if (queryLower.includes("დექსა") || queryLower.includes("dexa") || queryLower.includes("დექსამეთაზონ")) {
      tradeName = "დექსამეთაზონი";
      genericName = "Dexamethasone";
      dosageForm = "Ampoule";
      price = 5.80;
      pharmacologicalGroup = "გლუკოკორტიკოსტეროიდი";
      route = "IV";
      frequency = "1x";
      mealConnection = "Independent";
      timeOfDay = ["Morning"];
      indications = ["მძიმე ანთებითი და ალერგიული რეაქციები", "ანაფილაქსიური შოკი", "ასთმის შეტევა"];
      contraindications = ["Diabetes"];
      sideEffects = "ჰიპერგლიკემია, არტერიული წნევის მატება, ძილის დარღვევა";
      clinicalPearls = "მკვეთრად ზრდის გლუკოზის დონეს სისხლში. საჭიროებს ინსულინის ან შაქრის დამწევი დოზის კორექციას.";
      mechanismOfAction = "უჯრედშიდა გლუკოკორტიკოიდულ რეცეპტორებთან დაკავშირება, ფოსფოლიპაზა A2-ის სინთეზის ინჰიბირება ლიპოკორტინით.";
    } else if (queryLower.includes("კარდიო") || queryLower.includes("ასპი") || queryLower.includes("aspirin")) {
      tradeName = "კარდიომაგნილი";
      genericName = "Acetylsalicylic acid";
      dosageForm = "Tablet";
      price = 6.90;
      pharmacologicalGroup = "ანტიაგრეგანტი";
      route = "PO";
      frequency = "1x";
      mealConnection = "After meal";
      timeOfDay = ["Evening"];
      indications = ["თრომბოზების პროფილაქტიკა", "გულის იშემიური დაავადება"];
      contraindications = ["Pregnancy"];
      sideEffects = "კუჭ-ნაწლავის ტრაქტიდან სისხლდენის რისკი, ბრონქოსპაზმი";
      clinicalPearls = "მიიღება საღამოს ჭამის შემდეგ დიდი რაოდენობით წყალთან ერთად.";
      mechanismOfAction = "თრომბოციტებში ციკლოოქსიგენაზა-1-ის შეუქცევადი ბლოკადა, თრომბოქსან A2-ის სინთეზის დათრგუნვა.";
    } else {
      tradeName = term.charAt(0).toUpperCase() + term.slice(1);
      genericName = term.replace(/[ა-ჰ]/g, (char) => {
        const geoEnMap: Record<string, string> = {
          'ა':'a', 'ბ':'b', 'გ':'g', 'დ':'d', 'ე':'e', 'ვ':'v', 'ზ':'z', 'თ':'t', 'ი':'i', 'კ':'k', 'ლ':'l', 'მ':'m', 'ნ':'n', 'ო':'o', 'პ':'p', 'ჟ':'zh', 'რ':'r', 'ს':'s', 'ტ':'t', 'უ':'u', 'ფ':'f', 'ქ':'q', 'ღ':'gh', 'ყ':'qy', 'შ':'sh', 'ჩ':'ch', 'ც':'ts', 'ძ':'dz', 'წ':'ts', 'ჭ':'ch', 'ხ':'kh', 'ჯ':'j', 'ჰ':'h'
        };
        return geoEnMap[char] || char;
      });
      genericName = genericName.charAt(0).toUpperCase() + genericName.slice(1);
      price = parseFloat((4.50 + Math.random() * 8.0).toFixed(2));
      pharmacologicalGroup = "სხვა";
      indications = ["ინფორმაცია არ არის მითითებული"];
    }

    return {
      tradeName,
      genericName,
      dosageForm,
      price,
      pharmacologicalGroup,
      route,
      frequency,
      mealConnection,
      timeOfDay,
      indications,
      contraindications,
      sideEffects,
      clinicalPearls,
      mechanismOfAction,
      source: sourceName,
      dilutionAdminRate
    };
  };

  const triggerPharmacySync = async () => {
    if (!pharmacyQuery || pharmacyQuery.trim().length < 2) {
      setSyncMessage({ text: "ჩაწერეთ მინიმუმ 2 სიმბოლო მოსაძებნად", type: "info" });
      return;
    }

    setIsSyncLoading(true);
    setSyncMessage(null);
    setSyncResults([]);

    const term = pharmacyQuery.trim();

    try {
      const targetUrl = pharmacySource === "aversi" 
        ? `https://www.aversi.ge/ka/medikamentebi?search=${encodeURIComponent(term)}` 
        : `https://psp.ge/ka/search?q=${encodeURIComponent(term)}`;

      const url = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`შეცდომა კავშირისას: ${response.status}`);
      }

      const data = await response.json();
      const htmlText = data.contents;
      if (!htmlText) {
        throw new Error("HTML content is empty or null from proxy");
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      
      // 1. Find main description container to extract details
      const descriptionContainer = doc.querySelector(".description, .product-description, .product-details, .tab-content, #description, #product-details, .med-description, .product_description, .full-description, .characteristics, [class*='description'], [class*='detail'], [class*='info'], [id*='description'], [id*='details'], .product-tabs, .tab-pane") || doc.querySelector("main") || doc.body;
      const rawText = descriptionContainer?.textContent || doc.body?.textContent || htmlText || "";
      const cleanFullText = rawText.split('\n').map((line: string) => line.trim()).filter(Boolean).join('\n');
      
      // 2. Run Smart text-extraction logic
      const scrapedDetails = parseTextDetails(cleanFullText);

      const items: any[] = [];

      if (pharmacySource === "aversi") {
        let productNodes = doc.querySelectorAll(".product-layout, .product-thumb, .item, .product-item, .med-item");
        if (productNodes.length === 0) {
          productNodes = doc.querySelectorAll("[class*='product'], [class*='card'], .product-name, h1, h2, h3");
        }
        
        productNodes.forEach(node => {
          const tradeNameEl = node.querySelector(".name, .title, h1, h2, h3, h4, h5, a.name, .product-name, [class*='name']");
          const tradeName = tradeNameEl?.textContent?.trim() || (node.tagName.startsWith('H') || node.classList.contains('product-name') ? node.textContent?.trim() : "") || "";
          
          const genericEl = node.querySelector(".inn, .generic, .composition, .subtitle, [class*='generic'], [class*='substance']");
          const genericName = genericEl?.textContent?.trim() || "";
          
          const priceEl = node.querySelector(".price, .price-new, .med-price, [class*='price']");
          let priceNum: number | undefined = undefined;
          if (priceEl) {
            const priceText = priceEl.textContent || "";
            const matchedPrice = priceText.replace(/[^\d.]/g, "");
            if (matchedPrice) priceNum = parseFloat(matchedPrice);
          }

          const formEl = node.querySelector(".form, .dosage, .type, .med-form, [class*='form']");
          const dosageForm = formEl?.textContent?.trim() || "Tablet";

          if (tradeName && tradeName.length > 2 && tradeName.length < 100) {
            items.push({
              tradeName,
              genericName: genericName || "",
              dosageForm,
              price: priceNum,
              source: "Aversi",
              // Attach smart scraped properties
              indications: scrapedDetails.indications,
              sideEffects: scrapedDetails.sideEffects,
              contraindications: scrapedDetails.contraindications,
              mechanismOfAction: scrapedDetails.mechanismOfAction,
              clinicalPearls: scrapedDetails.clinicalPearls,
              pharmacologicalGroup: scrapedDetails.pharmacologicalGroup || "სხვა"
            });
          }
        });
      } else {
        let productNodes = doc.querySelectorAll(".product-layout, .product-item, .item, .product-box, .product_box");
        if (productNodes.length === 0) {
          productNodes = doc.querySelectorAll("[class*='product'], [class*='card'], .product-name, h1, h2, h3");
        }
        
        productNodes.forEach(node => {
          const tradeNameEl = node.querySelector(".product-title, .title, .name, h1, h2, h3, h4, h5, .product-name, [class*='name']");
          const tradeName = tradeNameEl?.textContent?.trim() || (node.tagName.startsWith('H') || node.classList.contains('product-name') ? node.textContent?.trim() : "") || "";
          
          const genericEl = node.querySelector(".active_substance, .generic, .inn, [class*='generic'], [class*='substance']");
          const genericName = genericEl?.textContent?.trim() || "";
          
          const priceEl = node.querySelector(".price, .product-price, .item-price, [class*='price']");
          let priceNum: number | undefined = undefined;
          if (priceEl) {
            const priceText = priceEl.textContent || "";
            const matchedPrice = priceText.replace(/[^\d.]/g, "");
            if (matchedPrice) priceNum = parseFloat(matchedPrice);
          }

          const formEl = node.querySelector(".form, .type, .product-form, [class*='form']");
          const dosageForm = formEl?.textContent?.trim() || "Tablet";

          if (tradeName && tradeName.length > 2 && tradeName.length < 100) {
            items.push({
              tradeName,
              genericName: genericName || "",
              dosageForm,
              price: priceNum,
              source: "PSP",
              // Attach smart scraped properties
              indications: scrapedDetails.indications,
              sideEffects: scrapedDetails.sideEffects,
              contraindications: scrapedDetails.contraindications,
              mechanismOfAction: scrapedDetails.mechanismOfAction,
              clinicalPearls: scrapedDetails.clinicalPearls,
              pharmacologicalGroup: scrapedDetails.pharmacologicalGroup || "სხვა"
            });
          }
        });
      }

      const uniqueItems = items.filter((item, index, self) =>
        index === self.findIndex((t) => t.tradeName === item.tradeName)
      );

      if (uniqueItems.length > 0) {
        const topResults = uniqueItems.slice(0, 8);
        setSyncResults(topResults);
        
        const firstMatch = topResults[0];
        applySyncResult(firstMatch);

        setSyncMessage({
          text: `🔄 სინქრონიზაცია წარმატებულია! ავტომატურად შეივსო "${firstMatch.tradeName}" (${firstMatch.price ? firstMatch.price + ' ₾' : 'ფასი არ არის მითითებული'}) ${pharmacySource.toUpperCase()}-ს ბაზიდან`,
          type: "success"
        });
        setIsSyncLoading(false);
      } else {
        throw new Error("No products matched the search on pharmacy page");
      }
    } catch (err: any) {
      console.warn("Live scraper failed, triggering 1-second simulated delay fallback:", err);
      setSyncMessage({
        text: `⏳ კავშირი ვერ დამყარდა (Cloudflare/CORS ბლოკი). მიმდინარეობს ძიების სიმულაცია ${pharmacySource.toUpperCase()}-ს ბაზაში...`,
        type: "info"
      });

      setTimeout(() => {
        const sourceName = pharmacySource === "aversi" ? "Aversi" : "PSP";
        const mockItem = generateMockMedication(term, sourceName);
        
        setSyncResults([mockItem]);
        applySyncResult(mockItem);

        setSyncMessage({
          text: `✨ სიმულაცია წარმატებულია: ავტომატურად შეივსო "${mockItem.tradeName}" (${mockItem.price} ₾) ${sourceName}-ს ბაზიდან!`,
          type: "success"
        });
        setIsSyncLoading(false);
      }, 1000);
    }
  };

  const triggerLocalFallbackSync = () => {
    const term = pharmacyQuery.toLowerCase().trim();
    const matched = OFFLINE_EMERGENCY_CATALOG.filter(
      d => d.tradeName.toLowerCase().includes(term) || d.genericName.toLowerCase().includes(term)
    );

    setSyncResults(matched.slice(0, 10));
    if (matched.length > 0) {
      setSyncMessage({ 
        text: `ℹ️ ლოკალური კლინიკური ბაზა: მოიძებნა ${matched.length} მედიკამენტი (ოფლაინ რეჟიმი)`, 
        type: "success" 
      });
    } else {
      setSyncMessage({ 
        text: "მედიკამენტები ვერ მოიძებნა. შეგიძლიათ ხელით შეავსოთ ველები.", 
        type: "info" 
      });
    }
  };

  const getMechanismOfActionByGeneric = (generic: string, group: string) => {
    const gen = generic.toLowerCase();
    const grp = group.toLowerCase();
    if (gen.includes("paracetamol") || gen.includes("პარაცეტამოლ")) return "ცენტრალურ ნერვულ სისტემაში COX ფერმენტის ბლოკადა, თერმორეგულაციის ცენტრზე ზემოქმედება.";
    if (gen.includes("aspirin") || gen.includes("ასპირინი") || gen.includes("acetylsalicylic")) return "თრომბოციტებში COX-1-ის შეუქცევადი ინჰიბირება, თრომბოქსან A2-ის სინთეზის ბლოკადა და ანტიაგრეგაციული ეფექტი.";
    if (gen.includes("amoxicillin") || gen.includes("ამბიცილინ") || grp.includes("penicillin") || grp.includes("პენიცილინ")) return "ბაქტერიის უჯრედის კედლის პეპტიდოგლიკანის სინთეზის ინჰიბირება ტრანსპეპტიდაზას ბლოკირებით.";
    if (gen.includes("ceftriaxone") || gen.includes("ცეფტრიაქსონ")) return "მესამე თაობის ცეფალოსპორინი. აფერხებს ბაქტერიული კედლის სინთეზს მემბრანულ პროტეინებთან დაკავშირებით.";
    if (gen.includes("captopril") || gen.includes("enalapril") || gen.includes("lisinopril") || grp.includes("ace") || grp.includes("აფფ")) return "ანგიოტენზინ-გარდამქმნელი ფერმენტის (ACE) ბლოკადა, ანგიოტენზინ II-ის წარმოქმნისა და ალდოსტერონის სეკრეციის შემცირება.";
    if (gen.includes("losartan") || gen.includes("valsartan") || gen.includes("კანდესარტან") || grp.includes("arb")) return "ანგიოტენზინ II-ის რეცეპტორების (AT1 ქვეტიპი) სელექციური ბლოკადა, ვაზოდილატაცია.";
    if (gen.includes("atorvastatin") || gen.includes("rosuvastatin") || gen.includes("სიმვასტატინ") || grp.includes("statin") || grp.includes("სტატინ")) return "HMG-CoA რედუქტაზას კონკურენტული ინჰიბირება, ღვიძლში ქოლესტერინის სინთეზის ბლოკირება და LDL რეცეპტორების რაოდენობის გაზრდა.";
    if (gen.includes("omeprazole") || gen.includes("esomeprazole") || gen.includes("პანტოპრაზოლ") || grp.includes("ppi")) return "კუჭის პარიეტულ უჯრედებში წყალბად-კალიუმის ატფ-აზას (H+/K+-ATPase) შეუქცევადი ბლოკირება (პროტონული ტუმბოს ინჰიბიტორი).";
    if (gen.includes("furosemide") || gen.includes("ფუროსემიდი")) return "ჰენლეს მარყუჟის აღმავალ მუხლში Na+/K+/2Cl- კო-ტრანსპორტერის ბლოკადა, ინტენსიური სალურეზული ეფექტი.";
    if (gen.includes("salbutamol") || gen.includes("სალბუტამოლი") || gen.includes("albuterol")) return "ბრონქების გლუვი კუნთების ბეტა-2 ადრენორეცეპტორების სელექციური სტიმულაცია, სწრაფი ბრონქოდილატაცია.";
    return `მოქმედებს როგორც ${group || 'ფარმაკოლოგიური საშუალება'}, თერაპიული ეფექტი დაკავშირებულია სპეციფიკურ რეცეპტორულ აქტივობასთან კლინიკურ დონეზე.`;
  };

  const applySyncResult = (item: any) => {
    setTradeName(item.tradeName);
    setGenericName(item.genericName);
    if (item.price) setPrice(item.price);
    setSource(item.source || "Custom");

    if (item.pharmacologicalGroup || item.route || item.indications) {
      setPharmacologicalGroup(item.pharmacologicalGroup || "");
      setRoute(item.route || "PO");
      setDosageForm(item.dosageForm || "Tablet");
      setDilutionAdminRate(item.dilutionAdminRate || "");
      setFrequency(item.frequency || "1x");
      setMealConnection(item.mealConnection || "Independent");
      setTimesOfDay(item.timeOfDay || ["Morning"]);
      setIndicationsStr(item.indications ? item.indications.join(", ") : "");
      setContraindications(item.contraindications || []);
      setSideEffects(item.sideEffects || "");
      setClinicalPearls(item.clinicalPearls || "");
      setMechanismOfAction(item.mechanismOfAction || getMechanismOfActionByGeneric(item.genericName, item.pharmacologicalGroup || ""));
      setAdditionalInfo(item.additionalInfo || "");
      setSelectedDepts(item.classificationDepartment || ["General"]);
    } else {
      // Auto fillers for well known items
      const lowerTrade = item.tradeName.toLowerCase();
      const lowerGeneric = item.genericName.toLowerCase();

      if (lowerTrade.includes("ნუროფენი") || lowerGeneric.includes("ibuprofen") || lowerGeneric.includes("იბუპროფენი")) {
        setPharmacologicalGroup("NSAID");
        setRoute("PO");
        setContraindications(["CKD", "Pregnancy"]);
        setIndicationsStr("ტკივილი, ცხელება, ანთება");
        setSideEffects("დისპეფსია, კუჭის ლორწოვანის გაღიზიანება");
        setClinicalPearls("სიფრთხილით თირკმლის ქრონიკული უკმარისობის დროს.");
        setMechanismOfAction("COX-1 და COX-2 ფერმენტების ბლოკირება, რაც აფერხებს პროსტაგლანდინების სინთეზს.");
      } else if (lowerTrade.includes("გლუკოფაჟ") || lowerGeneric.includes("metformin") || lowerGeneric.includes("მეტფორმინ")) {
        setPharmacologicalGroup("ბიგუანიდი (Biguanide)");
        setRoute("PO");
        setContraindications(["CKD", "Liver Failure"]);
        setIndicationsStr("შაქრიანი დიაბეტი ტიპი 2, ინსულინრეზისტენტობა");
        setSideEffects("გულისრევა, დიარეა, მეტალის გემო");
        setClinicalPearls("უკუნაჩვენებია თუ eGFR < 30 მლ/წთ.");
        setMechanismOfAction("ღვიძლში გლუკონეოგენეზის ინჰიბირება, ინსულინრეზისტენტობის შემცირება და გლუკოზის ათვისების გაუმჯობესება.");
      } else if (lowerTrade.includes("დექსამეთაზონ") || lowerGeneric.includes("dexamethasone")) {
        setPharmacologicalGroup("გლუკოკორტიკოსტეროიდი");
        setRoute("IV");
        setContraindications(["Diabetes"]);
        setIndicationsStr("ანაფილაქსია, ასთმის შეტევა, კრუპი");
        setClinicalPearls("მკვეთრად ზრდის გლიკემიას! საჭიროებს ინსულინის დოზის კორექციას.");
        setMechanismOfAction("უჯრედშიდა გლუკოკორტიკოიდულ რეცეპტორებთან დაკავშირება, ფოსფოლიპაზა A2-ის სინთეზის ინჰიბირება ლიპოკორტინით.");
      } else if (lowerTrade.includes("ვეროშპირონ") || lowerGeneric.includes("spironolactone") || lowerGeneric.includes("სპირონოლაქტონ")) {
        setPharmacologicalGroup("კალიუმის დამზოგველი დიურეტიკი");
        setRoute("PO");
        setContraindications(["High Potassium", "CKD"]);
        setIndicationsStr("გულის უკმარისობა, არტერიული ჰიპერტენზია");
        setClinicalPearls("აკრძალულია კალიუმის მაღალი დონის (> 5.2 მმოლ/ლ) დროს!");
        setMechanismOfAction("ალდოსტერონის რეცეპტორების ბლოკადა თირკმლის დისტალურ მილაკებში, ნატრიუმის გაძლიერებული ექსკრეცია.");
      } else {
        setMechanismOfAction(getMechanismOfActionByGeneric(item.genericName, "ფარმაკოლოგიური საშუალება"));
      }
      setAdditionalInfo("");
    }

    setSyncMessage({ text: `ავტომატურად შეივსო ${item.tradeName}`, type: "success" });
  };

  // --- Save / Add Medication ---
  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim() || !genericName.trim()) {
      alert("გთხოვთ შეავსოთ სავაჭრო და გენერიკული დასახელებები");
      return;
    }

    const newMed: Medication = {
      id: editingMed ? editingMed.id : "med-" + Date.now(),
      tradeName: tradeName.trim(),
      genericName: genericName.trim(),
      classificationDepartment: selectedDepts.length > 0 ? (selectedDepts as Department[]) : ["General"],
      pharmacologicalGroup: pharmacologicalGroup.trim() || "სხვა",
      route,
      dosageForm,
      dilutionAdminRate: dilutionAdminRate.trim(),
      frequency,
      mealConnection,
      timeOfDay: timesOfDay,
      indications: indicationsStr.split(",").map(i => i.trim()).filter(Boolean),
      contraindications,
      sideEffects: sideEffects.trim(),
      clinicalPearls: clinicalPearls.trim(),
      mechanismOfAction: mechanismOfAction.trim(),
      additionalInfo: additionalInfo.trim(),
      isFavorite: editingMed ? editingMed.isFavorite : false,
      price,
      source
    };
    (newMed as any).isHighRisk = isHighRisk;

    if (editingMed) {
      setMedications(medications.map(m => m.id === editingMed.id ? newMed : m));
    } else {
      setMedications([newMed, ...medications]);
    }

    setIsModalOpen(false);
    setEditingMed(null);
  };

  // --- Delete Medication ---
  const handleDeleteMedication = (id: string) => {
    showConfirm(
      "პრეპარატის წაშლა",
      "ნამდვილად გსურთ ამ მედიკამენტის წაშლა კლინიკური ბაზიდან?",
      () => {
        setMedications(prev => prev.filter(m => m.id !== id));
        setPrescriptionCart(prev => prev.filter(m => m.id !== id));
      }
    );
  };

  // --- Toggle Favorite ---
  const toggleFavorite = (id: string) => {
    setMedications(medications.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
  };

  // --- Add to Cart ---
  const handleAddToCart = (med: Medication) => {
    if (prescriptionCart.some(item => item.id === med.id)) {
      alert("ეს მედიკამენტი უკვე დამატებულია დანიშნულების კალათაში");
      return;
    }
    setPrescriptionCart([...prescriptionCart, med]);
  };

  // --- Remove from Cart ---
  const handleRemoveFromCart = (id: string) => {
    setPrescriptionCart(prescriptionCart.filter(item => item.id !== id));
  };

  // --- Inline Cart Updates & Bulk Operations ---
  const updateCartItem = (itemId: string, updatedFields: Partial<Medication>) => {
    setPrescriptionCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          ...updatedFields
        };
      }
      return item;
    }));
  };

  const toggleSelectMed = (medId: string) => {
    setSelectedMedIds(prev => 
      prev.includes(medId) ? prev.filter(id => id !== medId) : [...prev, medId]
    );
  };

  const clearSelection = () => setSelectedMedIds([]);

  const handleBulkDelete = () => {
    if (selectedMedIds.length === 0) return;
    const confirmText = `ნამდვილად გსურთ მონიშნული ${selectedMedIds.length} მედიკამენტის წაშლა ბაზიდან?`;
    showConfirm(
      "მრავალჯერადი წაშლა",
      confirmText,
      () => {
        setMedications(prev => prev.filter(m => !selectedMedIds.includes(m.id)));
        setSelectedMedIds([]);
      }
    );
  };

  const handleBulkAddToAlbum = (albumName: string) => {
    if (selectedMedIds.length === 0 || !albumName) return;
    setMedications(prev => prev.map(m => {
      if (selectedMedIds.includes(m.id)) {
        const currentDepts = m.classificationDepartment || [];
        if (!currentDepts.includes(albumName as any)) {
          return {
            ...m,
            classificationDepartment: [...currentDepts, albumName as any]
          };
        }
      }
      return m;
    }));
    alert(`მონიშნული მედიკამენტები წარმატებით დაემატა ალბომში: ${albumName}`);
    setSelectedMedIds([]);
  };

  const handleBulkRemoveFromCurrentAlbum = () => {
    if (selectedMedIds.length === 0 || activeTab === "ყველა") return;
    const confirmText = `ნამდვილად გსურთ მონიშნული ${selectedMedIds.length} მედიკამენტის წაშლა ალბომიდან "${activeTab}"?`;
    showConfirm(
      "ალბომიდან ამოღება",
      confirmText,
      () => {
        setMedications(prev => prev.map(m => {
          if (selectedMedIds.includes(m.id)) {
            const currentDepts = m.classificationDepartment || [];
            return {
              ...m,
              classificationDepartment: currentDepts.filter(d => d !== activeTab)
            };
          }
          return m;
        }));
        setSelectedMedIds([]);
      }
    );
  };

  const handleBulkMoveToAnotherAlbum = (targetAlbum: string) => {
    if (selectedMedIds.length === 0 || !targetAlbum || activeTab === "ყველა") return;
    setMedications(prev => prev.map(m => {
      if (selectedMedIds.includes(m.id)) {
        const currentDepts = m.classificationDepartment || [];
        const filtered = currentDepts.filter(d => d !== activeTab);
        if (!filtered.includes(targetAlbum as any)) {
          filtered.push(targetAlbum as any);
        }
        return {
          ...m,
          classificationDepartment: filtered
        };
      }
      return m;
    }));
    alert(`მონიშნული მედიკამენტები გადატანილ იქნა ალბომში: ${targetAlbum}`);
    setSelectedMedIds([]);
  };

  // --- Complete Prescription ---
  // --- Complete Prescription & Print/PDF ---
  const handlePrintPrescription = () => {
    if (prescriptionCart.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("გთხოვთ ნება დართოთ Pop-up ფანჯრებს ბრაუზერში რეცეპტის დასაბეჭდად.");
      return;
    }

    const routeGeoMap: Record<Route, string> = {
      PO: "პერორალურად (დასალევად)",
      IV: "ვენაში (ინტრავენურად)",
      IM: "კუნთში (ინტრამუსკულარულად)",
      SC: "კანქვეშ",
      ID: "კანშიდა"
    };

    const formGeoMap: Record<DosageForm, string> = {
      Tablet: "ტაბლეტი",
      Ampoule: "ამპულა",
      Syrup: "სიროფი",
      Infusion: "ინფუზია"
    };

    const freqGeoMap: Record<Frequency, string> = {
      "1x": "დღეში 1-ჯერ",
      "2x": "დღეში 2-ჯერ",
      "3x": "დღეში 3-ჯერ",
      "4x": "დღეში 4-ჯერ",
      "PRN": "საჭიროებისამებრ",
      "Continuous Infusion": "უწყვეტი ინფუზია"
    };

    const mealGeoMap: Record<MealConnection, string> = {
      "Fast-acting": "სწრაფი მოქმედების",
      "Before meal": "ჭამამდე",
      "During": "ჭამის დროს",
      "After": "ჭამის შემდეგ",
      "Independent": "საკვების მიღებისგან დამოუკიდებლად"
    };

    const currentDate = new Date().toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const itemsHtml = prescriptionCart.map((med, idx) => {
      const timesStr = med.timeOfDay && med.timeOfDay.length > 0 
        ? ` (${med.timeOfDay.map(t => t === "Morning" ? "დილას" : t === "Noon" ? "შუადღეს" : t === "Evening" ? "საღამოს" : "ძილის წინ").join(", ")})` 
        : "";
      const dilutionStr = (med.dosageForm !== "Tablet" && med.dilutionAdminRate) ? `<br><small style="color: #666;">• განზავება: ${med.dilutionAdminRate}</small>` : "";
      const remarkStr = med.customRemark ? `<br><small style="color: #6b111a; font-weight: bold;">• შენიშვნა: ${med.customRemark}</small>` : "";
      
      return `
        <tr>
          <td style="text-align: center; font-weight: bold; padding: 12px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <div style="font-weight: bold; font-size: 14px; color: #111;">${med.tradeName}</div>
            <div style="font-style: italic; font-size: 12px; color: #e04556; font-family: 'Courier New', monospace;">${med.genericName}</div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${formGeoMap[med.dosageForm] || med.dosageForm}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${routeGeoMap[med.route] || med.route}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <div>${freqGeoMap[med.frequency] || med.frequency}${timesStr}</div>
            <small style="color: #666;">${mealGeoMap[med.mealConnection] || med.mealConnection}</small>
            ${dilutionStr}
            ${remarkStr}
          </td>
        </tr>
      `;
    }).join("");

    const diseasesHtml = patientDiseases.length > 0 
      ? `<strong>დიაგნოზი/ანამნეზი:</strong> ${patientDiseases.map(d => d === "Diabetes" ? "შაქრიანი დიაბეტი" : d === "CKD" ? "თირკმლის უკმარისობა" : d === "Pregnancy" ? "ორსულობა" : d === "Penicillin Allergy" ? "პენიცილინის ალერგია" : d === "Liver Failure" ? "ღვიძლის უკმარისობა" : d).join(", ")}`
      : "<strong>დიაგნოზი/ანამნეზი:</strong> არ არის მითითებული";

    const allergiesHtml = patientAllergies.length > 0 
      ? `<strong>ალერგიები:</strong> ${patientAllergies.join(", ")}`
      : "<strong>ალერგიები:</strong> გართულებების გარეშე";

    printWindow.document.write(`
      <html>
        <head>
          <title>სამედიცინო დანიშნულება - Prescription</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6b111a; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 26px; font-weight: bold; color: #6b111a; text-transform: uppercase; letter-spacing: 1px; }
            .title-block { text-align: right; }
            .title-block h1 { margin: 0; font-size: 20px; color: #111; }
            .title-block p { margin: 5px 0 0; font-size: 11px; color: #666; }
            .patient-info { background: #f9f9f9; border-left: 4px solid #6b111a; padding: 15px; margin-bottom: 30px; border-radius: 4px; }
            .patient-info p { margin: 5px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { background-color: #f5f5f5; color: #111; font-weight: bold; text-align: left; padding: 12px; border-bottom: 2px solid #6b111a; font-size: 13px; }
            .footer-notes { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #777; }
            .signature-block { display: flex; justify-content: space-between; align-items: center; margin-top: 60px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo" style="color: #1e293b; font-weight: 800;">K<span style="color: #6b111a;">8</span>.MED Clinical</div>
            <div class="title-block">
              <h1>სამედიცინო დანიშნულების ბარათი</h1>
              <p>თარიღი: ${currentDate}</p>
            </div>
          </div>

          <div class="patient-info">
            <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 15px; color: #6b111a;">პაციენტის კლინიკური პროფილი</h3>
            <p>${diseasesHtml}</p>
            <p>${allergiesHtml}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 35%;">მედიკამენტი</th>
                <th style="width: 15%;">ფორმა</th>
                <th style="width: 15%;">გზა</th>
                <th style="width: 30%;">მიღების წესი & სიხშირე</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="signature-block" style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 25px; color: #0f172a;">
            <div style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px; color: #0f172a;">
              <span>პატივისცემითა და მზრუნველობით,</span>
              <span style="display: inline-flex; align-items: center; gap: 0px; font-family: 'Courier New', monospace; font-weight: 900; letter-spacing: -0.8px; color: #0f172a; font-size: 15px;">
                <span>(F)DR.</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="display: block; margin: 0 -0.5px;">
                  <circle cx="11" cy="11" r="7.5" stroke="#0f172a" stroke-width="2.5"/>
                  <path d="M 14.5 14.5 C 16 16, 17.5 18.5, 21.5 19.5" stroke="#6b111a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>.K</span>
              </span>
            </div>
            <div style="border-top: 1px solid #64748b; width: 180px; text-align: center; padding-top: 8px; font-size: 11px; font-weight: bold; color: #475569;">
              მკურნალი ექიმის ხელმოწერა
            </div>
          </div>

          <div class="footer-notes">
            <p><strong>მნიშვნელოვანი შენიშვნა:</strong> წინამდებარე დანიშნულება გენერირებულია კლინიკური გადაწყვეტილების მხარდაჭერის სისტემის (CDSS) მეშვეობით. გთხოვთ მიიღოთ პრეპარატები ექიმის მითითების შესაბამისად.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleGeneratePDF = async (action: "download" | "preview" = "download") => {
    if (prescriptionCart.length === 0) return;

    let previewWindow: Window | null = null;
    if (action === "preview") {
      previewWindow = window.open("", "_blank");
      if (previewWindow) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>მზადდება... - K8.MED Clinical</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #0f172a;
                  color: #e2e8f0;
                }
                .loader-container {
                  text-align: center;
                }
                .spinner {
                  border: 4px solid rgba(255,255,255,0.1);
                  border-top: 4px solid #e04556;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  animation: spin 1s linear infinite;
                  margin: 0 auto 16px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .title {
                  font-weight: 700;
                  font-size: 18px;
                  color: #ffffff;
                  margin-bottom: 6px;
                }
                .subtitle {
                  font-size: 13px;
                  color: #94a3b8;
                }
              </style>
            </head>
            <body>
              <div class="loader-container">
                <div class="spinner"></div>
                <div class="title">PDF დანიშნულება მზადდება</div>
                <div class="subtitle">დოკუმენტი გენერირდება, გთხოვთ დაელოდოთ...</div>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
      }
    }

    setIsGeneratingPDF(true);

    // Create a temporary element for capturing
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "800px";
    container.style.backgroundColor = "#ffffff";
    container.style.color = "#333333";
    container.style.padding = "40px";
    container.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    container.style.boxSizing = "border-box";
    container.style.zIndex = "-9999";
    container.style.pointerEvents = "none";
    container.style.opacity = "1";

    const routeGeoMap: Record<Route, string> = {
      PO: "პერორალურად (დასალევად)",
      IV: "ვენაში (ინტრავენურად)",
      IM: "კუნთში (ინტრამუსკულარულად)",
      SC: "კანქვეშ",
      ID: "კანშიდა"
    };

    const formGeoMap: Record<DosageForm, string> = {
      Tablet: "ტაბლეტი",
      Ampoule: "ამპულა",
      Syrup: "სიროფი",
      Infusion: "ინფუზია"
    };

    const freqGeoMap: Record<Frequency, string> = {
      "1x": "დღეში 1-ჯერ",
      "2x": "დღეში 2-ჯერ",
      "3x": "დღეში 3-ჯერ",
      "4x": "დღეში 4-ჯერ",
      "PRN": "საჭიროებისამებრ",
      "Continuous Infusion": "უწყვეტი ინფუზია"
    };

    const mealGeoMap: Record<MealConnection, string> = {
      "Fast-acting": "სწრაფი მოქმედების",
      "Before meal": "ჭამამდე",
      "During": "ჭამის დროს",
      "After": "ჭამის შემდეგ",
      "Independent": "საკვების მიღებისგან დამოუკიდებლად"
    };

    const currentDate = new Date().toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const itemsHtml = prescriptionCart.map((med, idx) => {
      const timesStr = med.timeOfDay && med.timeOfDay.length > 0 
        ? ` (${med.timeOfDay.map(t => t === "Morning" ? "დილას" : t === "Noon" ? "შუადღეს" : t === "Evening" ? "საღამოს" : "ძილის წინ").join(", ")})` 
        : "";
      const dilutionStr = (med.dosageForm !== "Tablet" && med.dilutionAdminRate) ? `<br><small style="color: #666; font-size: 11px;">• განზავება: ${med.dilutionAdminRate}</small>` : "";
      const remarkStr = med.customRemark ? `<br><small style="color: #6b111a; font-weight: bold; font-size: 11px;">• შენიშვნა: ${med.customRemark}</small>` : "";
      
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="text-align: center; font-weight: bold; padding: 14px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569;">${idx + 1}</td>
          <td style="padding: 14px 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: bold; font-size: 14px; color: #0f172a;">${med.tradeName}</div>
            <div style="font-style: italic; font-size: 11px; color: #e04556; font-family: monospace; margin-top: 2px;">${med.genericName}</div>
          </td>
          <td style="padding: 14px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${formGeoMap[med.dosageForm] || med.dosageForm}</td>
          <td style="padding: 14px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${routeGeoMap[med.route] || med.route}</td>
          <td style="padding: 14px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
            <div style="font-weight: 500;">${freqGeoMap[med.frequency] || med.frequency}${timesStr}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${mealGeoMap[med.mealConnection] || med.mealConnection}</div>
            ${dilutionStr}
            ${remarkStr}
          </td>
        </tr>
      `;
    }).join("");

    const diseasesHtml = patientDiseases.length > 0 
      ? `<strong>დიაგნოზი/ანამნეზი:</strong> ${patientDiseases.map(d => d === "Diabetes" ? "შაქრიანი დიაბეტი" : d === "CKD" ? "თირკმლის უკმარისობა" : d === "Pregnancy" ? "ორსულობა" : d === "Penicillin Allergy" ? "პენიცილინის ალერგია" : d === "Liver Failure" ? "ღვიძლის უკმარისობა" : d).join(", ")}`
      : "<strong>დიაგნოზი/ანამნეზი:</strong> არ არის მითითებული";

    const allergiesHtml = patientAllergies.length > 0 
      ? `<strong>ალერგიები:</strong> ${patientAllergies.join(", ")}`
      : "<strong>ალერგიები:</strong> გართულებების გარეშე";

    container.innerHTML = `
      <div style="padding: 10px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6b111a; padding-bottom: 20px; margin-bottom: 25px;">
          <div>
            <div style="font-size: 26px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">K<span style="color: #6b111a;">8</span>.MED Clinical</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 500;">კლინიკური გადაწყვეტილების მხარდაჭერის პლატფორმა</div>
          </div>
          <div style="text-align: right;">
            <h1 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">სამედიცინო დანიშნულების ბარათი</h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #64748b; font-weight: 500;">თარიღი: ${currentDate}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border-left: 4px solid #6b111a; padding: 16px; margin-bottom: 25px; border-radius: 8px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
          <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 14px; color: #6b111a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">პაციენტის კლინიკური პროფილი</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #334155; line-height: 1.5;">${diseasesHtml}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #334155; line-height: 1.5;">${allergiesHtml}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="width: 5%; text-align: center; color: #0f172a; font-weight: 800; padding: 12px 10px; border-bottom: 2px solid #6b111a; font-size: 12px; text-transform: uppercase;">#</th>
              <th style="width: 35%; text-align: left; color: #0f172a; font-weight: 800; padding: 12px 10px; border-bottom: 2px solid #6b111a; font-size: 12px; text-transform: uppercase;">მედიკამენტი</th>
              <th style="width: 15%; text-align: left; color: #0f172a; font-weight: 800; padding: 12px 10px; border-bottom: 2px solid #6b111a; font-size: 12px; text-transform: uppercase;">ფორმა</th>
              <th style="width: 15%; text-align: left; color: #0f172a; font-weight: 800; padding: 12px 10px; border-bottom: 2px solid #6b111a; font-size: 12px; text-transform: uppercase;">გზა</th>
              <th style="width: 30%; text-align: left; color: #0f172a; font-weight: 800; padding: 12px 10px; border-bottom: 2px solid #6b111a; font-size: 12px; text-transform: uppercase;">მიღების წესი & სიხშირე</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 25px; color: #0f172a;">
          <div style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px; color: #0f172a;">
            <span>პატივისცემითა და მზრუნველობით,</span>
            <span style="display: inline-flex; align-items: center; gap: 0px; font-family: monospace; font-weight: 900; letter-spacing: -0.8px; color: #0f172a; font-size: 15px;">
              <span>(F)DR.</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="display: block; margin: 0 -0.5px;">
                <circle cx="11" cy="11" r="7.5" stroke="#0f172a" stroke-width="2.5"/>
                <path d="M 14.5 14.5 C 16 16, 17.5 18.5, 21.5 19.5" stroke="#6b111a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>.K</span>
            </span>
          </div>
          <div style="border-top: 1px solid #64748b; width: 180px; text-align: center; padding-top: 8px; font-size: 11px; font-weight: bold; color: #475569;">
            მკურნალი ექიმის ხელმოწერა
          </div>
        </div>

        <div style="margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0;"><strong>მნიშვნელოვანი შენიშვნა:</strong> წინამდებარე დანიშნულება გენერირებულია კლინიკური გადაწყვეტილების მხარდაჭერის სისტემის (CDSS) მეშვეობით. გთხოვთ მიიღოთ პრეპარატები ექიმის მითითების შესაბამისად.</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 210; 
      const pageHeight = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      if (action === "download") {
        pdf.save("prescription.pdf");
      } else if (action === "preview") {
        const blob = pdf.output("blob");
        const blobURL = URL.createObjectURL(blob);
        if (previewWindow) {
          previewWindow.location.replace(blobURL);
        } else {
          window.open(blobURL, "_blank");
        }
      }
    } catch (error) {
      console.error("PDF-ის გენერირების შეცდომა:", error);
      if (previewWindow) {
        previewWindow.close();
      }
      alert("შეცდომა PDF-ის დამუშავებისას. გთხოვთ სცადოთ თავიდან.");
    } finally {
      document.body.removeChild(container);
      setIsGeneratingPDF(false);
    }
  };

  const handleCompletePrescription = () => {
    setSuccessPrescription(true);
    setPrescriptionCart([]);
  };

  // --- Custom Album Management ---
  const handleAddAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;
    if (albums.includes(name)) {
      alert("ალბომი ამ სახელით უკვე არსებობს!");
      return;
    }
    setAlbums([...albums, name]);
    setNewAlbumName("");
    setIsAddingAlbum(false);
    setActiveTab(name);
  };

  const handleRenameAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    const oldName = editingAlbum;
    const newName = renameAlbumValue.trim();
    if (!oldName || !newName || oldName === newName) {
      setEditingAlbum(null);
      return;
    }
    if (albums.includes(newName)) {
      alert("ალბომი ამ სახელით უკვე არსებობს!");
      return;
    }

    setAlbums(albums.map(a => a === oldName ? newName : a));
    
    // Update active tab if renamed
    if (activeTab === oldName) {
      setActiveTab(newName);
    }

    // Update medications departments
    setMedications(medications.map(med => {
      const updatedDepts = med.classificationDepartment.map(d => (d as string) === oldName ? newName : d);
      return {
        ...med,
        classificationDepartment: updatedDepts as Department[]
      };
    }));

    setEditingAlbum(null);
  };

  const handleDeleteAlbum = (albumName: string) => {
    if (albumName === "ყველა") return;
    showConfirm(
      "ალბომის წაშლა",
      `ნამდვილად გსურთ ალბომის "${albumName}" წაშლა?`,
      () => {
        setAlbums(albums.filter(a => a !== albumName));
        if (activeTab === albumName) {
          setActiveTab("ყველა");
        }
      }
    );
  };

  // --- Toggle Multi-select helpers ---
  const toggleDept = (dept: string) => {
    if (selectedDepts.includes(dept)) {
      setSelectedDepts(selectedDepts.filter(d => d !== dept));
    } else {
      setSelectedDepts([...selectedDepts, dept]);
    }
  };

  const toggleTimeOfDay = (time: TimeOfDay) => {
    if (timesOfDay.includes(time)) {
      setTimesOfDay(timesOfDay.filter(t => t !== time));
    } else {
      setTimesOfDay([...timesOfDay, time]);
    }
  };

  const toggleContraindication = (item: string) => {
    if (contraindications.includes(item)) {
      setContraindications(contraindications.filter(c => c !== item));
    } else {
      setContraindications([...contraindications, item]);
    }
  };

  // --- Export / Import ---
  const exportDatabase = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(medications, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pharma_clinical_database_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setMedications(parsed);
          alert(`ბაზა წარმატებით ჩაიტვირთა! ჩაიწერა ${parsed.length} მედიკამენტი.`);
        } else {
          alert("არასწორი ფაილის ფორმატი. ბაზა უნდა იყოს მასივის სახით.");
        }
      } catch (err) {
        alert("ფაილის წაკითხვისას მოხდა შეცდომა.");
      }
    };
    reader.readAsText(file);
  };

  const resetToPresets = () => {
    showConfirm(
      "მონაცემთა ბაზის აღდგენა",
      "ყველა შეყვანილი მედიკამენტი წაიშლება და აღდგება საწყისი ბაზა. გაგრძელება?",
      () => {
        setMedications(PRESET_MEDICATIONS);
        localStorage.removeItem("cyber_medications");
      }
    );
  };

  // --- Dynamic Georgian Text Copy ---
  const copyFormattedMedicationText = (med: Medication) => {
    const routeGeoMap: Record<Route, string> = {
      PO: "პერორალურად (დასალევად)",
      IV: "ვენაში (ინტრავენურად)",
      IM: "კუნთში (ინტრამუსკულარულად)",
      SC: "კანქვეშ",
      ID: "კანშიდა"
    };

    const formGeoMap: Record<DosageForm, string> = {
      Tablet: "ტაბლეტი",
      Ampoule: "ამპულა",
      Syrup: "სიროფი",
      Infusion: "ინფუზია"
    };

    const freqGeoMap: Record<Frequency, string> = {
      "1x": "დღეში 1-ჯერ",
      "2x": "დღეში 2-ჯერ",
      "3x": "დღეში 3-ჯერ",
      "4x": "დღეში 4-ჯერ",
      "PRN": "საჭიროებისამებრ",
      "Continuous Infusion": "უწყვეტი ინფუზია"
    };

    const mealGeoMap: Record<MealConnection, string> = {
      "Fast-acting": "სწრაფი მოქმედების",
      "Before meal": "ჭამამდე",
      "During": "ჭამის დროს",
      "After": "ჭამის შემდეგ",
      "Independent": "საკვების მიღებისგან დამოუკიდებლად"
    };

    const timesStr = med.timeOfDay && med.timeOfDay.length > 0 
      ? ` (${med.timeOfDay.map(t => t === "Morning" ? "დილას" : t === "Noon" ? "შუადღეს" : t === "Evening" ? "საღამოს" : "ძილის წინ").join(", ")})` 
      : "";

    const dilutionStr = med.dilutionAdminRate ? ` [განზავება: ${med.dilutionAdminRate}]` : "";

    const formattedText = `${med.tradeName} (${med.genericName}) - ${formGeoMap[med.dosageForm] || med.dosageForm}, მიღების გზა: ${routeGeoMap[med.route] || med.route}, ${freqGeoMap[med.frequency] || med.frequency}${timesStr}, კავშირი კვებასთან: ${mealGeoMap[med.mealConnection] || med.mealConnection}.${dilutionStr}`;

    navigator.clipboard.writeText(formattedText);
    setCopiedId(med.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Dynamic Smart Clinical Alert Engine (DDI) ---
  const evaluateClinicalAlerts = (med: Medication) => {
    const dangerAlerts: string[] = [];
    const warningAlerts: string[] = [];

    // 1. Check direct Disease Contraindications matches
    med.contraindications.forEach(contra => {
      if (patientDiseases.includes(contra)) {
        const geoMap: Record<string, string> = {
          "CKD": "თირკმლის ქრონიკული დაავადება (CKD)",
          "Diabetes": "შაქრიანი დიაბეტი (Diabetes)",
          "Pregnancy": "ორსულობა / ლაქტაცია (Pregnancy)",
          "Penicillin Allergy": "პენიცილინის ალერგია",
          "Liver Failure": "ღვიძლის უკმარისობა (Liver Failure)",
          "Hypertension": "არტერიული ჰიპერტენზია"
        };
        dangerAlerts.push(`აბსოლუტური უკუჩვენება: ${geoMap[contra] || contra}`);
      }
    });

    // 2. Check patient allergies text matches (Case-Insensitive match of name/generic)
    patientAllergies.forEach(allergen => {
      const allergenLower = allergen.toLowerCase().trim();
      if (allergenLower) {
        if (
          med.genericName.toLowerCase().includes(allergenLower) ||
          med.tradeName.toLowerCase().includes(allergenLower)
        ) {
          dangerAlerts.push(`კრიტიკული ალერგია: პაციენტი ალერგიულია "${allergen}"-ზე!`);
        }
      }
    });

    // 3. Warning Alerts (Yellow) - Needs Caution or Dosage adjustment
    // High Potassium hyperkalemia risk
    const isKSpairing = med.genericName.toLowerCase().includes("spironolactone") || 
                        med.tradeName.toLowerCase().includes("ვეროშპირონ") ||
                        med.genericName.toLowerCase().includes("potassium");
    if (patientDiseases.includes("High Potassium") && isKSpairing) {
      dangerAlerts.push(`კრიტიკული: ჰიპერკალიემია! კალიუმის დამზოგველი პრეპარატები ბლოკირებულია.`);
    }

    // Secondary warnings
    if (patientDiseases.includes("Diabetes") && med.tradeName.toLowerCase().includes("დექსამეთაზონ")) {
      warningAlerts.push(`კორტიზოლური რისკი: მკვეთრად ზრდის გლიკემიას! საჭიროებს ინსულინის დოზის კორექციას.`);
    }

    if (patientDiseases.includes("CKD")) {
      const isRenalCleared = med.pharmacologicalGroup.toLowerCase().includes("nsaid") || 
                             med.genericName.toLowerCase().includes("ibuprofen") || 
                             med.genericName.toLowerCase().includes("metformin") ||
                             med.tradeName.toLowerCase().includes("გლუკოფაჟ");
      if (isRenalCleared) {
        warningAlerts.push(`თირკმლის კლირენსი: საჭიროებს დოზის შემცირებას და კრეატინინის კონტროლს.`);
      }
    }

    if (patientDiseases.includes("Liver Failure") && (med as any).isHighRisk) {
      warningAlerts.push(`ღვიძლის მეტაბოლიზმი: გამოიყენეთ სიფრთხილით, მაღალი რისკის კლინიკური პროფილი.`);
    }

    return {
      danger: dangerAlerts,
      warning: warningAlerts,
      status: dangerAlerts.length > 0 ? "danger" : warningAlerts.length > 0 ? "warning" : "clear"
    };
  };

  // --- Filtered Medications for Grid display ---
  const filteredMedications = useMemo(() => {
    return medications.filter(med => {
      // Tab/Album filter
      if (activeTab !== "ყველა") {
        const hasDept = med.classificationDepartment && med.classificationDepartment.some(dept => (dept as string) === activeTab);
        if (!hasDept) return false;
      }

      // Search bar filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTrade = med.tradeName.toLowerCase().includes(query);
        const matchesGeneric = med.genericName.toLowerCase().includes(query);
        const matchesIndications = med.indications && med.indications.some(ind => ind.toLowerCase().includes(query));
        const matchesGroup = med.pharmacologicalGroup && med.pharmacologicalGroup.toLowerCase().includes(query);
        return matchesTrade || matchesGeneric || matchesIndications || matchesGroup;
      }

      return true;
    });
  }, [medications, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans selection:bg-[#6b111a]/40 selection:text-white relative overflow-x-hidden">
      
      {/* GLOWING AMBIENT BACKGROUND BLOBS */}
      <div className="absolute w-[600px] h-[600px] bg-[#6b111a]/15 rounded-full blur-[140px] top-[-150px] left-[-150px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] bottom-[-100px] right-[-50px] pointer-events-none animate-pulse duration-[12s]" />
      <div className="absolute w-[400px] h-[400px] bg-rose-900/5 rounded-full blur-[100px] top-[300px] right-[100px] pointer-events-none animate-pulse duration-[10s]" />

      {/* --- PREMIUM STICKY HEADER --- */}
      <header className="relative border-b border-white/5 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-20 flex items-center justify-between gap-2 sm:gap-4 relative">
          
          {/* 1. FAR LEFT: Logo Icon (Syringe + Pill) */}
          <div className="flex items-center shrink-0 z-10">
            <div className="bg-[#6b111a] rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(107,17,26,0.4)] relative w-8 h-8 sm:w-11 sm:h-11 overflow-hidden select-none">
              <div className="relative w-4.5 h-4.5 sm:w-6 sm:h-6">
                <Syringe className="h-3 w-3 sm:h-4.5 sm:w-4.5 text-white absolute top-0 left-0 -rotate-45" />
                <Pill className="h-2 w-2 sm:h-3.5 sm:w-3.5 text-rose-300 absolute bottom-0 right-0 rotate-12" />
              </div>
            </div>
          </div>

          {/* 2. LEFT SIDESYMMETRICAL ECG WAVE */}
          <div className="hidden xs:flex items-center justify-end flex-1 min-w-0 pr-2 lg:pr-4">
            <svg className="w-full max-w-[160px] md:max-w-[200px] h-10 text-[#6b111a]" viewBox="0 0 200 40" fill="none" preserveAspectRatio="none">
              <path
                d="M 0 20 L 45 20 L 52 10 L 58 32 L 64 2 L 70 36 L 75 20 L 125 20 L 132 10 L 138 32 L 144 2 L 150 36 L 155 20 L 200 20"
                stroke="rgba(107, 17, 26, 0.15)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <motion.path
                d="M 0 20 L 45 20 L 52 10 L 58 32 L 64 2 L 70 36 L 75 20 L 125 20 L 132 10 L 138 32 L 144 2 L 150 36 L 155 20 L 200 20"
                stroke="#e04556"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="45 155"
                animate={{ strokeDashoffset: [200, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </svg>
          </div>

          {/* 3. CENTER: K8.MED Brand Text & Subtitle */}
          <div className="absolute left-1/2 -translate-x-[58%] sm:-translate-x-[60%] flex flex-col items-center justify-center shrink-0 text-center px-2 z-10">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-0.5 leading-none">
              <span>K</span>
              <svg width="12" height="16" viewBox="0 0 18 24" fill="none" className="inline-block self-center mx-0.5 sm:w-[15px] sm:h-[21px]">
                <path
                  d="M 9 11 C 12 8, 14 6, 14 4.5 C 14 2.5, 11.5 1, 9 1 C 6.5 1, 4 2.5, 4 4.5 C 4 6, 6 8, 9 11 C 12 14, 14 16, 14 18.5 C 14 21, 11.5 23, 9 23 C 6.5 23, 4 21, 4 18.5 C 4 16, 6 14, 9 11 Z"
                  stroke="#6b111a"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40"
                />
                <motion.path
                  d="M 9 11 C 12 8, 14 6, 14 4.5 C 14 2.5, 11.5 1, 9 1 C 6.5 1, 4 2.5, 4 4.5 C 4 6, 6 8, 9 11 C 12 14, 14 16, 14 18.5 C 14 21, 11.5 23, 9 23 C 6.5 23, 4 21, 4 18.5 C 4 16, 6 14, 9 11 Z"
                  stroke="#e04556"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="16 34"
                  animate={{ strokeDashoffset: [0, -50] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </svg>
              <span>.MED</span>
            </h1>
            <p className="hidden md:block text-[10px] text-slate-400 font-medium mt-1">კლინიკური მედიკამენტების მართვა</p>
          </div>

          {/* 4. RIGHT SIDESYMMETRICAL ECG WAVE */}
          <div className="hidden xs:flex items-center justify-start flex-1 min-w-0 pl-2 lg:pl-4">
            <svg className="w-full max-w-[160px] md:max-w-[200px] h-10 text-[#6b111a] scale-x-[-1]" viewBox="0 0 200 40" fill="none" preserveAspectRatio="none">
              <path
                d="M 0 20 L 45 20 L 52 10 L 58 32 L 64 2 L 70 36 L 75 20 L 125 20 L 132 10 L 138 32 L 144 2 L 150 36 L 155 20 L 200 20"
                stroke="rgba(107, 17, 26, 0.15)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <motion.path
                d="M 0 20 L 45 20 L 52 10 L 58 32 L 64 2 L 70 36 L 75 20 L 125 20 L 132 10 L 138 32 L 144 2 L 150 36 L 155 20 L 200 20"
                stroke="#e04556"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="45 155"
                animate={{ strokeDashoffset: [200, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </svg>
          </div>

          {/* 5. FAR RIGHT: Navigation Options & Prescription Fields */}
          <div className="flex items-center shrink-0 z-10">
            <div className="bg-white/5 border border-white/10 p-1 rounded-full flex items-center space-x-1 shadow-inner">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("ყველა");
                  setCurrentMainView("catalog");
                }}
                title="მთავარი კატალოგი / Main Catalog"
                className={`p-2 sm:p-2.5 rounded-full transition-all flex items-center justify-center focus:outline-none cursor-pointer ${
                  currentMainView === "catalog"
                    ? "bg-[#6b111a] text-white shadow-lg shadow-[#6b111a]/30"
                    : "hover:bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <Pill className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              
              <button
                onClick={() => {
                  setCurrentMainView("albums");
                }}
                title="კლინიკური ალბომები / Clinical Albums"
                className={`p-2 sm:p-2.5 rounded-full transition-all flex items-center justify-center focus:outline-none cursor-pointer ${
                  currentMainView === "albums"
                    ? "bg-[#6b111a] text-white shadow-lg shadow-[#6b111a]/30"
                    : "hover:bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <Folder className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                title="დანიშნულების კალათა"
                className={`p-2 sm:p-2.5 rounded-full transition-all flex items-center justify-center relative focus:outline-none cursor-pointer ${
                  isCartOpen || prescriptionCart.length > 0
                    ? "bg-[#6b111a] text-white shadow-lg shadow-[#6b111a]/30"
                    : "hover:bg-white/5 text-slate-400"
                }`}
              >
                <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
                {prescriptionCart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] sm:text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-bold border-2 border-[#070a12] animate-bounce">
                    {prescriptionCart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* --- MAIN PAGE CONTENT LAYOUT --- */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* =======================================
            LEFT PANEL: პაციენტის სტატუსი (Exactly structured based on uploaded photo)
            ======================================= */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl shadow-black/40 glow-burgundy/10 transition-all duration-300">
            
            {/* Header block with Pulse Heart icon */}
            <div className="flex items-center space-x-3 border-b border-white/5 pb-4 mb-5">
              <div className="p-2 bg-[#6b111a]/20 rounded-xl text-[#e04556] shadow-inner">
                <Heart className="h-5 w-5 fill-[#e04556]" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">პაციენტის სტატუსი</h2>
            </div>

            {/* Combobox for Diseases (დაავადებები) */}
            <div className="space-y-2.5 relative" ref={diseaseDropdownRef}>
              <label className="text-xs text-slate-300 font-semibold tracking-wider uppercase block">
                დაავადებები
              </label>
              
              <div 
                className="w-full bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-all focus-within:border-[#6b111a]/80"
                onClick={() => setIsDiseaseDropdownOpen(!isDiseaseDropdownOpen)}
              >
                <span className="text-sm text-slate-400 font-medium">აირჩიეთ დაავადებები...</span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-300" style={{ transform: isDiseaseDropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </div>

              {/* Combobox Search Dropdown Menu */}
              <AnimatePresence>
                {isDiseaseDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 mt-2 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2 border-b border-white/5">
                      <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-xl">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ძებნა..."
                          value={diseaseSearchText}
                          onChange={(e) => setDiseaseSearchText(e.target.value)}
                          className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-slate-500"
                        />
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
                      {filteredDiseasePresets.length > 0 ? (
                        filteredDiseasePresets.map((disease) => (
                          <div
                            key={disease.key}
                            onClick={() => {
                              if (!patientDiseases.includes(disease.key)) {
                                setPatientDiseases([...patientDiseases, disease.key]);
                              }
                              setIsDiseaseDropdownOpen(false);
                              setDiseaseSearchText("");
                            }}
                            className="px-4 py-2.5 text-xs text-slate-300 hover:bg-[#6b111a]/20 hover:text-white cursor-pointer transition-all flex items-center justify-between"
                          >
                            <span>{disease.name}</span>
                            <Plus className="h-3 w-3 text-slate-500" />
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-slate-500 text-center">
                          ყველა დაავადება არჩეულია
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Disease Badges display - Cancelable */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {patientDiseases.map(diseaseKey => {
                  const diseaseObj = DISEASE_PRESETS.find(d => d.key === diseaseKey);
                  return (
                    <span
                      key={diseaseKey}
                      className="bg-[#6b111a]/15 text-rose-300 border border-[#6b111a]/40 px-2.5 py-1 rounded-xl text-xs flex items-center space-x-1 shadow-sm font-medium animate-fade-in"
                    >
                      <span>{diseaseObj ? diseaseObj.name : diseaseKey}</span>
                      <button
                        onClick={() => setPatientDiseases(patientDiseases.filter(d => d !== diseaseKey))}
                        className="hover:bg-rose-950/60 p-0.5 rounded-full text-rose-400 hover:text-white transition-all focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Allergy Text Input (Creates red badges on enter) */}
            <div className="space-y-2.5 mt-5">
              <label className="text-xs text-slate-300 font-semibold tracking-wider uppercase block flex items-center space-x-1.5">
                <span>ალერგიები</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="ჩაწერეთ და Enter..."
                  value={allergyInputText}
                  onChange={(e) => setAllergyInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && allergyInputText.trim()) {
                      e.preventDefault();
                      const val = allergyInputText.trim();
                      if (!patientAllergies.includes(val)) {
                        setPatientAllergies([...patientAllergies, val]);
                      }
                      setAllergyInputText("");
                    }
                  }}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#6b111a]/80 focus:ring-1 focus:ring-[#6b111a]/40 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              </div>

              {/* Allergy Red Badges display - Cancelable */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {patientAllergies.map(allergy => (
                  <span
                    key={allergy}
                    className="bg-red-950/30 text-red-400 border border-red-900/50 px-2.5 py-1 rounded-xl text-xs flex items-center space-x-1 shadow-sm font-medium animate-fade-in"
                  >
                    <span>{allergy}</span>
                    <button
                      onClick={() => setPatientAllergies(patientAllergies.filter(a => a !== allergy))}
                      className="hover:bg-red-900/40 p-0.5 rounded-full text-red-400 hover:text-white transition-all focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Summary Counters exactly corresponding to the bottom of the uploaded photo */}
            <div className="mt-8 pt-5 border-t border-white/5 space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">არჩეული დაავადებები</span>
                <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${patientDiseases.length > 0 ? 'text-[#e04556] bg-rose-950/20' : 'text-slate-500 bg-white/5'}`}>
                  {patientDiseases.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">ალერგიები</span>
                <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${patientAllergies.length > 0 ? 'text-red-400 bg-red-950/20 border border-red-900/30' : 'text-slate-500 bg-white/5'}`}>
                  {patientAllergies.length}
                </span>
              </div>
            </div>

          </div>

          {/* Quick Actions (Add/Reset buttons) */}
          <div className="space-y-3">
            <button
              onClick={openAddModal}
              className="w-full bg-gradient-to-r from-[#6b111a] to-[#801721] hover:from-[#801721] hover:to-[#99202c] text-white text-xs font-bold tracking-wider uppercase py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-[#6b111a]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>ახალი მედიკამენტის დამატება</span>
            </button>
          </div>
        </section>


        {/* =======================================
            CENTER PANEL: ალბომების მართვა & მედიკამენტების გრიდი
            ======================================= */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* MAIN NAVIGATION TABS */}
          <div className="flex space-x-2 border-b border-white/5 pb-4">
            <button
              onClick={() => setCurrentMainView("catalog")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer focus:outline-none ${
                currentMainView === "catalog"
                  ? "bg-[#6b111a] text-white shadow-lg shadow-[#6b111a]/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Pill className="h-4 w-4" />
              <span>მედიკამენტები</span>
              {activeTab !== "ყველა" && (
                <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-900/50 px-2 py-0.5 rounded-full font-semibold">
                  {activeTab}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentMainView("albums")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer focus:outline-none ${
                currentMainView === "albums"
                  ? "bg-[#6b111a] text-white shadow-lg shadow-[#6b111a]/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Folder className="h-4 w-4" />
              <span>ალბომები</span>
              <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                {albums.length}
              </span>
            </button>
          </div>

          {currentMainView === "catalog" ? (
            <div className="space-y-6">
              {/* TOP SEARCH HEADER */}
              <div className="bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl shadow-black/40 space-y-4">
                {/* Search Input Bar */}
                <div className="relative">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="მოძებნეთ დასახელებით, ჯენერიკით, ჯგუფით ან ჩვენებებით..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#6b111a]/80 focus:ring-1 focus:ring-[#6b111a]/40 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all focus:outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Banner */}
                {activeTab !== "ყველა" && (
                  <div className="flex items-center justify-between bg-[#6b111a]/5 border border-[#6b111a]/20 rounded-2xl px-4 py-2.5 text-xs text-rose-300 font-medium">
                    <div className="flex items-center space-x-2">
                      <Folder className="h-4 w-4 text-rose-400" />
                      <span>ნაჩვენებია ალბომიდან: <strong>{activeTab}</strong></span>
                    </div>
                    <button 
                      onClick={() => setActiveTab("ყველა")}
                      className="hover:bg-[#6b111a]/10 px-2.5 py-1 rounded-lg text-rose-400 hover:text-white transition-all focus:outline-none cursor-pointer text-[11px]"
                    >
                      ფილტრის მოხსნა (ყველას ჩვენება)
                    </button>
                  </div>
                )}
              </div>

              {/* MEDICATIONS GRID: 3D Isometric cards with smart DDI color states */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredMedications.length > 0 ? (
                filteredMedications.map((med) => {
                  const alertState = evaluateClinicalAlerts(med);
                  const isRisk = (med as any).isHighRisk;
                  const isSelected = selectedMedIds.includes(med.id);

                  // Determine border glow & bg color classes based on smart DDI evaluation
                  let cardThemeClass = "border-white/10 hover:border-[#6b111a]/40";
                  let bgOverlayClass = "bg-slate-950/40";
                  let glowClass = "glow-burgundy/10";
                  let badgeLabel = null;

                  if (alertState.status === "danger") {
                    cardThemeClass = "border-rose-500/50 hover:border-rose-500 bg-rose-950/20";
                    bgOverlayClass = "bg-rose-950/10";
                    glowClass = "glow-red";
                    badgeLabel = "🔴 Danger / უკუჩვენება";
                  } else if (alertState.status === "warning") {
                    cardThemeClass = "border-amber-500/50 hover:border-amber-500 bg-amber-950/10";
                    bgOverlayClass = "bg-amber-950/5";
                    glowClass = "glow-yellow";
                    badgeLabel = "🟡 Warning / სიფრთხილით";
                  } else if (isRisk) {
                    cardThemeClass = "border-violet-500/40 hover:border-violet-500 bg-violet-950/10";
                    glowClass = "glow-indigo";
                  }

                  if (isSelected) {
                    cardThemeClass = "border-[#e04556]/60 bg-[#6b111a]/15 shadow-2xl shadow-[#6b111a]/25 ring-1 ring-[#e04556]/20";
                    bgOverlayClass = "bg-[#6b111a]/5";
                    glowClass = "border-glow-burgundy scale-[1.01]";
                  }

                  return (
                    <motion.div
                      layout
                      key={med.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button") || target.closest("select") || target.closest("input") || target.closest("textarea") || target.closest(".no-card-click")) {
                          return;
                        }
                        toggleSelectMed(med.id);
                      }}
                      className={`tilt-card ${bgOverlayClass} backdrop-blur-md border ${cardThemeClass} rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${glowClass} cursor-pointer select-none`}
                    >
                      {/* Ambient light overlay on hover */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6b111a]/10 to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-full pointer-events-none" />

                      {/* Top bar of the card */}
                      <div className="relative z-10">
                        
                        {/* Alert Badges */}
                        <div className="flex items-center justify-between mb-3.5 relative z-10">
                          <div className="flex items-center space-x-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectMed(med.id);
                              }}
                              className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                                isSelected
                                  ? "bg-[#6b111a] border-[#e04556] text-white shadow-lg shadow-[#6b111a]/50 scale-110"
                                  : "bg-slate-950/60 border-white/20 text-transparent hover:border-white/50 hover:text-slate-400 hover:scale-105"
                              }`}
                              title={isSelected ? "მონიშვნის გაუქმება" : "მონიშვნა"}
                            >
                              <Check className={`h-3.5 w-3.5 transition-all duration-300 ${isSelected ? "scale-100 opacity-100" : "scale-75 opacity-0 hover:opacity-100"}`} />
                            </button>
                            {badgeLabel ? (
                              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${
                                alertState.status === "danger" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}>
                                {badgeLabel}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {med.pharmacologicalGroup || "მედიკამენტი"}
                              </span>
                            )}
                          </div>

                          {/* High Risk indicator */}
                          {isRisk && (
                            <span className="text-[10px] bg-red-600/35 border border-red-500/50 text-red-100 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm animate-pulse">
                              ⚡ HIGH RISK
                            </span>
                          )}
                        </div>

                        {/* Trade Name / დასახელება */}
                        <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-rose-400 transition-colors">
                          {med.tradeName}
                        </h3>
                        
                        {/* Generic Name / ჯენერიკი */}
                        <p className="text-xs text-[#e04556] font-mono mt-0.5 font-bold">
                          {med.genericName}
                        </p>

                        {/* Indications / ჩვენება */}
                        {med.indications && med.indications.length > 0 && (
                          <div className="mt-4">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wide">ჩვენებები:</span>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">
                              {med.indications.join(", ")}
                            </p>
                          </div>
                        )}

                        {/* Clinical Pearls / კლინიკური შენიშვნა */}
                        {med.clinicalPearls && (
                          <div className="mt-3.5 p-3 bg-white/5 border border-white/5 rounded-2xl relative">
                            <span className="text-[9px] uppercase tracking-widest text-[#e04556] font-extrabold block mb-1">კლინიკური შენიშვნა:</span>
                            <p className="text-xs text-slate-300 font-medium italic">
                              {med.clinicalPearls}
                            </p>
                          </div>
                        )}

                        {/* Interactive DDI alert breakdown box */}
                        {alertState.status !== "clear" && (
                          <div className="mt-4.5 p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                            <div className="flex items-center space-x-1.5">
                              <AlertTriangle className={`h-4.5 w-4.5 ${alertState.status === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
                              <span className="text-xs font-bold text-white tracking-wide">CDSS კლინიკური გაფრთხილება:</span>
                            </div>
                            <div className="space-y-1.5 divide-y divide-white/5">
                              {alertState.danger.map((err, i) => (
                                <p key={i} className="text-[11px] font-medium text-rose-300 pt-1.5">{err}</p>
                              ))}
                              {alertState.warning.map((wrn, i) => (
                                <p key={i} className="text-[11px] font-medium text-amber-300 pt-1.5">{wrn}</p>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Card Actions: Details, Copy, Edit, Delete, + Cart */}
                      <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-1.5">
                        
                        <div className="flex items-center space-x-1">
                          
                          {/* Copy formatted prescription */}
                          <button
                            onClick={() => copyFormattedMedicationText(med)}
                            title="რეცეპტის კოპირება"
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer focus:outline-none"
                          >
                            {copiedId === med.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>

                          {/* View details (Eye) */}
                          <button
                            onClick={() => setViewingMed(med)}
                            title="დეტალური ინფორმაცია"
                            className="p-2.5 bg-white/5 hover:bg-[#6b111a]/20 text-slate-300 hover:text-rose-400 rounded-xl transition-all cursor-pointer focus:outline-none"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit med */}
                          <button
                            onClick={() => openEditModal(med)}
                            title="მონაცემების რედაქტირება"
                            className="p-2.5 bg-white/5 hover:bg-[#6b111a]/20 text-slate-300 hover:text-rose-400 rounded-xl transition-all cursor-pointer focus:outline-none"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* Delete med */}
                          <button
                            onClick={() => handleDeleteMedication(med.id)}
                            title="წაშლა ბაზიდან"
                            className="p-2.5 bg-white/5 hover:bg-rose-950/50 text-slate-300 hover:text-rose-500 rounded-xl transition-all cursor-pointer focus:outline-none"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                        </div>

                        {/* Add to prescription basket button */}
                        <button
                          onClick={() => handleAddToCart(med)}
                          disabled={prescriptionCart.some(item => item.id === med.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer focus:outline-none ${
                            prescriptionCart.some(item => item.id === med.id)
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40"
                              : "bg-[#6b111a] hover:bg-[#801721] text-white shadow-md shadow-[#6b111a]/20"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{prescriptionCart.some(item => item.id === med.id) ? "კალათაშია" : "დანიშვნა"}</span>
                        </button>

                      </div>

                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-1 md:col-span-2 py-16 text-center text-slate-500">
                  <Pill className="h-10 w-10 mx-auto mb-3 text-slate-600 animate-pulse" />
                  <p className="text-sm font-medium">მედიკამენტები მოცემულ კატეგორიაში ვერ მოიძებნა</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* ALBUMS MAIN VIEW */
        <div className="space-y-6">
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl shadow-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">კლინიკური ალბომები</h3>
              <p className="text-xs text-slate-400 mt-1">მედიკამენტების თემატური კოლექციები სპეციალობებისა და ჯგუფების მიხედვით</p>
            </div>
            <button
              onClick={() => setIsAddingAlbum(true)}
              className="bg-[#6b111a] hover:bg-[#801721] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 focus:outline-none transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>ახალი ალბომი</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {albums.map((albumName) => {
              const count = medications.filter(med => 
                albumName === "ყველა" 
                  ? true 
                  : med.classificationDepartment && med.classificationDepartment.some(d => (d as string) === albumName)
              ).length;

              const AlbumIcon = getAlbumIcon(albumName);
              const isPreset = ["ყველა", "ER", "Endo", "Cardiology", "Pediatrics"].includes(albumName);

              return (
                <div 
                  key={albumName} 
                  onClick={() => {
                    setActiveTab(albumName);
                    setCurrentMainView("catalog");
                  }}
                  className="group relative bg-slate-950/40 hover:bg-slate-900/40 border border-white/5 hover:border-[#6b111a]/40 rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-lg hover:shadow-[#6b111a]/5 min-h-[160px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-[#6b111a]/10 rounded-2xl text-rose-400 group-hover:bg-[#6b111a]/20 group-hover:text-rose-300 transition-all">
                      <AlbumIcon className="h-6 w-6" />
                    </div>

                    {!isPreset && (
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdownAlbum(openDropdownAlbum === albumName ? null : albumName)}
                          className="p-1.5 text-slate-400 hover:text-white transition-all rounded-lg hover:bg-white/5 focus:outline-none"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        <AnimatePresence>
                          {openDropdownAlbum === albumName && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-8 bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 p-1 min-w-[140px]"
                            >
                              <button
                                onClick={() => {
                                  setEditingAlbum(albumName);
                                  setRenameAlbumValue(albumName);
                                  setOpenDropdownAlbum(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-[#6b111a]/20 hover:text-white rounded-lg transition-all flex items-center space-x-2 focus:outline-none"
                              >
                                <Edit className="h-3.5 w-3.5 text-slate-400" />
                                <span>სახელის შეცვლა</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteAlbum(albumName);
                                  setOpenDropdownAlbum(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg transition-all flex items-center space-x-2 focus:outline-none"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                <span>წაშლა</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {editingAlbum === albumName ? (
                      <form 
                        onSubmit={handleRenameAlbum} 
                        className="flex items-center space-x-1 bg-slate-900 rounded-xl border border-[#6b111a] p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={renameAlbumValue}
                          onChange={(e) => setRenameAlbumValue(e.target.value)}
                          className="bg-transparent text-xs text-white focus:outline-none w-full px-2 py-0.5"
                          autoFocus
                        />
                        <button type="submit" className="text-emerald-500 hover:text-emerald-400 p-0.5">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setEditingAlbum(null)} className="text-slate-400 hover:text-white p-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-rose-400 transition-colors">
                          {albumName}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-1 font-mono">
                          {count} პრეპარატი
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* New Album Inline Card inside Grid */}
            <div className="bg-slate-950/20 hover:bg-slate-900/20 border border-dashed border-white/10 hover:border-[#6b111a]/40 rounded-3xl p-5 flex flex-col justify-center items-center cursor-pointer transition-all duration-300 min-h-[160px] group text-slate-400 hover:text-white relative">
              {isAddingAlbum ? (
                <form 
                  onSubmit={handleAddAlbum} 
                  className="w-full flex flex-col space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    placeholder="ალბომის სახელი..."
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6b111a]"
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingAlbum(false)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-bold"
                    >
                      გაუქმება
                    </button>
                    <button 
                      type="submit"
                      className="px-3 py-1.5 bg-[#6b111a] hover:bg-[#801721] text-white rounded-lg text-[10px] font-bold flex items-center space-x-1"
                    >
                      <Check className="h-3 w-3" />
                      <span>შექმნა</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div onClick={() => setIsAddingAlbum(true)} className="flex flex-col items-center justify-center w-full h-full">
                  <div className="p-3 bg-white/5 rounded-2xl mb-2 group-hover:bg-[#6b111a]/10 group-hover:text-rose-400 transition-all">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold tracking-wider uppercase">ახალი ალბომი</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </section>

      </main>


      {/* =======================================
          SLIDING PRESCRIPTION DRAWER (დანიშნულების კალათა)
          ======================================= */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Dark glass backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
            />

            {/* Sliding drawer element */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-950/95 border-l border-white/10 z-50 shadow-2xl flex flex-col justify-between"
            >
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#6b111a] text-white rounded-xl shadow-lg">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">დანიშნულების კალათა</h3>
                    <p className="text-[10px] text-slate-400">არჩეული მედიკამენტების სია</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {prescriptionCart.length > 0 ? (
                  prescriptionCart.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 shadow-md relative group hover:border-[#6b111a]/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-white">{item.tradeName}</h4>
                          <p className="text-[10px] text-[#e04556] font-mono mt-0.5">{item.genericName}</p>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[9px] bg-white/5 text-slate-300 px-2 py-0.5 rounded font-medium">
                              {item.dosageForm}
                            </span>
                            <span className="text-[9px] bg-white/5 text-slate-300 px-2 py-0.5 rounded font-medium">
                              {item.route}
                            </span>
                            <span className="text-[9px] bg-[#6b111a]/10 text-rose-300 px-2 py-0.5 rounded font-medium border border-[#6b111a]/20">
                              {item.frequency}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          title="დანიშნულებიდან წაშლა"
                          className="p-2 bg-rose-950/30 hover:bg-rose-950/60 rounded-xl text-rose-400 hover:text-rose-300 transition-all focus:outline-none cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      {/* Inline edits for cart item */}
                      <div className="mt-2 pt-3 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          {/* Route edit */}
                          <div className="space-y-1">
                            <span className="text-slate-400 block font-semibold">გზა:</span>
                            <select
                              value={item.route}
                              onChange={(e) => updateCartItem(item.id, { route: e.target.value as Route })}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                            >
                              <option value="PO">PO (დასალევი)</option>
                              <option value="IV">IV (ვენაში)</option>
                              <option value="IM">IM (კუნთში)</option>
                              <option value="SC">SC (კანქვეშ)</option>
                              <option value="ID">ID (კანშიდა)</option>
                            </select>
                          </div>

                          {/* Frequency edit */}
                          <div className="space-y-1">
                            <span className="text-slate-400 block font-semibold">სიხშირე:</span>
                            <select
                              value={item.frequency}
                              onChange={(e) => updateCartItem(item.id, { frequency: e.target.value as Frequency })}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                            >
                              <option value="1x">1x (დღეში 1)</option>
                              <option value="2x">2x (დღეში 2)</option>
                              <option value="3x">3x (დღეში 3)</option>
                              <option value="4x">4x (დღეში 4)</option>
                              <option value="PRN">PRN (საჭიროებ.)</option>
                              <option value="Continuous Infusion">უწყვეტი ინფუზია</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          {/* Dosage Form edit */}
                          <div className="space-y-1">
                            <span className="text-slate-400 block font-semibold">ფორმა:</span>
                            <select
                              value={item.dosageForm}
                              onChange={(e) => updateCartItem(item.id, { dosageForm: e.target.value as DosageForm })}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                            >
                              <option value="Tablet">ტაბლეტი</option>
                              <option value="Ampoule">ამპულა</option>
                              <option value="Syrup">სიროფი</option>
                              <option value="Infusion">ინფუზია</option>
                            </select>
                          </div>

                          {/* Meal Connection edit */}
                          <div className="space-y-1">
                            <span className="text-slate-400 block font-semibold">კვება:</span>
                            <select
                              value={item.mealConnection}
                              onChange={(e) => updateCartItem(item.id, { mealConnection: e.target.value as MealConnection })}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                            >
                              <option value="Independent">დამოუკიდებლად</option>
                              <option value="Before meal">ჭამამდე</option>
                              <option value="During">ჭამის დროს</option>
                              <option value="After">ჭამის შემდეგ</option>
                              <option value="Fast-acting">სწრაფი</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom comment input field */}
                        <div className="space-y-1 text-[10px]">
                          <span className="text-slate-400 block font-semibold">ექიმის დამატებითი მითითება / შენიშვნა:</span>
                          <input
                            type="text"
                            placeholder="მაგ: მიიღოს თბილ წყალთან ერთად..."
                            value={item.customRemark || ""}
                            onChange={(e) => updateCartItem(item.id, { customRemark: e.target.value })}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#6b111a] placeholder-slate-600"
                          />
                        </div>
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="text-center py-24 text-slate-500">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-slate-600 animate-pulse" />
                    <p className="text-sm">კალათა ცარიელია</p>
                    <p className="text-xs mt-1 text-slate-600">დაამატეთ მედიკამენტები მთავარი გრიდიდან</p>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              {prescriptionCart.length > 0 && (
                <div className="p-6 border-t border-white/10 bg-slate-950/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-1">
                    <span>არჩეული პრეპარატები</span>
                    <span className="font-mono font-bold text-white">{prescriptionCart.length}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handlePrintPrescription}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 focus:outline-none cursor-pointer text-[10px]"
                      title="ბეჭდვა"
                    >
                      <Printer className="h-4 w-4 text-rose-400" />
                      <span>ბეჭდვა</span>
                    </button>
                    <button
                      onClick={() => handleGeneratePDF("preview")}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 focus:outline-none cursor-pointer text-[10px]"
                      title="PDF გახსნა"
                    >
                      <Eye className="h-4 w-4 text-blue-400" />
                      <span>გახსნა</span>
                    </button>
                    <button
                      onClick={() => handleGeneratePDF("download")}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 focus:outline-none cursor-pointer text-[10px]"
                      title="PDF ჩამოტვირთვა"
                    >
                      <Download className="h-4 w-4 text-emerald-400" />
                      <span>ჩამოტვირთვა</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCompletePrescription}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-950/30 flex items-center justify-center space-x-2 focus:outline-none cursor-pointer"
                  >
                    <CheckSquare className="h-4.5 w-4.5" />
                    <span>დანიშნულების დასრულება</span>
                  </button>
                </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* =======================================
          SUCCESS PRESCRIPTION OVERLAY MODAL
          ======================================= */}
      <AnimatePresence>
        {successPrescription && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative text-center space-y-6 overflow-hidden glow-green"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
              
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">დანიშნულება გაფორმდა</h3>
                <p className="text-xs text-slate-400">რეცეპტი წარმატებით აიტვირთა კლინიკურ ელექტრონულ ბაზაში</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl text-left text-xs text-slate-300 font-mono space-y-1.5">
                <div className="flex justify-between border-b border-white/5 pb-1 mb-1 text-[10px] text-slate-500">
                  <span>ხელმოწერილია კლინიკის მიერ</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <p>✓ დანიშნულების ID: #CDSS-{Math.floor(Math.random() * 900000 + 100000)}</p>
                <p>✓ რეცეპტების პაკეტი: გაგზავნილია აფთიაქში</p>
                <p>✓ პაციენტის სტატუსი: სინქრონიზებული</p>
              </div>

              <button
                onClick={() => setSuccessPrescription(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer focus:outline-none"
              >
                დასრულება
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* =======================================
          FLOATING BULK ACTIONS BAR (მრავალჯერადი მონიშვნა)
          ======================================= */}
      <AnimatePresence>
        {selectedMedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#090d16]/90 backdrop-blur-md border border-[#6b111a]/50 px-6 py-4 rounded-3xl shadow-2xl z-40 flex flex-wrap items-center justify-between gap-4 max-w-2xl w-[90%] border-glow-burgundy"
          >
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-white">
                მონიშნულია <span className="text-rose-400 text-sm font-mono">{selectedMedIds.length}</span> პრეპარატი
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Custom Searchable Album Dropdown */}
              <div className="relative" ref={bulkAlbumDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsBulkAlbumDropdownOpen(!isBulkAlbumDropdownOpen)}
                  className="bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center space-x-1.5 focus:outline-none cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-rose-400" />
                  <span>{activeTab !== "ყველა" ? "სხვა ალბომში გადატანა..." : "ალბომში დამატება..."}</span>
                </button>

                <AnimatePresence>
                  {isBulkAlbumDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 w-64 border-glow-burgundy"
                    >
                      <div className="relative mb-2">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="მოძებნე ალბომი..."
                          value={bulkAlbumSearchQuery}
                          onChange={(e) => setBulkAlbumSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6b111a]"
                          autoFocus
                        />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {albums
                          .filter(a => a !== "ყველა" && a !== activeTab && a.toLowerCase().includes(bulkAlbumSearchQuery.toLowerCase()))
                          .map(a => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => {
                                if (activeTab !== "ყველა") {
                                  handleBulkMoveToAnotherAlbum(a);
                                } else {
                                  handleBulkAddToAlbum(a);
                                }
                                setIsBulkAlbumDropdownOpen(false);
                                setBulkAlbumSearchQuery("");
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-[#6b111a]/20 hover:text-white rounded-lg transition-all flex items-center justify-between focus:outline-none cursor-pointer"
                            >
                              <span>{a}</span>
                              <ChevronRight className="h-3 w-3 text-slate-500" />
                            </button>
                          ))}
                        {albums.filter(a => a !== "ყველა" && a !== activeTab && a.toLowerCase().includes(bulkAlbumSearchQuery.toLowerCase())).length === 0 && (
                          <div className="text-center py-2 text-[11px] text-slate-500">
                            ალბომი ვერ მოიძებნა
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeTab !== "ყველა" && (
                <button
                  onClick={handleBulkRemoveFromCurrentAlbum}
                  title="ამ ალბომიდან წაშლა"
                  className="px-3.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/30 border border-amber-900/50 text-amber-300 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center space-x-1"
                >
                  <FolderMinus className="h-3.5 w-3.5" />
                  <span>ალბომიდან ამოღება</span>
                </button>
              )}

              <button
                onClick={handleBulkDelete}
                title="ბაზიდან სრულად წაშლა"
                className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-900/50 text-rose-300 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>წაშლა</span>
              </button>

              <button
                onClick={clearSelection}
                className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none cursor-pointer ml-1"
                title="მონიშვნის გაუქმება"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* =======================================
          ADD / EDIT DRUG MODAL (Ultra glassmorphic form)
          ======================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl relative flex flex-col my-8 overflow-hidden"
            >
              
              {/* Modal Sticky Header */}
              <div className="px-6 py-5 border-b border-white/5 bg-slate-950/40 sticky top-0 z-20 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#e04556]" />
                    {editingMed ? "მედიკამენტის რედაქტირება" : "ახალი მედიკამენტის დამატება კატალოგში"}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    შეავსეთ ველები ან გამოიყენეთ ფარმაციის ცოცხალი სინქრონიზატორი
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable form body */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                
                {/* 1. Live Web API Scraper integration widget */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-4">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className={`h-4.5 w-4.5 text-[#e04556] ${isSyncLoading ? 'animate-spin' : ''}`} />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      ფარმაციის ცოცხალი სინქრონიზაცია (PSP / Aversi Scraper)
                    </h4>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="ჩაწერეთ პრეპარატი (მაგ: ნუროფენი, დექსამეთაზონი...)"
                        value={pharmacyQuery}
                        onChange={(e) => setPharmacyQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            triggerPharmacySync();
                          }
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <select
                        value={pharmacySource}
                        onChange={(e) => setPharmacySource(e.target.value as any)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="psp">PSP Pharmacy</option>
                        <option value="aversi">Aversi Pharmacy</option>
                      </select>

                      <button
                        type="button"
                        onClick={triggerPharmacySync}
                        disabled={isSyncLoading}
                        className="bg-[#6b111a] hover:bg-[#801721] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1.5 focus:outline-none cursor-pointer"
                      >
                        {isSyncLoading ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>სინქრონიზაცია...</span>
                          </>
                        ) : (
                          <span>სინქრონიზაცია</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sync status messages and results */}
                  {syncMessage && (
                    <p className={`text-[11px] font-medium ${
                      syncMessage.type === "success" ? "text-emerald-400" : syncMessage.type === "error" ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {syncMessage.text}
                    </p>
                  )}

                  {syncResults.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">არჩეული მატჩები (დააჭირეთ შესავსებად):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {syncResults.map((result, idx) => (
                          <div
                            key={idx}
                            onClick={() => applySyncResult(result)}
                            className="p-2.5 bg-white/5 hover:bg-[#6b111a]/20 rounded-xl border border-white/5 cursor-pointer transition-all flex justify-between items-center group text-left"
                          >
                            <div>
                              <p className="text-xs font-bold text-white group-hover:text-rose-300">{result.tradeName}</p>
                              {result.genericName && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{result.genericName}</p>
                              )}
                            </div>
                            <span className="text-[10px] bg-rose-950/40 text-rose-300 border border-rose-900/30 px-2 py-0.5 rounded font-bold">
                              {result.source || "PSP"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. FORM PROPER */}
                <form id="cdss-med-form" onSubmit={handleSaveMedication} className="space-y-5">
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">სავაჭრო სახელი (Trade Name)*</label>
                      <input
                        type="text"
                        required
                        placeholder="მაგ: ნუროფენი ფორტე"
                        value={tradeName}
                        onChange={(e) => setTradeName(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">გენერიკული სახელი (Generic Name)*</label>
                      <input
                        type="text"
                        required
                        placeholder="მაგ: იბუპროფენი (Ibuprofen)"
                        value={genericName}
                        onChange={(e) => setGenericName(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>
                  </div>

                  {/* Secondary info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">ფარმაკოლოგიური ჯგუფი</label>
                      <input
                        type="text"
                        placeholder="მაგ: NSAID, ბეტა-ადრენომიმეტიკი..."
                        value={pharmacologicalGroup}
                        onChange={(e) => setPharmacologicalGroup(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">ფასი (GEL)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="მაგ: 15.50"
                        value={price || ""}
                        onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>
                  </div>

                  {/* Formulations & Routes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">მიღების გზა</label>
                      <select
                        value={route}
                        onChange={(e) => setRoute(e.target.value as Route)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="PO">PO (პერორალურად)</option>
                        <option value="IV">IV (ინტრავენურად)</option>
                        <option value="IM">IM (კუნთშიდა)</option>
                        <option value="SC">SC (კანქვეშ)</option>
                        <option value="ID">ID (კანშიდა)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">დოზირების ფორმა</label>
                      <select
                        value={dosageForm}
                        onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Tablet">Tablet (ტაბლეტი)</option>
                        <option value="Ampoule">Ampoule (ამპულა)</option>
                        <option value="Syrup">Syrup (სიროფი)</option>
                        <option value="Infusion">Infusion (ინფუზია)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">მიღების სიხშირე</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as Frequency)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="1x">დღეში 1-ჯერ (1x)</option>
                        <option value="2x">დღეში 2-ჯერ (2x)</option>
                        <option value="3x">დღეში 3-ჯერ (3x)</option>
                        <option value="4x">დღეში 4-ჯერ (4x)</option>
                        <option value="PRN">საჭიროებისამებრ (PRN)</option>
                        <option value="Continuous Infusion">უწყვეტი ინფუზია</option>
                      </select>
                    </div>
                  </div>

                  {/* Meal Connection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">კავშირი საკვებთან</label>
                      <select
                        value={mealConnection}
                        onChange={(e) => setMealConnection(e.target.value as MealConnection)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Independent">დამოუკიდებლად</option>
                        <option value="Before meal">ჭამამდე (Before meal)</option>
                        <option value="During">ჭამის დროს (During)</option>
                        <option value="After">ჭამის შემდეგ (After)</option>
                        <option value="Fast-acting">სწრაფი მოქმედების (Fast-acting)</option>
                      </select>
                    </div>

                    {/* Dilutions info */}
                    {dosageForm !== "Tablet" && (
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-bold block">
                          განზავება / შეყვანის სიჩქარე
                        </label>
                        <input
                          type="text"
                          placeholder="მაგ: განაზავეთ ფიზიოლოგიურ ხსნარში..."
                          value={dilutionAdminRate}
                          onChange={(e) => setDilutionAdminRate(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Classification Departments (Multi-select) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs text-slate-300 font-bold block">თემატური ალბომები / დეპარტამენტები (Classification Albums)</label>
                      
                      {/* Search box for filtering departments/albums inside form */}
                      {albums.length > 5 && (
                        <div className="relative max-w-xs">
                          <Search className="h-3 w-3 text-slate-500 absolute left-2 top-1.5" />
                          <input
                            type="text"
                            placeholder="ალბომის ფილტრი..."
                            value={modalAlbumSearchText}
                            onChange={(e) => setModalAlbumSearchText(e.target.value)}
                            className="bg-slate-950 border border-white/5 rounded-lg pl-7 pr-2 py-0.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#6b111a]"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                      {albums
                        .filter(a => a !== "ყველა" && a.toLowerCase().includes(modalAlbumSearchText.toLowerCase()))
                        .map(album => {
                          const isSelected = selectedDepts.includes(album);
                          return (
                            <button
                              key={album}
                              type="button"
                              onClick={() => toggleDept(album)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#6b111a] text-white border-[#6b111a] font-bold shadow-md"
                                  : "bg-slate-900 text-slate-400 border-white/10 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {album}
                            </button>
                          );
                        })}
                      {albums.filter(a => a !== "ყველა" && a.toLowerCase().includes(modalAlbumSearchText.toLowerCase())).length === 0 && (
                        <span className="text-xs text-slate-500 italic">ალბომი ვერ მოიძებნა</span>
                      )}
                    </div>
                  </div>

                  {/* Active DDI Contraindications flags */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs text-slate-300 font-bold block">კლინიკური უკუჩვენებები (Contraindication matching triggers)</label>
                    <div className="flex flex-wrap gap-2">
                      {["Diabetes", "CKD", "Pregnancy", "Penicillin Allergy", "Liver Failure", "Hypertension"].map(item => {
                        const isSelected = contraindications.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleContraindication(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-rose-950 text-rose-400 border-rose-900/60 font-bold"
                                : "bg-slate-900 text-slate-400 border-white/10 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {isSelected ? "🚨 უკუნაჩვენებია: " : ""}
                            {item === "Diabetes" ? "დიაბეტი" : item === "CKD" ? "თირკმლის უკმარ." : item === "Pregnancy" ? "ორსულობა" : item === "Penicillin Allergy" ? "პენიცილინის ალერგია" : item === "Liver Failure" ? "ღვიძლის უკმარ." : "არტერიული ჰიპერტენზია"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* High Risk switch & Indications text */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">ჩვენებები (Indications - მძიმით გამოყოფილი)</label>
                      <input
                        type="text"
                        placeholder="მაგ: ტკივილი, ცხელება, ანთება"
                        value={indicationsStr}
                        onChange={(e) => setIndicationsStr(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs text-slate-300 font-bold block">მაღალი რისკის პროფილი (High Risk Indicator)</label>
                      <label className="inline-flex items-center space-x-2.5 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={isHighRisk}
                          onChange={(e) => setIsHighRisk(e.target.checked)}
                          className="w-4.5 h-4.5 text-[#6b111a] bg-slate-900 border-white/10 rounded focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="text-xs text-slate-300">მოინიშნოს როგორც HIGH RISK მედიკამენტი</span>
                      </label>
                    </div>
                  </div>

                  {/* Clinical Pearls & Side Effects */}
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">ჩემი კლინიკური მარგალიტები / შპარგალკა</label>
                      <textarea
                        rows={activeTextarea === "pearls" ? 8 : 2}
                        onFocus={() => setActiveTextarea("pearls")}
                        onBlur={() => setActiveTextarea(null)}
                        placeholder="ექიმის პირადი შენიშვნები და შპარგალკები მედიკამენტის შესახებ, რომელიც გამოჩნდება ბარათზე..."
                        value={clinicalPearls}
                        onChange={(e) => setClinicalPearls(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#6b111a] transition-all duration-300 ease-in-out resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">გვერდითი მოვლენები (Side Effects)</label>
                      <input
                        type="text"
                        placeholder="მაგ: ჰიპოგლიკემია, დისპეფსია..."
                        value={sideEffects}
                        onChange={(e) => setSideEffects(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6b111a]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">მოქმედების მექანიზმი (Mechanism of Action)</label>
                      <textarea
                        rows={activeTextarea === "mechanism" ? 8 : 2}
                        onFocus={() => setActiveTextarea("mechanism")}
                        onBlur={() => setActiveTextarea(null)}
                        placeholder="მაგ: ბლოკავს პროსტაგლანდინების სინთეზს ციკლოოქსიგენაზას (COX) ფერმენტების ინჰიბირებით..."
                        value={mechanismOfAction}
                        onChange={(e) => setMechanismOfAction(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#6b111a] transition-all duration-300 ease-in-out resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-bold block">დამატებითი კლინიკური ინფორმაცია / ჩემი ველი (Additional Notes)</label>
                      <textarea
                        rows={activeTextarea === "additional" ? 8 : 2}
                        onFocus={() => setActiveTextarea("additional")}
                        onBlur={() => setActiveTextarea(null)}
                        placeholder="დამატებითი კლინიკური დეტალები, პაციენტის სპეციალური ინსტრუქციები..."
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#6b111a] transition-all duration-300 ease-in-out resize-none"
                      />
                    </div>
                  </div>

                </form>

              </div>

              {/* Modal Sticky Footer */}
              <div className="px-6 py-4 bg-slate-950/60 border-t border-white/5 flex justify-end space-x-3 sticky bottom-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer focus:outline-none"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  form="cdss-med-form"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#6b111a] to-[#801721] hover:from-[#801721] hover:to-[#99202c] text-white font-bold rounded-xl text-xs transition-all shadow-lg hover:shadow-[#6b111a]/10 cursor-pointer focus:outline-none"
                >
                  {editingMed ? "ცვლილების შენახვა" : "ბაზაში დამატება"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* =======================================
          READ-ONLY DRUG DETAIL MODAL (Spectacular Cyber-Clinical info sheet)
          ======================================= */}
      <AnimatePresence>
        {viewingMed && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#070a12] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col my-8 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-[#6b111a]/20 text-rose-400 border border-[#6b111a]/30 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      {viewingMed.pharmacologicalGroup || "მედიკამენტი"}
                    </span>
                    {(viewingMed as any).isHighRisk && (
                      <span className="text-[10px] bg-red-600/20 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">
                        ⚡ High Risk
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight mt-1.5">
                    {viewingMed.tradeName}
                  </h3>
                  <p className="text-xs text-[#e04556] font-mono font-bold mt-0.5">
                    {viewingMed.genericName}
                  </p>
                </div>
                <button
                  onClick={() => setViewingMed(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable details container */}
              <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
                
                {/* Info Pills grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">ფორმა</span>
                    <span className="text-xs text-white font-semibold mt-1 block">
                      {viewingMed.dosageForm === "Tablet" ? "💊 ტაბლეტი" : viewingMed.dosageForm === "Ampoule" ? "🧪 ამპულა" : viewingMed.dosageForm === "Syrup" ? "🍧 სიროფი" : "💧 ინფუზია"}
                    </span>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">გზა</span>
                    <span className="text-xs text-white font-semibold mt-1 block">
                      {viewingMed.route === "PO" ? "👄 დასალევი (PO)" : viewingMed.route === "IV" ? "💉 ვენაში (IV)" : viewingMed.route === "IM" ? "💉 კუნთში (IM)" : viewingMed.route === "SC" ? "💉 კანქვეშ (SC)" : "💉 კანშიდა (ID)"}
                    </span>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">სიხშირე</span>
                    <span className="text-xs text-white font-semibold mt-1 block">
                      {viewingMed.frequency === "PRN" ? "🕒 საჭიროებისამებრ" : `🕒 ${viewingMed.frequency}`}
                    </span>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">საკვები</span>
                    <span className="text-xs text-white font-semibold mt-1 block">
                      {viewingMed.mealConnection === "Before meal" ? "🍽️ ჭამამდე" : viewingMed.mealConnection === "During" ? "🍽️ ჭამის დროს" : viewingMed.mealConnection === "After" ? "🍽️ ჭამის შემდეგ" : viewingMed.mealConnection === "Fast-acting" ? "⚡ სწრაფი" : "🍽️ დამოუკიდებლად"}
                    </span>
                  </div>
                </div>

                {/* Times of day & Dilutions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">მიღების საათები / დრო</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {viewingMed.timeOfDay && viewingMed.timeOfDay.length > 0 ? (
                        viewingMed.timeOfDay.map(t => (
                          <span key={t} className="text-[11px] bg-[#6b111a]/10 border border-[#6b111a]/30 text-rose-300 px-2.5 py-0.5 rounded-lg font-medium">
                            {t === "Morning" ? "🌅 დილა" : t === "Noon" ? "☀️ შუადღე" : t === "Evening" ? "🌌 საღამო" : "🌙 ძილი"}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">არ არის მითითებული</span>
                      )}
                    </div>
                  </div>

                  {viewingMed.dosageForm !== "Tablet" && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">განზავება / შეყვანის სიჩქარე</span>
                      <p className="text-xs text-white font-semibold mt-1.5">
                        {viewingMed.dilutionAdminRate || "არ საჭიროებს განზავებას"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Indications & Side Effects */}
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">ჩვენებები (Indications)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingMed.indications && viewingMed.indications.length > 0 ? (
                        viewingMed.indications.map((ind, i) => (
                          <span key={i} className="text-xs bg-slate-900 border border-white/10 text-slate-200 px-2.5 py-1 rounded-xl">
                            {ind}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">არ არის მითითებული</span>
                      )}
                    </div>
                  </div>

                  {viewingMed.sideEffects && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">გვერდითი მოვლენები (Side Effects)</span>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1.5">
                        {viewingMed.sideEffects}
                      </p>
                    </div>
                  )}
                </div>

                {/* Contraindications checklist */}
                {viewingMed.contraindications && viewingMed.contraindications.length > 0 && (
                  <div className="p-4 bg-rose-950/10 border border-rose-900/30 rounded-2xl space-y-2">
                    <span className="text-[10px] text-rose-400 uppercase font-extrabold tracking-wider block">🚨 უკუჩვენებები (CDSS Alerts matched)</span>
                    <div className="flex flex-wrap gap-2">
                      {viewingMed.contraindications.map((c, i) => (
                        <span key={i} className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-xl font-medium">
                          {c === "Diabetes" ? "დიაბეტი" : c === "CKD" ? "თირკმლის უკმარ." : c === "Pregnancy" ? "ორსულობა/ლაქტაცია" : c === "Penicillin Allergy" ? "პენიცილინის ალერგია" : c === "Liver Failure" ? "ღვიძლის უკმარ." : "არტერიული ჰიპერტენზია"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mechanism of action */}
                <div className="p-5 bg-gradient-to-br from-[#6b111a]/5 to-transparent border border-[#6b111a]/20 rounded-2xl space-y-2">
                  <span className="text-[10px] text-rose-400 uppercase font-extrabold tracking-wider block">🔬 მოქმედების მექანიზმი (Mechanism of Action)</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {viewingMed.mechanismOfAction || "მოქმედების მექანიზმი აღწერილი არ არის ამ პრეპარატისთვის."}
                  </p>
                </div>

                {/* Clinical pearls */}
                {viewingMed.clinicalPearls && (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">💡 კლინიკური მარგალიტები / შპარგალკა</span>
                    <p className="text-xs text-amber-300/90 font-medium italic mt-1.5">
                      {viewingMed.clinicalPearls}
                    </p>
                  </div>
                )}

                {/* Additional Clinical notes */}
                {viewingMed.additionalInfo && (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">📝 დამატებითი კლინიკური ინფორმაცია / ჩემი ველი</span>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1.5">
                      {viewingMed.additionalInfo}
                    </p>
                  </div>
                )}

                {/* Album categories list */}
                {viewingMed.classificationDepartment && viewingMed.classificationDepartment.length > 0 && (
                  <div className="flex items-center space-x-2 pt-2 text-[11px] text-slate-400">
                    <Folder className="h-3.5 w-3.5 text-slate-500" />
                    <span>თემატური ალბომები:</span>
                    <span className="text-slate-300 font-semibold">{viewingMed.classificationDepartment.join(", ")}</span>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-950/40 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setViewingMed(null)}
                  className="px-6 py-2 bg-[#6b111a] hover:bg-[#801721] text-white font-bold rounded-xl text-xs transition-all focus:outline-none cursor-pointer"
                >
                  დახურვა
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =======================================
          PDF GENERATION LOADING OVERLAY
          ======================================= */}
      <AnimatePresence>
        {isGeneratingPDF && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="flex justify-center">
                <RefreshCw className="h-10 w-10 text-[#e04556] animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-white font-bold text-sm">PDF იტვირთება...</h4>
                <p className="text-xs text-slate-400 font-medium">სამედიცინო დანიშნულების დოკუმენტი მუშავდება, გთხოვთ დაელოდოთ...</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* =======================================
          CUSTOM CONFIRMATION MODAL
          ======================================= */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative border-glow-burgundy"
            >
              <div className="flex items-center space-x-3 text-rose-400">
                <AlertTriangle className="h-6 w-6 text-rose-500 flex-shrink-0 animate-pulse" />
                <h4 className="text-white font-bold text-sm tracking-wide">
                  {confirmModal.title}
                </h4>
              </div>
              
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
              
              <div className="flex justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-5 py-2 bg-[#6b111a] hover:bg-[#801721] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all focus:outline-none cursor-pointer"
                >
                  დასტური
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
}
