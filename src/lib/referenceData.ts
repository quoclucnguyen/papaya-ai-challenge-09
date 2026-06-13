import type { ClaimType, Country } from './types';

/** 20 mã ICD-10 phổ biến, gắn với claim type hợp lệ + trọng số xuất hiện (không đều → top-10 có hình dạng). */
export interface Icd10Entry {
  code: string;
  description: string;
  claimTypes: ClaimType[];
  weight: number;
}

export const ICD10_CODES: Icd10Entry[] = [
  { code: 'J06.9', description: 'Acute upper respiratory infection', claimTypes: ['OUTPATIENT'], weight: 18 },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis', claimTypes: ['OUTPATIENT', 'INPATIENT'], weight: 12 },
  { code: 'I10', description: 'Essential (primary) hypertension', claimTypes: ['OUTPATIENT'], weight: 11 },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', claimTypes: ['OUTPATIENT', 'INPATIENT'], weight: 10 },
  { code: 'M54.5', description: 'Low back pain', claimTypes: ['OUTPATIENT'], weight: 9 },
  { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', claimTypes: ['OUTPATIENT', 'INPATIENT'], weight: 7 },
  { code: 'N39.0', description: 'Urinary tract infection', claimTypes: ['OUTPATIENT', 'INPATIENT'], weight: 6 },
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', claimTypes: ['OUTPATIENT'], weight: 6 },
  { code: 'H10.9', description: 'Unspecified conjunctivitis', claimTypes: ['OUTPATIENT'], weight: 5 },
  { code: 'L30.9', description: 'Dermatitis, unspecified', claimTypes: ['OUTPATIENT'], weight: 5 },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', claimTypes: ['INPATIENT'], weight: 8 },
  { code: 'K35.80', description: 'Unspecified acute appendicitis', claimTypes: ['INPATIENT'], weight: 5 },
  { code: 'S72.001A', description: 'Fracture of unspecified part of neck of femur', claimTypes: ['INPATIENT'], weight: 3 },
  { code: 'A90', description: 'Dengue fever (classical dengue)', claimTypes: ['INPATIENT', 'OUTPATIENT'], weight: 6 },
  { code: 'K02.9', description: 'Dental caries, unspecified', claimTypes: ['DENTAL'], weight: 10 },
  { code: 'K05.10', description: 'Chronic gingivitis, plaque induced', claimTypes: ['DENTAL'], weight: 7 },
  { code: 'K04.7', description: 'Periapical abscess without sinus', claimTypes: ['DENTAL'], weight: 5 },
  { code: 'K08.9', description: 'Disorder of teeth and supporting structures', claimTypes: ['DENTAL'], weight: 4 },
  { code: 'O80', description: 'Encounter for full-term uncomplicated delivery', claimTypes: ['MATERNITY'], weight: 8 },
  { code: 'O82', description: 'Encounter for cesarean delivery without indication', claimTypes: ['MATERNITY'], weight: 5 },
];

export const INSURERS = ['AIA Insurance', 'Prudential Life', 'FWD Group'] as const;

export const ASSESSORS = [
  'Somchai Wattana',
  'Nguyen Thi Lan',
  'Wong Ka Ming',
  'Pranee Srisuwan',
  'Tran Van Minh',
] as const;

/** Tên theo nước để member_name nhìn realistic. */
export const NAME_POOLS: Record<Country, { first: string[]; last: string[] }> = {
  Thailand: {
    first: ['Somchai', 'Pranee', 'Anong', 'Kittisak', 'Malee', 'Niran', 'Siriporn', 'Chaiwat', 'Kanya', 'Prasert'],
    last: ['Wattana', 'Srisuwan', 'Chaiyasit', 'Thongdee', 'Rattanaporn', 'Saetang', 'Boonmee', 'Phongpanich'],
  },
  Vietnam: {
    first: ['Nguyen Van An', 'Tran Thi Mai', 'Le Minh Tuan', 'Pham Thu Huong', 'Hoang Duc Thang', 'Vu Ngoc Anh', 'Dang Quoc Bao', 'Bui Thanh Ha', 'Do Van Long', 'Ngo Thi Thu'],
    last: [''],
  },
  'Hong Kong': {
    first: ['Ka Ming', 'Siu Fung', 'Wai Yan', 'Chi Keung', 'Mei Ling', 'Ho Yin', 'Tsz Ching', 'Kwok Wah', 'Yuen Man', 'Sau Lan'],
    last: ['Wong', 'Chan', 'Lee', 'Cheung', 'Lau', 'Ng', 'Ho', 'Leung'],
  },
};
