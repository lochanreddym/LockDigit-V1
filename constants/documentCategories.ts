export interface DocumentType {
  id: string;
  label: string;
  requiresState?: boolean;
}

export interface SubSection {
  title: string;
  items: DocumentType[];
}

export interface DocumentCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  subSections: SubSection[];
}

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "AS", name: "American Samoa" },
  { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
] as const;

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "government_ids",
    label: "Government IDs",
    icon: "id-card-outline",
    color: "#0A84FF",
    subSections: [
      {
        title: "Primary Photo Identity",
        items: [
          { id: "drivers_license", label: "Driver's License (REAL ID / Standard)", requiresState: true },
          { id: "state_id", label: "State ID / Non-Driver ID", requiresState: true },
          { id: "enhanced_dl", label: "Enhanced Driver's License (EDL)", requiresState: true },
          { id: "us_passport_book", label: "U.S. Passport (Book)" },
          { id: "us_passport_card", label: "U.S. Passport Card" },
        ],
      },
      {
        title: "Immigration / Residency",
        items: [
          { id: "green_card", label: "Permanent Resident Card (Green Card)" },
          { id: "ead", label: "Employment Authorization Document (EAD)" },
          { id: "i94", label: "I-94 Arrival / Departure Record" },
        ],
      },
      {
        title: "Federal / Security IDs",
        items: [
          { id: "trusted_traveler", label: "Trusted Traveler Card (Global Entry, NEXUS, SENTRI, FAST)" },
          { id: "twic", label: "TWIC (Transportation Worker Identification Credential)" },
          { id: "tribal_id", label: "Tribal Government Photo ID" },
        ],
      },
      {
        title: "Military",
        items: [
          { id: "military_id", label: "Uniformed Services ID / CAC" },
          { id: "military_dependent_id", label: "Military Dependent ID" },
        ],
      },
      {
        title: "Firearms & Permits",
        items: [
          { id: "concealed_carry", label: "Concealed Carry Permit / Firearms License", requiresState: true },
        ],
      },
    ],
  },
  {
    id: "industry_private",
    label: "Industry & Private",
    icon: "business-outline",
    color: "#30D158",
    subSections: [
      {
        title: "Employment & Corporate",
        items: [
          { id: "employee_id", label: "Employee ID Card" },
          { id: "contractor_badge", label: "Contractor / Vendor Badge" },
          { id: "building_access", label: "Building Access Card" },
        ],
      },
      {
        title: "Insurance & Membership",
        items: [
          { id: "health_insurance_member", label: "Health Insurance Member Card" },
          { id: "dental_insurance", label: "Dental Insurance Card" },
          { id: "vision_insurance", label: "Vision Insurance Card" },
          { id: "life_insurance", label: "Life Insurance Policy ID" },
        ],
      },
      {
        title: "Professional Bodies",
        items: [
          { id: "association_membership", label: "Association Membership Card (IEEE, PMI, AMA, etc.)" },
          { id: "union_membership", label: "Union Membership Card" },
        ],
      },
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: "school-outline",
    color: "#5E5CE6",
    subSections: [
      {
        title: "Academic Identity",
        items: [
          { id: "student_id", label: "Student ID Card" },
          { id: "faculty_staff_id", label: "Faculty / Staff ID" },
        ],
      },
      {
        title: "Enrollment & Records",
        items: [
          { id: "enrollment_letter", label: "Enrollment Verification Letter" },
          { id: "transcript", label: "Transcript" },
          { id: "degree_diploma", label: "Degree / Diploma Certificate" },
        ],
      },
      {
        title: "International Students",
        items: [
          { id: "i20", label: "I-20 (F-1)" },
          { id: "ds2019", label: "DS-2019 (J-1)" },
        ],
      },
      {
        title: "Learning Platforms",
        items: [
          { id: "certification_id", label: "Certification IDs (Coursera, AWS, Cisco, Microsoft, Google)" },
        ],
      },
    ],
  },
  {
    id: "government_public",
    label: "Government & Public",
    icon: "flag-outline",
    color: "#FF9500",
    subSections: [
      {
        title: "Benefits & Welfare",
        items: [
          { id: "medicare", label: "Medicare Card" },
          { id: "medicaid", label: "Medicaid Card", requiresState: true },
          { id: "snap_ebt", label: "SNAP / EBT Card", requiresState: true },
          { id: "wic", label: "WIC Card", requiresState: true },
        ],
      },
      {
        title: "Veterans & Social Programs",
        items: [
          { id: "va_health_id", label: "VA Health ID Card" },
          { id: "ss_benefit_letter", label: "Social Security Benefit Award Letter" },
        ],
      },
      {
        title: "Housing & Public Services",
        items: [
          { id: "public_housing_id", label: "Public Housing ID / Voucher" },
          { id: "state_benefit_card", label: "State Benefit Program Card", requiresState: true },
        ],
      },
      {
        title: "Civic",
        items: [
          { id: "voter_registration", label: "Voter Registration Card", requiresState: true },
        ],
      },
    ],
  },
  {
    id: "banking_financial",
    label: "Banking & Financial",
    icon: "card-outline",
    color: "#30D158",
    subSections: [
      {
        title: "Government-Issued Financial Identity",
        items: [
          { id: "ssn", label: "Social Security Number (SSN)" },
          { id: "itin", label: "ITIN (IRS)" },
          { id: "ein", label: "EIN (Business Tax ID)" },
        ],
      },
      {
        title: "Financial Documents",
        items: [
          { id: "bank_proof_letter", label: "Bank Account Proof Letter" },
          { id: "credit_report", label: "Credit Report" },
          { id: "loan_account", label: "Loan Account Number" },
          { id: "mortgage_doc", label: "Mortgage Document" },
          { id: "investment_statement", label: "Investment Account Statement" },
        ],
      },
    ],
  },
  {
    id: "skill_vocational",
    label: "Skill & Vocational",
    icon: "construct-outline",
    color: "#FF3B30",
    subSections: [
      {
        title: "Professional Licenses",
        items: [
          { id: "medical_license", label: "Medical License", requiresState: true },
          { id: "nursing_license", label: "Nursing License", requiresState: true },
          { id: "pharmacy_license", label: "Pharmacy License", requiresState: true },
          { id: "engineering_license", label: "Engineering License", requiresState: true },
          { id: "teaching_license", label: "Teaching License", requiresState: true },
          { id: "bar_license", label: "Bar License (Attorney)", requiresState: true },
          { id: "cpa_license", label: "CPA License (Accountant)", requiresState: true },
          { id: "cosmetology_license", label: "Cosmetology License", requiresState: true },
          { id: "real_estate_license", label: "Real Estate License", requiresState: true },
          { id: "real_estate_appraiser", label: "Real Estate Appraiser License", requiresState: true },
          { id: "insurance_agent_license", label: "Insurance Agent / Broker License", requiresState: true },
          { id: "notary_public", label: "Notary Public Commission", requiresState: true },
          { id: "private_investigator", label: "Private Investigator License", requiresState: true },
        ],
      },
      {
        title: "Trade Licenses",
        items: [
          { id: "electrician_license", label: "Electrician License", requiresState: true },
          { id: "plumber_license", label: "Plumber License", requiresState: true },
          { id: "hvac_license", label: "HVAC License", requiresState: true },
          { id: "contractor_license", label: "Contractor License", requiresState: true },
          { id: "security_guard_license", label: "Security Guard License", requiresState: true },
        ],
      },
      {
        title: "Safety & Work Permits",
        items: [
          { id: "osha_cert", label: "OSHA Certification" },
          { id: "food_handler", label: "Food Handler Permit", requiresState: true },
          { id: "alcohol_service", label: "Alcohol Service Permit", requiresState: true },
        ],
      },
    ],
  },
  {
    id: "ministry_defence",
    label: "Ministry of Defence",
    icon: "shield-outline",
    color: "#5E5CE6",
    subSections: [
      {
        title: "Active / Former Service",
        items: [
          { id: "mod_military_id", label: "Military ID" },
          { id: "veteran_id", label: "Veteran ID" },
          { id: "dd214", label: "DD-214 Discharge Paper" },
        ],
      },
      {
        title: "Dependents",
        items: [
          { id: "dependent_military_id", label: "Dependent Military ID" },
        ],
      },
      {
        title: "Access Credentials",
        items: [
          { id: "base_access_pass", label: "Base Access Pass" },
        ],
      },
    ],
  },
  {
    id: "transport_infrastructure",
    label: "Transport",
    icon: "car-outline",
    color: "#FF9500",
    subSections: [
      {
        title: "Driving & Vehicles",
        items: [
          { id: "transport_dl", label: "Driver's License", requiresState: true },
          { id: "learner_permit", label: "Learner's Permit", requiresState: true },
          { id: "cdl", label: "Commercial Driver License (CDL)", requiresState: true },
        ],
      },
      {
        title: "Vehicle Ownership",
        items: [
          { id: "vehicle_registration", label: "Vehicle Registration", requiresState: true },
          { id: "vehicle_title", label: "Vehicle Title", requiresState: true },
        ],
      },
      {
        title: "Insurance",
        items: [
          { id: "auto_insurance", label: "Auto Insurance Card", requiresState: true },
        ],
      },
      {
        title: "Travel",
        items: [
          { id: "passport_travel", label: "Passport" },
          { id: "trusted_traveler_travel", label: "Trusted Traveler Card" },
        ],
      },
    ],
  },
  {
    id: "health_wellness",
    label: "Health & Wellness",
    icon: "medkit-outline",
    color: "#FF3B30",
    subSections: [
      {
        title: "Insurance",
        items: [
          { id: "health_insurance", label: "Health Insurance Card" },
          { id: "dental_insurance_hw", label: "Dental Insurance Card" },
          { id: "vision_insurance_hw", label: "Vision Insurance Card" },
        ],
      },
      {
        title: "Medical Records",
        items: [
          { id: "vaccination_record", label: "Vaccination Record" },
          { id: "blood_group_card", label: "Blood Group Card" },
          { id: "organ_donor_card", label: "Organ Donor Card" },
        ],
      },
      {
        title: "Hospital IDs",
        items: [
          { id: "hospital_patient_id", label: "Hospital Patient ID" },
        ],
      },
    ],
  },
  {
    id: "identity_docs",
    label: "Identity Docs",
    icon: "document-text-outline",
    color: "#0A84FF",
    subSections: [
      {
        title: "Universal Across Countries",
        items: [
          { id: "birth_certificate", label: "Birth Certificate", requiresState: true },
          { id: "marriage_certificate", label: "Marriage Certificate", requiresState: true },
          { id: "divorce_decree", label: "Divorce Decree" },
          { id: "name_change_order", label: "Name Change Court Order" },
          { id: "death_certificate", label: "Death Certificate" },
          { id: "naturalization_cert", label: "Naturalization / Citizenship Certificate" },
        ],
      },
    ],
  },
  {
    id: "sports_culture",
    label: "Sports & Culture",
    icon: "trophy-outline",
    color: "#FF9500",
    subSections: [
      {
        title: "Memberships & Passes",
        items: [
          { id: "sports_club", label: "Sports Club Membership Card" },
          { id: "gym_membership", label: "Gym Membership Card" },
          { id: "stadium_pass", label: "Stadium / Season Pass" },
          { id: "museum_membership", label: "Museum Membership Card" },
          { id: "cultural_assoc_id", label: "Cultural Association ID" },
        ],
      },
      {
        title: "Outdoor Licenses",
        items: [
          { id: "hunting_license", label: "Hunting License", requiresState: true },
          { id: "fishing_license", label: "Fishing License", requiresState: true },
          { id: "boating_license", label: "Boating License / Safety Card", requiresState: true },
        ],
      },
    ],
  },
  {
    id: "national_service",
    label: "National Service",
    icon: "people-outline",
    color: "#5E5CE6",
    subSections: [
      {
        title: "Public Service",
        items: [
          { id: "volunteer_id", label: "Volunteer ID Card" },
          { id: "community_service_cert", label: "Community Service Certificate" },
          { id: "americorps_id", label: "AmeriCorps Service ID / Letter" },
        ],
      },
      {
        title: "Youth / Service Programs",
        items: [
          { id: "service_participation_cert", label: "Service Participation Certificate" },
        ],
      },
    ],
  },
];
