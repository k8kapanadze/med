/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PatientProfile {
  diabetes: boolean;
  hypertension: boolean;
  ckd: boolean;
  egfr: "none" | "gt60" | "30to60" | "lt30";
  liverFailure: boolean;
  pregnancy: boolean;
  penicillinAllergy: boolean;
  potassium: number | null; // Serum Potassium (K+) level input field
}

export type Department = "ER/Resuscitation" | "Endocrinology" | "Cardiology" | "Pediatrics" | "General";
export type Route = "IV" | "IM" | "PO" | "SC" | "ID";
export type DosageForm = "Tablet" | "Ampoule" | "Syrup" | "Infusion";
export type Frequency = "1x" | "2x" | "3x" | "4x" | "PRN" | "Continuous Infusion";
export type MealConnection = "Fast-acting" | "Before meal" | "During" | "After" | "Independent";
export type TimeOfDay = "Morning" | "Noon" | "Evening" | "Bedtime";

export interface Medication {
  id: string;
  tradeName: string; // სავაჭრო სახელი
  genericName: string; // გენერიკული სახელი
  classificationDepartment: Department[]; // დეპარტამენტი
  pharmacologicalGroup: string; // ფარმაკოლოგიური ჯგუფი
  route: Route; // მიღების გზა
  dosageForm: DosageForm; // დოზირების ფორმა
  dilutionAdminRate: string; // განზავება და შეყვანის სიჩქარე
  frequency: Frequency; // სიხშირე
  mealConnection: MealConnection; // კავშირი საკვებთან
  timeOfDay: TimeOfDay[]; // დღის მონაკვეთი
  indications: string[]; // ჩვენებები
  contraindications: string[]; // უკუჩვენებები (e.g. "Diabetes", "CKD", "Pregnancy", "Penicillin Allergy")
  sideEffects: string; // გვერდითი მოვლენები
  clinicalPearls: string; // ჩემი კლინიკური მარგალიტები / შპარგალკა
  mechanismOfAction?: string; // მოქმედების მექანიზმი
  additionalInfo?: string; // დამატებითი კლინიკური ჩანაწერები / ჩემი ველი
  isFavorite: boolean;
  price?: number;
  source?: "Aversi" | "PSP" | "Custom";
}

export interface SyncDrugResult {
  tradeName: string;
  genericName: string;
  dosageForm: string;
  price?: number;
  source: "Aversi" | "PSP";
}
