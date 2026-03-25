import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hashPassword, validatePasswordStrength, verifyPassword } from './utils/password';
import { sanitizeEmail, sanitizeNumeric, sanitizePhone, sanitizeText } from './utils/security';
import { fetchSnapshot, isServerSyncEnabled, postWhatsAppSend, debouncedPushSnapshot } from './lib/api';
import { reviveDeep } from './lib/reviveDates';
import { dbService } from './lib/db-service';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'employee';
  phone?: string;
  avatar?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  employee_code?: string;
  department?: string;
  join_date?: Date;
  bio?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: Date;
  gender?: string;
  occupation?: string;
  annual_income?: number;
  address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'deleted';
  assigned_to?: string;
  risk_score?: number;
  notes?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerPolicy {
  id: string;
  customer_id: string;
  tenant_id: string;
  policy_type: string;
  policy_number: string;
  insurer: string;
  sum_assured?: number;
  premium_amount?: number;
  premium_frequency?: string;
  start_date?: Date;
  end_date?: Date;
  status: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  customer_id: string;
  tenant_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  is_camera_capture: boolean;
  created_at: Date;
}

export interface Claim {
  id: string;
  policy_id: string;
  customer_id?: string;
  tenant_id: string;
  claim_number: string;
  claim_type: string;
  incident_date: Date;
  claim_amount: number;
  status: 'Filed' | 'Review' | 'Approved' | 'Settled' | 'Closed';
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Lead {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  email?: string;
  source?: string;
  policy_interest?: string;
  status: 'New' | 'Contacted' | 'Meeting' | 'Proposal' | 'Closed' | 'deleted';
  assigned_to?: string;
  notes?: string;
  next_followup?: Date;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  tenant_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  created_at: Date;
}

export interface Commission {
  id: string;
  policy_id: string;
  tenant_id: string;
  employee_id: string;
  commission_rate: number;
  commission_amount: number;
  is_paid: boolean;
  paid_date?: Date;
  due_date?: Date;
  created_at: Date;
}

export interface Renewal {
  id: string;
  policy_id: string;
  tenant_id: string;
  renewal_type?: 'date' | 'monthly';
  renewal_date: Date;
  renewal_month?: number;
  renewal_day?: number;
  next_renewal_date?: Date;
  status: 'pending' | 'completed' | 'cancelled';
  notified: boolean;
  notified_at?: Date;
  processed: boolean;
  processed_at?: Date;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface FamilyMember {
  id: string;
  customer_id: string;
  tenant_id: string;
  full_name: string;
  relationship: string;
  date_of_birth?: Date;
  phone?: string;
  email?: string;
  has_policy: boolean;
  policy_id?: string;
  created_at: Date;
}

export interface Endorsement {
  id: string;
  policy_id: string;
  tenant_id: string;
  endorsement_type: string;
  description: string;
  effective_date?: Date;
  premium_change?: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
}

export interface ComplianceReport {
  id: string;
  tenant_id: string;
  report_type: string;
  period_start: Date;
  period_end: Date;
  data?: string;
  status: 'draft' | 'submitted' | 'approved';
  submitted_at?: Date;
  created_at: Date;
}

export interface KnowledgeArticle {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
  faqs?: Array<{ q: string; a: string }>;
  view_count: number;
  helpful_count?: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AppSettings {
  id: string;
  tenant_id: string;
  app_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  whatsapp_number?: string;
  agency_email?: string;
  agency_address?: string;
  irdai_license?: string;
  // WhatsApp automation settings (optional to keep backward compatibility with older snapshots)
  whatsapp_automation_enabled?: boolean;
  whatsapp_birthday_enabled?: boolean;
  whatsapp_renewal_enabled?: boolean;
  whatsapp_birthday_template?: string;
  whatsapp_renewal_template?: string;
  is_dark_mode: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Employee {
  id: string;
  tenant_id: string;
  profile: Profile;
  email: string;
  role: 'employee';
  is_active: boolean;
  created_at: Date;
}

export type Page =
  | 'login'
  | 'owner-dashboard'
  | 'employee-dashboard'
  | 'approvals'
  | 'customers'
  | 'employees'
  | 'audit-logs'
  | 'new-customer'
  | 'knowledge-base'
  | 'claims'
  | 'leads'
  | 'renewals'
  | 'commissions'
  | 'documents'
  | 'family-tree'
  | 'analytics'
  | 'compliance'
  | 'settings'
  | 'profile'
  | 'policy-assistant';

// ─── DEMO DATA ────────────────────────────────────────────────────────────────

const DEMO_TENANTS: Tenant[] = [
  {
    id: 'tenant_001',
    name: 'UV Owner',
    email: 'uvmarketsignal@gmail.com',
    password: hashPassword('UV@Owner2025'),
    role: 'owner',
    phone: '+919876543210',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=UV&backgroundColor=b6e3f4',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date(),
  },
  {
    id: 'tenant_002',
    name: 'Vasu Siva',
    email: 'vasusiva78@gmail.com',
    password: hashPassword('Vasu@Emp2025'),
    role: 'employee',
    phone: '+919876543211',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VasuSiva&backgroundColor=c0aede',
    is_active: true,
    created_at: new Date('2024-01-02'),
    updated_at: new Date(),
  },
  {
    id: 'tenant_003',
    name: 'Vasu',
    email: 'vasu@uvinsurance.in',
    password: hashPassword('Vasu@Emp2025'),
    role: 'employee',
    phone: '+919876543212',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vasu&backgroundColor=ffdfbf',
    is_active: true,
    created_at: new Date('2024-01-03'),
    updated_at: new Date(),
  },
];

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 'cus_001', tenant_id: 'tenant_001', full_name: 'Rajesh Kumar', phone: '+919876543220', email: 'rajesh@example.com', date_of_birth: new Date('1985-03-15'), gender: 'Male', occupation: 'Business', annual_income: 800000, address: '123 MG Road, Bangalore', status: 'approved', assigned_to: 'emp_001', risk_score: 35, created_at: new Date('2024-01-10'), updated_at: new Date() },
  { id: 'cus_002', tenant_id: 'tenant_001', full_name: 'Priya Sharma', phone: '+919876543221', email: 'priya@example.com', date_of_birth: new Date('1990-07-22'), gender: 'Female', occupation: 'Software Engineer', annual_income: 1200000, address: '456 Brigade Road, Bangalore', status: 'pending', assigned_to: 'emp_001', risk_score: 25, created_at: new Date('2024-01-11'), updated_at: new Date() },
  { id: 'cus_003', tenant_id: 'tenant_001', full_name: 'Mohammed Farhan', phone: '+919876543222', email: 'farhan@example.com', date_of_birth: new Date('1978-11-30'), gender: 'Male', occupation: 'Doctor', annual_income: 2500000, address: '789 Koramangala, Bangalore', status: 'approved', assigned_to: 'emp_002', risk_score: 20, created_at: new Date('2024-01-12'), updated_at: new Date() },
  { id: 'cus_004', tenant_id: 'tenant_001', full_name: 'Lakshmi Devi', phone: '+919876543223', email: 'lakshmi@example.com', date_of_birth: new Date('1992-05-18'), gender: 'Female', occupation: 'Teacher', annual_income: 450000, address: '321 Indiranagar, Bangalore', status: 'pending', assigned_to: 'emp_001', risk_score: 45, created_at: new Date('2024-01-13'), updated_at: new Date() },
  { id: 'cus_005', tenant_id: 'tenant_001', full_name: 'Arjun Nair', phone: '+919876543224', email: 'arjun@example.com', date_of_birth: new Date('1988-09-25'), gender: 'Male', occupation: 'Engineer', annual_income: 950000, address: '654 HSR Layout, Bangalore', status: 'approved', assigned_to: 'emp_002', risk_score: 30, created_at: new Date('2024-01-14'), updated_at: new Date() },
  { id: 'cus_006', tenant_id: 'tenant_001', full_name: 'Kavitha Reddy', phone: '+919876543225', email: 'kavitha@example.com', date_of_birth: new Date('1995-12-10'), gender: 'Female', occupation: 'Entrepreneur', annual_income: 600000, address: '987 Whitefield, Bangalore', status: 'rejected', assigned_to: 'emp_001', risk_score: 65, created_at: new Date('2024-01-15'), updated_at: new Date() },
  { id: 'cus_007', tenant_id: 'tenant_001', full_name: 'Suresh Babu', phone: '+919876543226', email: 'suresh@example.com', date_of_birth: new Date('1975-04-08'), gender: 'Male', occupation: 'Retired', annual_income: 300000, address: '111 Jayanagar, Bangalore', status: 'changes_requested', assigned_to: 'emp_002', risk_score: 55, created_at: new Date('2024-01-16'), updated_at: new Date() },
  { id: 'cus_008', tenant_id: 'tenant_001', full_name: 'Anitha Pillai', phone: '+919876543227', email: 'anitha@example.com', date_of_birth: new Date('1983-08-14'), gender: 'Female', occupation: 'Nurse', annual_income: 380000, address: '222 JP Nagar, Bangalore', status: 'approved', assigned_to: 'emp_001', risk_score: 40, created_at: new Date('2024-01-17'), updated_at: new Date() },
  { id: 'cus_009', tenant_id: 'tenant_001', full_name: 'Ramesh Chandra', phone: '+919876543228', email: 'ramesh@example.com', date_of_birth: new Date('1970-01-20'), gender: 'Male', occupation: 'Farmer', annual_income: 180000, address: '333 Electronic City, Bangalore', status: 'pending', assigned_to: 'emp_002', risk_score: 70, created_at: new Date('2024-01-18'), updated_at: new Date() },
  { id: 'cus_010', tenant_id: 'tenant_001', full_name: 'Deepa Menon', phone: '+919876543229', email: 'deepa@example.com', date_of_birth: new Date('1987-06-30'), gender: 'Female', occupation: 'CA', annual_income: 1500000, address: '444 Marathahalli, Bangalore', status: 'approved', assigned_to: 'emp_001', risk_score: 15, created_at: new Date('2024-01-19'), updated_at: new Date() },
];

const SAMPLE_POLICIES: CustomerPolicy[] = [
  { id: 'pol_001', customer_id: 'cus_001', tenant_id: 'tenant_001', policy_type: 'motor', policy_number: 'MTR-2024-001', insurer: 'ICICI Lombard', sum_assured: 500000, premium_amount: 15000, premium_frequency: 'Annual', start_date: new Date('2024-01-01'), end_date: new Date('2025-01-01'), status: 'Active', metadata: { motor_subtype: 'Comprehensive', vehicle_number: 'KA01AB1234', make_model: 'Maruti Swift' }, created_at: new Date('2024-01-01'), updated_at: new Date() },
  { id: 'pol_002', customer_id: 'cus_002', tenant_id: 'tenant_001', policy_type: 'health', policy_number: 'HLT-2024-002', insurer: 'Star Health', sum_assured: 1000000, premium_amount: 18000, premium_frequency: 'Annual', start_date: new Date('2024-02-01'), end_date: new Date('2025-02-01'), status: 'Active', metadata: { plan_type: 'Family Floater', members: 3, height: '165', weight: '62', blood_group: 'O+' }, created_at: new Date('2024-02-01'), updated_at: new Date() },
  { id: 'pol_003', customer_id: 'cus_003', tenant_id: 'tenant_001', policy_type: 'life', policy_number: 'LIF-2024-003', insurer: 'LIC India', sum_assured: 5000000, premium_amount: 45000, premium_frequency: 'Annual', start_date: new Date('2024-01-15'), end_date: new Date('2044-01-15'), status: 'Active', metadata: { nominee_name: 'Fatima Farhan', nominee_relation: 'Spouse', height: '175', weight: '80', blood_group: 'B+' }, created_at: new Date('2024-01-15'), updated_at: new Date() },
  { id: 'pol_004', customer_id: 'cus_005', tenant_id: 'tenant_001', policy_type: 'term', policy_number: 'TRM-2024-004', insurer: 'HDFC Life', sum_assured: 10000000, premium_amount: 12000, premium_frequency: 'Annual', start_date: new Date('2024-03-01'), end_date: new Date('2054-03-01'), status: 'Active', metadata: { policy_term: 30, return_of_premium: false, nominee_name: 'Meera Nair' }, created_at: new Date('2024-03-01'), updated_at: new Date() },
  { id: 'pol_005', customer_id: 'cus_008', tenant_id: 'tenant_001', policy_type: 'travel', policy_number: 'TRV-2024-005', insurer: 'Bajaj Allianz', sum_assured: 2000000, premium_amount: 3500, premium_frequency: 'One-time', start_date: new Date('2024-06-01'), end_date: new Date('2025-06-01'), status: 'Active', metadata: { destination: 'USA', trip_type: 'Single', duration: 30 }, created_at: new Date('2024-06-01'), updated_at: new Date() },
  { id: 'pol_006', customer_id: 'cus_010', tenant_id: 'tenant_001', policy_type: 'home', policy_number: 'HOM-2024-006', insurer: 'New India Assurance', sum_assured: 3000000, premium_amount: 8000, premium_frequency: 'Annual', start_date: new Date('2024-04-01'), end_date: new Date('2025-04-01'), status: 'Active', metadata: { property_type: 'Apartment', area_sqft: 1200, construction_year: 2018 }, created_at: new Date('2024-04-01'), updated_at: new Date() },
];

const SAMPLE_CLAIMS: Claim[] = [
  { id: 'clm_001', policy_id: 'pol_001', customer_id: 'cus_001', tenant_id: 'tenant_001', claim_number: 'CLM-2024-001', claim_type: 'Accident', incident_date: new Date('2024-06-10'), claim_amount: 85000, status: 'Review', description: 'Vehicle accident on highway, front bumper damage', created_at: new Date('2024-06-12'), updated_at: new Date() },
  { id: 'clm_002', policy_id: 'pol_002', customer_id: 'cus_002', tenant_id: 'tenant_001', claim_number: 'CLM-2024-002', claim_type: 'Hospitalization', incident_date: new Date('2024-07-05'), claim_amount: 120000, status: 'Approved', description: 'Emergency appendicitis surgery', created_at: new Date('2024-07-06'), updated_at: new Date() },
  { id: 'clm_003', policy_id: 'pol_003', customer_id: 'cus_003', tenant_id: 'tenant_001', claim_number: 'CLM-2024-003', claim_type: 'Critical Illness', incident_date: new Date('2024-08-15'), claim_amount: 500000, status: 'Settled', description: 'Heart bypass surgery claim', created_at: new Date('2024-08-16'), updated_at: new Date() },
  { id: 'clm_004', policy_id: 'pol_005', customer_id: 'cus_008', tenant_id: 'tenant_001', claim_number: 'CLM-2024-004', claim_type: 'Travel Emergency', incident_date: new Date('2024-09-01'), claim_amount: 45000, status: 'Filed', description: 'Medical emergency during travel', created_at: new Date('2024-09-02'), updated_at: new Date() },
];

const SAMPLE_LEADS: Lead[] = [
  { id: 'led_001', tenant_id: 'tenant_001', full_name: 'Kiran Patel', phone: '+919876540001', email: 'kiran@example.com', source: 'Referral', policy_interest: 'health', status: 'New', assigned_to: 'emp_001', notes: 'Interested in family health plan', next_followup: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), created_at: new Date('2024-10-01'), updated_at: new Date() },
  { id: 'led_002', tenant_id: 'tenant_001', full_name: 'Suma Krishnan', phone: '+919876540002', email: 'suma@example.com', source: 'Walk-in', policy_interest: 'motor', status: 'Contacted', assigned_to: 'emp_002', notes: 'Needs comprehensive motor cover', next_followup: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), created_at: new Date('2024-10-02'), updated_at: new Date() },
  { id: 'led_003', tenant_id: 'tenant_001', full_name: 'Ravi Shankar', phone: '+919876540003', email: 'ravi@example.com', source: 'Online', policy_interest: 'term', status: 'Meeting', assigned_to: 'emp_001', notes: 'Meeting scheduled for term plan discussion', next_followup: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), created_at: new Date('2024-10-03'), updated_at: new Date() },
  { id: 'led_004', tenant_id: 'tenant_001', full_name: 'Meena Iyer', phone: '+919876540004', email: 'meena@example.com', source: 'Social Media', policy_interest: 'life', status: 'Proposal', assigned_to: 'emp_002', notes: 'Proposal sent, awaiting response', next_followup: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), created_at: new Date('2024-10-04'), updated_at: new Date() },
  { id: 'led_005', tenant_id: 'tenant_001', full_name: 'Vijay Kumar', phone: '+919876540005', email: 'vijay@example.com', source: 'Referral', policy_interest: 'home', status: 'Closed', assigned_to: 'emp_001', notes: 'Converted to customer', next_followup: undefined, created_at: new Date('2024-10-05'), updated_at: new Date() },
];

const SAMPLE_RENEWALS: Renewal[] = [
  { id: 'ren_001', policy_id: 'pol_001', tenant_id: 'tenant_001', renewal_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'pending', notified: true, processed: false, created_at: new Date('2024-01-01') },
  { id: 'ren_002', policy_id: 'pol_002', tenant_id: 'tenant_001', renewal_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), status: 'pending', notified: false, processed: false, created_at: new Date('2024-02-01') },
  { id: 'ren_003', policy_id: 'pol_003', tenant_id: 'tenant_001', renewal_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), status: 'pending', notified: false, processed: false, created_at: new Date('2024-01-15') },
];

const SAMPLE_COMMISSIONS: Commission[] = [
  { id: 'com_001', policy_id: 'pol_001', tenant_id: 'tenant_001', employee_id: 'emp_001', commission_rate: 5, commission_amount: 750, is_paid: true, paid_date: new Date('2024-02-01'), created_at: new Date('2024-01-01') },
  { id: 'com_002', policy_id: 'pol_002', tenant_id: 'tenant_001', employee_id: 'emp_001', commission_rate: 7, commission_amount: 1260, is_paid: true, paid_date: new Date('2024-03-01'), created_at: new Date('2024-02-01') },
  { id: 'com_003', policy_id: 'pol_003', tenant_id: 'tenant_001', employee_id: 'emp_002', commission_rate: 8, commission_amount: 3600, is_paid: false, created_at: new Date('2024-01-15') },
  { id: 'com_004', policy_id: 'pol_004', tenant_id: 'tenant_001', employee_id: 'emp_002', commission_rate: 6, commission_amount: 720, is_paid: false, created_at: new Date('2024-03-01') },
  { id: 'com_005', policy_id: 'pol_005', tenant_id: 'tenant_001', employee_id: 'emp_001', commission_rate: 5, commission_amount: 175, is_paid: true, paid_date: new Date('2024-07-01'), created_at: new Date('2024-06-01') },
];

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 'notif_001', tenant_id: 'tenant_001', title: 'New Customer Pending', message: 'Priya Sharma needs approval', type: 'warning', is_read: false, priority: 'high', action_url: '/approvals', created_at: new Date(Date.now() - 1000 * 60 * 30) },
  { id: 'notif_002', tenant_id: 'tenant_001', title: 'Policy Renewal Due', message: 'MTR-2024-001 expires in 7 days', type: 'warning', is_read: false, priority: 'urgent', action_url: '/renewals', created_at: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 'notif_003', tenant_id: 'tenant_001', title: 'Claim Filed', message: 'New claim CLM-2024-004 filed by Anitha Pillai', type: 'info', is_read: false, priority: 'high', action_url: '/claims', created_at: new Date(Date.now() - 1000 * 60 * 120) },
  { id: 'notif_004', tenant_id: 'tenant_001', title: 'Commission Pending', message: '₹4,320 commission due for Raghul & Vasu', type: 'info', is_read: true, priority: 'medium', action_url: '/commissions', created_at: new Date(Date.now() - 1000 * 60 * 180) },
  { id: 'notif_005', tenant_id: 'tenant_001', title: '🎂 Birthday Today!', message: 'Customer Kavitha Reddy\'s birthday today! Send wishes.', type: 'success', is_read: false, priority: 'medium', created_at: new Date(Date.now() - 1000 * 60 * 240) },
  { id: 'notif_006', tenant_id: 'tenant_002', title: 'Customer Approved', message: 'Rajesh Kumar has been approved by owner', type: 'success', is_read: false, priority: 'medium', created_at: new Date(Date.now() - 1000 * 60 * 300) },
  { id: 'notif_007', tenant_id: 'tenant_001', title: 'Welcome to UV Insurance!', message: 'System initialized successfully', type: 'success', is_read: true, priority: 'low', created_at: new Date('2024-01-01') },
];

const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud_001', tenant_id: 'tenant_001', user_name: 'UV (Owner)', action: 'LOGIN', entity_type: 'auth', new_values: 'Successful login from Chrome/Windows', ip_address: '192.168.1.1', created_at: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 'aud_002', tenant_id: 'tenant_001', user_name: 'UV (Owner)', action: 'APPROVE_CUSTOMER', entity_type: 'customer', entity_id: 'cus_001', old_values: 'status: pending', new_values: 'status: approved', ip_address: '192.168.1.1', created_at: new Date(Date.now() - 1000 * 60 * 30) },
  { id: 'aud_003', tenant_id: 'tenant_001', user_name: 'Raghul (Employee)', action: 'ADD_CUSTOMER', entity_type: 'customer', entity_id: 'cus_002', new_values: 'Customer: Priya Sharma, Policy: health', ip_address: '192.168.1.2', created_at: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 'aud_004', tenant_id: 'tenant_001', user_name: 'Vasu (Employee)', action: 'ADD_POLICY', entity_type: 'policy', entity_id: 'pol_003', new_values: 'LIC India, Life, ₹50,00,000', ip_address: '192.168.1.3', created_at: new Date(Date.now() - 1000 * 60 * 90) },
  { id: 'aud_005', tenant_id: 'tenant_001', user_name: 'UV (Owner)', action: 'REJECT_CUSTOMER', entity_type: 'customer', entity_id: 'cus_006', old_values: 'status: pending', new_values: 'status: rejected, reason: Incomplete documents', ip_address: '192.168.1.1', created_at: new Date(Date.now() - 1000 * 60 * 120) },
  { id: 'aud_006', tenant_id: 'tenant_001', user_name: 'Raghul (Employee)', action: 'FILE_CLAIM', entity_type: 'claim', entity_id: 'clm_001', new_values: 'CLM-2024-001, Accident, ₹85,000', ip_address: '192.168.1.2', created_at: new Date(Date.now() - 1000 * 60 * 150) },
  { id: 'aud_007', tenant_id: 'tenant_001', user_name: 'UV (Owner)', action: 'PAY_COMMISSION', entity_type: 'commission', entity_id: 'com_001', new_values: '₹750 paid to Raghul', ip_address: '192.168.1.1', created_at: new Date(Date.now() - 1000 * 60 * 200) },
  { id: 'aud_008', tenant_id: 'tenant_001', user_name: 'Vasu (Employee)', action: 'ADD_LEAD', entity_type: 'lead', entity_id: 'led_004', new_values: 'Meena Iyer, Life Insurance interest', ip_address: '192.168.1.3', created_at: new Date(Date.now() - 1000 * 60 * 240) },
  { id: 'aud_009', tenant_id: 'tenant_001', user_name: 'UV (Owner)', action: 'UPDATE_SETTINGS', entity_type: 'settings', new_values: 'App name updated, WhatsApp number added', ip_address: '192.168.1.1', created_at: new Date(Date.now() - 1000 * 60 * 300) },
  { id: 'aud_010', tenant_id: 'tenant_001', user_name: 'Raghul (Employee)', action: 'UPLOAD_DOCUMENT', entity_type: 'document', entity_id: 'doc_001', new_values: 'Aadhaar Card uploaded for Rajesh Kumar', ip_address: '192.168.1.2', created_at: new Date(Date.now() - 1000 * 60 * 360) },
];

const SAMPLE_FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'fam_001', customer_id: 'cus_001', tenant_id: 'tenant_001', full_name: 'Sunita Kumar', relationship: 'Spouse', date_of_birth: new Date('1987-08-20'), phone: '+919876540010', email: 'sunita@example.com', has_policy: true, policy_id: 'pol_002', created_at: new Date('2024-01-10') },
  { id: 'fam_002', customer_id: 'cus_001', tenant_id: 'tenant_001', full_name: 'Ravi Kumar', relationship: 'Son', date_of_birth: new Date('2012-03-15'), phone: undefined, email: undefined, has_policy: false, created_at: new Date('2024-01-10') },
  { id: 'fam_003', customer_id: 'cus_003', tenant_id: 'tenant_001', full_name: 'Fatima Farhan', relationship: 'Spouse', date_of_birth: new Date('1982-06-10'), phone: '+919876540011', email: 'fatima@example.com', has_policy: false, created_at: new Date('2024-01-12') },
];

const SAMPLE_ENDORSEMENTS: Endorsement[] = [
  { id: 'end_001', policy_id: 'pol_001', tenant_id: 'tenant_001', endorsement_type: 'Address Change', description: 'Customer relocated from MG Road to Whitefield', effective_date: new Date('2024-06-01'), premium_change: 0, status: 'approved', approved_by: 'tenant_001', approved_at: new Date('2024-06-02'), created_at: new Date('2024-05-30') },
  { id: 'end_002', policy_id: 'pol_003', tenant_id: 'tenant_001', endorsement_type: 'Nominee Change', description: 'Changed nominee from father to spouse', effective_date: new Date('2024-08-01'), premium_change: 0, status: 'pending', created_at: new Date('2024-07-28') },
];

const SAMPLE_DOCUMENTS: Document[] = [
  { id: 'doc_001', customer_id: 'cus_001', tenant_id: 'tenant_001', document_type: 'Aadhaar Card', file_name: 'rajesh_aadhaar.jpg', file_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjEwMCIgeT0iNjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkFhZGhhYXIgQ2FyZDwvdGV4dD48L3N2Zz4=', file_type: 'image/jpeg', file_size: 245760, uploaded_by: 'tenant_002', is_camera_capture: false, created_at: new Date('2024-01-10') },
  { id: 'doc_002', customer_id: 'cus_001', tenant_id: 'tenant_001', document_type: 'PAN Card', file_name: 'rajesh_pan.jpg', file_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzBmMzQ2MCIvPjx0ZXh0IHg9IjEwMCIgeT0iNjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlBBTiBDYXJkPC90ZXh0Pjwvc3ZnPg==', file_type: 'image/jpeg', file_size: 198400, uploaded_by: 'tenant_002', is_camera_capture: true, created_at: new Date('2024-01-10') },
  { id: 'doc_003', customer_id: 'cus_003', tenant_id: 'tenant_001', document_type: 'RC Book', file_name: 'farhan_rc.pdf', file_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzE1NDAzZiIvPjx0ZXh0IHg9IjEwMCIgeT0iNjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlJDIEJvb2s8L3RleHQ+PC9zdmc+', file_type: 'application/pdf', file_size: 512000, uploaded_by: 'tenant_003', is_camera_capture: false, created_at: new Date('2024-01-12') },
];

const SAMPLE_COMPLIANCE_REPORTS: ComplianceReport[] = [
  { id: 'comp_001', tenant_id: 'tenant_001', report_type: 'IRDAI Quarterly', period_start: new Date('2024-01-01'), period_end: new Date('2024-03-31'), status: 'submitted', submitted_at: new Date('2024-04-10'), created_at: new Date('2024-04-01') },
  { id: 'comp_002', tenant_id: 'tenant_001', report_type: 'AML Report', period_start: new Date('2024-04-01'), period_end: new Date('2024-06-30'), status: 'draft', created_at: new Date('2024-07-01') },
];

const SAMPLE_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  { id: 'art_001', tenant_id: 'tenant_001', title: 'Motor Insurance – Complete Guide', content: 'Motor insurance is mandatory in India under the Motor Vehicles Act. There are three types:\n\n**1. Comprehensive Insurance**\nCovers third-party liability AND own damage. Required documents: RC Book, Aadhaar, PAN, Driving License, Previous Policy.\n\n**2. Third Party Insurance**\nMandatory by law. Covers damage to third party only. Sum assured = IDV (Insured Declared Value). IDV = Market Value × (1 - Depreciation Rate). Documents: RC Book, Aadhaar, PAN.\n\n**3. Own Damage Insurance**\nCovers only your vehicle damage. Combined with TP for full coverage.\n\n**IDV Calculation Formula:**\nIDV = Ex-Showroom Price × (1 - Depreciation%) + Accessories Value\n- 0-6 months: 5% depreciation\n- 6-12 months: 15%\n- 1-2 years: 20%\n- 2-3 years: 30%\n- 3-4 years: 40%\n- 4-5 years: 50%', category: 'Motor Insurance', tags: 'motor,vehicle,IDV,comprehensive,third-party', faqs: [{ q: 'Is motor insurance mandatory in India?', a: 'Yes, Third Party (TP) insurance is mandatory under the Motor Vehicles Act 1988. Driving without TP insurance can result in ₹2,000 fine or 3 months imprisonment.' }, { q: 'What is IDV in motor insurance?', a: 'IDV (Insured Declared Value) is the current market value of your vehicle. It is the maximum claim amount you can receive. For third-party insurance, the sum assured is automatically set to IDV.' }, { q: 'What documents are needed for motor insurance?', a: 'RC Book, Aadhaar Card, PAN Card, Driving License, Previous Policy (for renewal), Vehicle Inspection Report (for used cars).' }], view_count: 234, helpful_count: 45, is_published: true, created_at: new Date('2024-01-01'), updated_at: new Date() },
  { id: 'art_002', tenant_id: 'tenant_001', title: 'Health Insurance – Complete Guide', content: 'Health insurance covers medical expenses due to illness, accident, or hospitalization.\n\n**Types of Health Insurance:**\n1. Individual Health Plan – Covers single person\n2. Family Floater – One sum assured for entire family\n3. Senior Citizen Plan – For age 60+\n4. Critical Illness – Lump sum for specific diseases\n5. Group Insurance – Through employer\n\n**Key Health Parameters Required:**\n- Height (cm) & Weight (kg) → to calculate BMI\n- Blood Group (A+, B+, O+, AB+, A-, B-, O-, AB-)\n- Pre-existing conditions (diabetes, BP, heart disease)\n- Smoking/alcohol status\n- Family medical history\n\n**BMI Categories:**\n- Underweight: < 18.5\n- Normal: 18.5 – 24.9\n- Overweight: 25 – 29.9\n- Obese: ≥ 30 (may affect premium)\n\n**Cashless vs Reimbursement:**\nCashless: Hospital directly bills insurer (network hospitals)\nReimbursement: Patient pays, then claims from insurer', category: 'Health Insurance', tags: 'health,medical,hospitalization,BMI,cashless', faqs: [{ q: 'What is the waiting period in health insurance?', a: 'Pre-existing diseases have 2-4 year waiting period. Specific diseases like hernia, cataract have 1-2 year waiting period. Accidents are covered from day 1.' }, { q: 'How is premium calculated for health insurance?', a: 'Premium depends on: Age, Sum Assured, BMI, Pre-existing conditions, Smoking status, City tier, Number of members, Plan type.' }, { q: 'What is a No Claim Bonus (NCB)?', a: 'NCB is a discount given for every claim-free year. Typically 5-50% reduction in premium. Some plans also increase sum assured with NCB.' }], view_count: 189, helpful_count: 38, is_published: true, created_at: new Date('2024-01-05'), updated_at: new Date() },
  { id: 'art_003', tenant_id: 'tenant_001', title: 'Life Insurance – Complete Guide', content: 'Life insurance provides financial protection to nominees upon the policyholder\'s death.\n\n**Types of Life Insurance:**\n1. Term Life – Pure protection, no maturity benefit, highest cover at lowest cost\n2. Whole Life – Coverage for entire life (up to 99-100 years)\n3. Endowment Plan – Insurance + Savings combination\n4. ULIP – Insurance + Market-linked investment\n5. Money Back – Periodic returns during policy term\n\n**Key Details Required:**\n- Height, Weight, Blood Group\n- Nominee Name, Relationship, Date of Birth\n- Nominee\'s Aadhaar/PAN\n- Medical reports for high sum assured (>50 lakhs)\n- Income proof (salary slip, ITR)\n\n**Sum Assured Guidelines:**\n- Recommended: 10-15x annual income\n- Minimum: 5x annual income\n- Maximum: 20x annual income (for standard plans)\n\n**Tax Benefits (Section 80C):**\nPremiums up to ₹1.5 lakh are tax deductible\nMaturity proceeds are tax-free under Section 10(10D)', category: 'Life Insurance', tags: 'life,term,endowment,ULIP,nominee', faqs: [{ q: 'What is the difference between Term and Life insurance?', a: 'Term insurance is pure protection with no maturity benefit but very high cover at low premium. Whole Life/Endowment plans combine insurance with savings but have higher premiums.' }, { q: 'Who should be the nominee?', a: 'Ideally spouse, children, or parents. Nominee must be a natural heir. You can have multiple nominees with percentage allocation. Minor nominees need an appointee.' }, { q: 'Can I have multiple life insurance policies?', a: 'Yes, you can have multiple policies. Total sum assured should not exceed 20x annual income for standard underwriting. Disclosure of all existing policies is mandatory.' }], view_count: 156, helpful_count: 29, is_published: true, created_at: new Date('2024-01-10'), updated_at: new Date() },
  { id: 'art_004', tenant_id: 'tenant_001', title: 'Term Insurance – Complete Guide', content: 'Term insurance is the purest form of life insurance offering maximum coverage at minimum premium.\n\n**Why Term Insurance?**\n- Highest Sum Assured at lowest premium\n- No investment component (pure protection)\n- Tax benefits under 80C and 10(10D)\n- Riders available for enhanced protection\n\n**Documents Required:**\n- Aadhaar + PAN\n- Passport size photo\n- Income proof (last 3 years ITR/salary slips)\n- Bank statements (6 months)\n- Medical reports (for SA > 50 lakhs or age > 45)\n\n**Health Parameters:**\n- Height, Weight (BMI calculation)\n- Blood Group\n- Smoker/Non-smoker status (smokers pay 30-40% higher premium)\n- Pre-existing conditions\n- Family history of critical illness\n\n**Available Riders:**\n1. Accidental Death Benefit (ADB)\n2. Critical Illness (CI) Rider\n3. Waiver of Premium (WOP)\n4. Accidental Disability Benefit\n5. Return of Premium (ROP)\n\n**Premium Factors:**\n- Age (younger = cheaper)\n- Gender (females get discount)\n- Lifestyle (smoker/non-smoker)\n- Health history\n- Policy term\n- Sum Assured', category: 'Term Insurance', tags: 'term,protection,riders,premium,smoker', faqs: [{ q: 'Is term insurance return of premium worth it?', a: 'ROP term plans return all premiums at maturity if you survive. However, premium is 3-4x higher than regular term. Invest the difference in mutual funds for better returns.' }, { q: 'What happens if I stop paying term insurance premiums?', a: 'Term insurance lapses after the grace period (30 days). Unlike endowment plans, there is no surrender value. Reinstatement is possible within 2-5 years with health proof.' }], view_count: 134, helpful_count: 22, is_published: true, created_at: new Date('2024-01-15'), updated_at: new Date() },
  { id: 'art_005', tenant_id: 'tenant_001', title: 'Home Insurance – Complete Guide', content: 'Home insurance protects your property against damages from fire, theft, natural calamities, and other risks.\n\n**Types of Coverage:**\n1. Structure Coverage – Building structure, walls, roof\n2. Contents Coverage – Furniture, appliances, valuables\n3. Liability Coverage – Third party injury on your property\n4. Rent Loss Coverage – Lost rental income during repairs\n\n**Documents Required:**\n- Aadhaar + PAN\n- Property documents (sale deed, khata)\n- Property valuation report\n- Photos of property\n\n**Key Details Required:**\n- Property type (apartment/villa/independent house)\n- Construction year\n- Built-up area (sq ft)\n- Number of floors\n- Property address\n- Ownership type (owned/rented)\n- Structure value\n- Contents value\n\n**Sum Assured Calculation:**\n- Structure: Reconstruction cost (not market value)\n- Contents: Current market value of items\n\n**Common Claims:**\n- Fire damage\n- Flood/earthquake damage\n- Theft/burglary\n- Pipe burst\n- Electrical damage', category: 'Home Insurance', tags: 'home,property,structure,contents,fire', faqs: [{ q: 'Is home insurance mandatory?', a: 'Home insurance is not mandatory by law in India, but highly recommended. Some home loan lenders require you to have property insurance.' }, { q: 'Does home insurance cover tenant\'s belongings?', a: 'Standard home insurance covers the owner\'s structure and contents. Tenants need separate contents insurance for their belongings.' }], view_count: 98, helpful_count: 18, is_published: true, created_at: new Date('2024-01-20'), updated_at: new Date() },
  { id: 'art_006', tenant_id: 'tenant_001', title: 'Travel Insurance – Complete Guide', content: 'Travel insurance covers emergencies during domestic or international travel.\n\n**Types of Travel Insurance:**\n1. Individual Travel Plan\n2. Family Travel Plan\n3. Senior Citizen Travel Plan\n4. Student Travel Plan\n5. Group Travel Plan\n6. Annual Multi-trip Plan\n\n**Documents Required:**\n- Aadhaar + PAN\n- Passport (for international travel)\n- Visa copy\n- Flight tickets / travel itinerary\n\n**Key Details Required:**\n- Travel type (domestic/international)\n- Trip type (single/multi-trip)\n- Destination country\n- Trip duration (days)\n- Departure and return dates\n- Number of travelers\n- Passport number\n\n**What is Covered:**\n- Medical emergencies abroad\n- Trip cancellation/curtailment\n- Baggage loss/delay\n- Passport loss\n- Personal accident\n- Emergency evacuation\n- Flight delay compensation\n\n**COVID-19 Coverage:**\nMost modern travel plans now cover COVID-19 treatment abroad. Check policy wording carefully.', category: 'Travel Insurance', tags: 'travel,international,passport,medical,baggage', faqs: [{ q: 'Do I need travel insurance for Schengen visa?', a: 'Yes! Schengen visa mandates travel insurance with minimum €30,000 medical coverage. Most insurers offer Schengen-compliant plans.' }, { q: 'Can I buy travel insurance after starting journey?', a: 'Travel insurance must be bought BEFORE your journey begins. Most insurers do not cover pre-existing conditions and have exclusions for known events.' }], view_count: 87, helpful_count: 15, is_published: true, created_at: new Date('2024-01-25'), updated_at: new Date() },
];

const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: 'emp_001',
    tenant_id: 'tenant_001',
    email: 'vasusiva78@gmail.com',
    role: 'employee',
    is_active: true,
    created_at: new Date('2024-01-02'),
    profile: {
      id: 'prof_002',
      tenant_id: 'tenant_001',
      full_name: 'Raghul (Employee)',
      phone: '+919876543211',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raghul&backgroundColor=ffdfbf',
      employee_code: 'UV-EMP-001',
      department: 'Sales',
      join_date: new Date('2024-01-02'),
      is_active: true,
      created_at: new Date('2024-01-02'),
      updated_at: new Date(),
    },
  },
  {
    id: 'emp_002',
    tenant_id: 'tenant_001',
    email: 'vasu@uvinsurance.in',
    role: 'employee',
    is_active: true,
    created_at: new Date('2024-01-03'),
    profile: {
      id: 'prof_003',
      tenant_id: 'tenant_001',
      full_name: 'Vasu',
      phone: '+919876543212',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vasu&backgroundColor=ffdfbf',
      employee_code: 'UV-EMP-002',
      department: 'Operations',
      join_date: new Date('2024-01-03'),
      is_active: true,
      created_at: new Date('2024-01-03'),
      updated_at: new Date(),
    },
  },
];

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'settings_001',
  tenant_id: 'tenant_001',
  app_name: 'UV Insurance Agency',
  logo_url: '',
  primary_color: '#3B82F6',
  secondary_color: '#8B5CF6',
  whatsapp_number: '+919876543210',
  agency_email: 'uvmarketsignal@gmail.com',
  agency_address: 'UV Insurance Agency, Bangalore, Karnataka',
  irdai_license: 'IRDAI-AGT-2024-001',
  whatsapp_automation_enabled: false,
  whatsapp_birthday_enabled: false,
  whatsapp_renewal_enabled: false,
  whatsapp_birthday_template:
    'Hi {{name}}! Wishing you a very happy birthday. We’re here for any insurance-related support. This is an agency reminder, not a guarantee. Reply STOP to opt out.',
  whatsapp_renewal_template:
    'Hi {{name}}! Your {{policy_type}} policy {{policy_number}} is expiring in {{days_left}} days. This is an agency reminder, not a guarantee. Reply STOP to opt out.',
  is_dark_mode: false,
  created_at: new Date('2024-01-01'),
  updated_at: new Date(),
};

// ─── STORE INTERFACE ──────────────────────────────────────────────────────────

interface AppState {
  // Auth
  tenant: Tenant | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  sessionStart: Date | null;
  loginAttempts: number;
  isLocked: boolean;
  lockoutUntil: Date | null;

  // Data
  customers: Customer[];
  policies: CustomerPolicy[];
  documents: Document[];
  claims: Claim[];
  leads: Lead[];
  notifications: Notification[];
  knowledgeArticles: KnowledgeArticle[];
  commissions: Commission[];
  renewals: Renewal[];
  auditLogs: AuditLog[];
  familyMembers: FamilyMember[];
  endorsements: Endorsement[];
  complianceReports: ComplianceReport[];
  employees: Employee[];
  appSettings: AppSettings;

  // UI
  currentPage: Page;
  sidebarOpen: boolean;
  darkMode: boolean;
  searchQuery: string;
  installPrompt: any;

  // Wizard
  newCustomerData: any;
  newCustomerStep: number;

  // Re-auth
  reAuthRequired: boolean;
  reAuthAttempts: number;

  /** Set true after first server load (or skip) so debounced sync can run */
  syncFromServerComplete: boolean;

  // ── Actions ──

  // Auth
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Navigation
  navigate: (page: Page) => void;

  // UI
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (mode: boolean) => void;
  setSearchQuery: (query: string) => void;
  setInstallPrompt: (prompt: any) => void;

  // Customers
  addCustomer: (customer: Partial<Customer> & { full_name: string; phone: string; tenant_id: string; status: Customer['status'] }) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  approveCustomer: (id: string, notes?: string) => Promise<void>;
  rejectCustomer: (id: string, reason?: string) => Promise<void>;
  requestChanges: (id: string, reason: string) => Promise<void>;

  // Policies
  addPolicy: (policy: Partial<CustomerPolicy> & { customer_id: string; tenant_id: string; policy_type: string; policy_number: string; insurer: string }) => Promise<CustomerPolicy>;
  updatePolicy: (id: string, data: Partial<CustomerPolicy>) => Promise<void>;

  // Documents
  addDocument: (doc: Partial<Document> & { customer_id: string; tenant_id: string; document_type: string; file_name: string; file_url: string; file_type: string; file_size: number; uploaded_by: string; is_camera_capture: boolean }) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;

  // Claims
  addClaim: (claim: Partial<Claim> & { tenant_id: string; claim_number: string; policy_id: string; claim_type: string; incident_date: Date; claim_amount: number; status: Claim['status'] }) => Promise<void>;
  updateClaimStatus: (id: string, status: Claim['status']) => Promise<void>;

  // Leads
  addLead: (lead: Partial<Lead> & { tenant_id: string; full_name: string; phone: string; status: Lead['status'] }) => Promise<void>;
  updateLeadStage: (id: string, status: Lead['status']) => Promise<void>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;

  // Notifications
  addNotification: (notif: Partial<Notification> & { tenant_id: string; title: string; message: string; type: Notification['type']; priority: Notification['priority'] }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Commissions
  addCommission: (commission: Partial<Commission> & { policy_id: string; tenant_id: string; employee_id: string; commission_rate: number; commission_amount: number }) => Promise<void>;
  payCommission: (id: string) => Promise<void>;

  // Renewals
  addRenewal: (renewal: Partial<Renewal> & { policy_id: string; tenant_id: string; renewal_date: Date; status: Renewal['status'] }) => Promise<void>;
  processRenewal: (id: string) => Promise<void>;

  // Audit Logs
  addAuditLog: (log: Partial<AuditLog> & { action: string; entity_type: string }) => void;

  // Family Members
  addFamilyMember: (member: Partial<FamilyMember> & { customer_id: string; tenant_id: string; full_name: string; relationship: string; has_policy: boolean }) => Promise<void>;
  deleteFamilyMember: (id: string) => Promise<void>;

  // Endorsements
  addEndorsement: (endorsement: Partial<Endorsement> & { policy_id: string; tenant_id: string; endorsement_type: string; description: string; status: Endorsement['status'] }) => Promise<void>;
  approveEndorsement: (id: string) => Promise<void>;
  rejectEndorsement: (id: string) => Promise<void>;

  // Compliance
  addComplianceReport: (report: Partial<ComplianceReport> & { tenant_id: string; report_type: string; period_start: Date; period_end: Date }) => Promise<void>;
  updateComplianceReport: (id: string, data: Partial<ComplianceReport>) => Promise<void>;

  // Knowledge Base
  addKnowledgeArticle: (article: Partial<KnowledgeArticle> & { tenant_id: string; title: string; content: string; category: string }) => Promise<void>;
  updateKnowledgeArticle: (id: string, data: Partial<KnowledgeArticle>) => Promise<void>;

  // Settings & Profile
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;

  // Employees
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (id: string, tenantUpdates: Partial<Pick<Tenant, 'name' | 'email'>>, profileUpdates: Partial<Profile>) => Promise<void>;
  toggleEmployeeStatus: (id: string) => Promise<void>;

  // Utility
  checkStorage: () => void;
  setNewCustomerStep: (step: number) => void;
  setNewCustomerData: (data: any) => void;
  clearNewCustomerData: () => void;
  resetReAuthAttempts: () => void;
  setReAuthRequired: (required: boolean) => void;
  loadInitialData: (tenantId: string) => Promise<void>;

  // Automation
  checkBirthdayNotifications: () => Promise<void>;
  checkRenewalNotifications: () => Promise<void>;
}

// ─── SYNC HELPER ───────────────────────────────────────────────────────────────
// Reads current state from the Zustand getter and pushes a sanitised snapshot
// to PostgreSQL via /api/sync. Passwords are stripped before sending.
function syncToServer(get: () => AppState) {
  const s = get();
  if (!s.tenant?.id) return;
  const snapshot = {
    appSettings: s.appSettings,
    customers: s.customers,
    policies: s.policies,
    documents: s.documents,
    claims: s.claims,
    leads: s.leads,
    notifications: s.notifications,
    knowledgeArticles: s.knowledgeArticles,
    commissions: s.commissions,
    renewals: s.renewals,
    auditLogs: s.auditLogs,
    familyMembers: s.familyMembers,
    endorsements: s.endorsements,
    complianceReports: s.complianceReports,
    darkMode: s.darkMode,
    // Strip passwords before persisting to server
    employees: s.employees.map(e => ({
      ...e,
      password: undefined,
    })),
  };
  debouncedPushSnapshot(s.tenant.id, snapshot);
}

// ─── STORE ────────────────────────────────────────────────────────────────────


export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      tenant: null,
      profile: null,
      isAuthenticated: false,
      sessionStart: null,
      loginAttempts: 0,
      isLocked: false,
      lockoutUntil: null,

      customers: SAMPLE_CUSTOMERS,
      policies: SAMPLE_POLICIES,
      documents: SAMPLE_DOCUMENTS,
      claims: SAMPLE_CLAIMS,
      leads: SAMPLE_LEADS,
      notifications: SAMPLE_NOTIFICATIONS,
      knowledgeArticles: SAMPLE_KNOWLEDGE_ARTICLES,
      commissions: SAMPLE_COMMISSIONS,
      renewals: SAMPLE_RENEWALS,
      auditLogs: SAMPLE_AUDIT_LOGS,
      familyMembers: SAMPLE_FAMILY_MEMBERS,
      endorsements: SAMPLE_ENDORSEMENTS,
      complianceReports: SAMPLE_COMPLIANCE_REPORTS,
      employees: SAMPLE_EMPLOYEES,
      appSettings: DEFAULT_APP_SETTINGS,

      currentPage: 'login',
      sidebarOpen: true,
      darkMode: false,
      searchQuery: '',
      installPrompt: null,

      newCustomerData: {},
      newCustomerStep: 0,
      reAuthRequired: false,
      reAuthAttempts: 0,
      syncFromServerComplete: false,

      // ── LOGIN ──────────────────────────────────────────────────────────────
      login: async (email, password) => {
        try {
          const normalizedEmail = sanitizeEmail(email);
          const normalizedPassword = password.trim();

          const now = new Date();
          const { isLocked, lockoutUntil, loginAttempts } = get();

          if (isLocked && lockoutUntil && lockoutUntil > now) {
            return false;
          }

          if (isLocked && lockoutUntil && lockoutUntil <= now) {
            set({ isLocked: false, loginAttempts: 0, lockoutUntil: null });
          }

          const demoTenant = DEMO_TENANTS.find(
            t => t.email.toLowerCase() === normalizedEmail && verifyPassword(normalizedPassword, t.password)
          );

          if (demoTenant) {
            const userProfile: Profile = {
              id: `prof_${demoTenant.id}`,
              tenant_id: demoTenant.id,
              full_name: demoTenant.name,
              phone: demoTenant.phone,
              avatar_url: demoTenant.avatar,
              employee_code: demoTenant.role === 'employee' ? `UV-EMP-00${DEMO_TENANTS.indexOf(demoTenant)}` : undefined,
              department: demoTenant.role === 'employee' ? 'Sales' : 'Management',
              is_active: true,
              created_at: demoTenant.created_at,
              updated_at: new Date(),
            };

            set({
              tenant: demoTenant,
              profile: userProfile,
              isAuthenticated: true,
              sessionStart: new Date(),
              loginAttempts: 0,
              isLocked: false,
              lockoutUntil: null,
            });

            // Run automation checks after login
            setTimeout(() => {
              get().checkBirthdayNotifications();
              get().checkRenewalNotifications();
            }, 1000);

            get().addAuditLog({
              user_name: `${demoTenant.name} (${demoTenant.role})`,
              action: 'LOGIN',
              entity_type: 'auth',
              new_values: `Successful login`,
              // IP is not directly accessible client-side; real IP is captured server-side
            });

            return true;
          }

          const nextAttempts = loginAttempts + 1;
          const shouldLock = nextAttempts >= 5;
          set({
            loginAttempts: nextAttempts,
            isLocked: shouldLock,
            lockoutUntil: shouldLock ? new Date(now.getTime() + 15 * 60 * 1000) : lockoutUntil,
          });
          return false;
        } catch (err) {
          console.error('Login error:', err);
          return false;
        }
      },

      // ── LOGOUT ────────────────────────────────────────────────────────────
      logout: () => {
        const { tenant } = get();
        get().addAuditLog({
          user_name: `${tenant?.name} (${tenant?.role})`,
          action: 'LOGOUT',
          entity_type: 'auth',
          new_values: 'User logged out',
        });
        set({
          tenant: null,
          profile: null,
          isAuthenticated: false,
          sessionStart: null,
          loginAttempts: 0,
          isLocked: false,
          lockoutUntil: null,
          currentPage: 'login',
          newCustomerData: {},
          newCustomerStep: 0,
          syncFromServerComplete: false,
        });
      },

      navigate: (page) => set({ currentPage: page }),
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      toggleDarkMode: () => {
        set(s => ({ darkMode: !s.darkMode }));
        syncToServer(get);
      },
      setDarkMode: (mode) => set({ darkMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setInstallPrompt: (prompt) => set({ installPrompt: prompt }),

      // ── CUSTOMERS ─────────────────────────────────────────────────────────
      addCustomer: async (customer) => {
        const { customers, tenant } = get();
        const now = new Date();
        const autoStatus = tenant?.role === 'owner' ? 'approved' : customer.status;
        const fullCustomer: Customer = {
          id: `cus_${Date.now()}`,
          created_at: now,
          updated_at: now,
          ...customer,
          full_name: sanitizeText(customer.full_name),
          phone: sanitizePhone(customer.phone),
          email: customer.email ? sanitizeEmail(customer.email) : undefined,
          occupation: customer.occupation ? sanitizeText(customer.occupation) : undefined,
          address: customer.address ? sanitizeText(customer.address) : undefined,
          annual_income: sanitizeNumeric(customer.annual_income),
          status: autoStatus || 'pending',
        } as Customer;
        set({ customers: [...customers, fullCustomer] });

        if (tenant?.role === 'employee') {
          await get().addNotification({
            tenant_id: 'tenant_001',
            title: '🆕 New Customer Submitted',
            message: `${fullCustomer.full_name} submitted by ${tenant.name} – needs approval`,
            type: 'info',
            is_read: false,
            priority: 'high',
            action_url: '/approvals',
            created_at: new Date(),
          });
        }

        if (tenant?.role === 'owner') {
          await get().addNotification({
            tenant_id: 'tenant_001',
            title: '✅ Customer Added & Approved',
            message: `${fullCustomer.full_name} added and auto-approved`,
            type: 'success',
            is_read: false,
            priority: 'medium',
            created_at: new Date(),
          });
        }

        get().addAuditLog({
          action: 'ADD_CUSTOMER',
          entity_type: 'customer',
          entity_id: fullCustomer.id,
          new_values: `Customer: ${fullCustomer.full_name}, Phone: ${fullCustomer.phone}`,
        });
        syncToServer(get);
        return fullCustomer;
      },

      updateCustomer: async (id, data) => {
        const { customers } = get();
        const sanitizedData: Partial<Customer> = {
          ...data,
          full_name: data.full_name ? sanitizeText(data.full_name) : data.full_name,
          phone: data.phone ? sanitizePhone(data.phone) : data.phone,
          email: data.email ? sanitizeEmail(data.email) : data.email,
          occupation: data.occupation ? sanitizeText(data.occupation) : data.occupation,
          address: data.address ? sanitizeText(data.address) : data.address,
          annual_income: sanitizeNumeric(data.annual_income),
        };
        set({ customers: customers.map(c => c.id === id ? { ...c, ...sanitizedData, updated_at: new Date() } : c) });
        get().addAuditLog({
          action: 'UPDATE_CUSTOMER',
          entity_type: 'customer',
          entity_id: id,
          new_values: JSON.stringify(sanitizedData),
        });
        syncToServer(get);
      },

      deleteCustomer: async (id) => {
        const { customers } = get();
        const customer = customers.find(c => c.id === id);
        set({ customers: customers.map(c => c.id === id ? { ...c, status: 'deleted', deleted_at: new Date() } : c) });
        get().addAuditLog({
          action: 'DELETE_CUSTOMER',
          entity_type: 'customer',
          entity_id: id,
          old_values: `Customer: ${customer?.full_name}`,
        });
        syncToServer(get);
      },

      approveCustomer: async (id) => {
        const { customers, tenant } = get();
        const customer = customers.find(c => c.id === id);
        set({ customers: customers.map(c => c.id === id ? { ...c, status: 'approved', updated_at: new Date() } : c) });

        if (customer?.assigned_to) {
          await get().addNotification({
            tenant_id: customer.assigned_to,
            title: '✅ Customer Approved',
            message: `${customer.full_name} has been approved by ${tenant?.name}`,
            type: 'success',
            is_read: false,
            priority: 'medium',
            created_at: new Date(),
          });
        }

        get().addAuditLog({
          user_name: `${tenant?.name} (${tenant?.role})`,
          action: 'APPROVE_CUSTOMER',
          entity_type: 'customer',
          entity_id: id,
          old_values: 'status: pending',
          new_values: 'status: approved',
        });
        syncToServer(get);
      },

      rejectCustomer: async (id, reason) => {
        const { customers } = get();
        const customer = customers.find(c => c.id === id);
        set({ customers: customers.map(c => c.id === id ? { ...c, status: 'rejected', updated_at: new Date() } : c) });

        if (customer?.assigned_to) {
          await get().addNotification({
            tenant_id: customer.assigned_to,
            title: '❌ Customer Rejected',
            message: `${customer.full_name} was rejected. Reason: ${reason || 'Not specified'}`,
            type: 'error',
            is_read: false,
            priority: 'medium',
            created_at: new Date(),
          });
        }

        get().addAuditLog({
          action: 'REJECT_CUSTOMER',
          entity_type: 'customer',
          entity_id: id,
          new_values: `status: rejected, reason: ${reason}`,
        });
        syncToServer(get);
      },

      requestChanges: async (id, reason) => {
        const { customers } = get();
        const customer = customers.find(c => c.id === id);
        set({ customers: customers.map(c => c.id === id ? { ...c, status: 'changes_requested', notes: reason, updated_at: new Date() } : c) });

        if (customer?.assigned_to) {
          await get().addNotification({
            tenant_id: customer.assigned_to,
            title: '⚠️ Changes Requested',
            message: `Changes needed for ${customer.full_name}: ${reason}`,
            type: 'warning',
            is_read: false,
            priority: 'high',
            created_at: new Date(),
          });
        }

        get().addAuditLog({
          action: 'REQUEST_CHANGES',
          entity_type: 'customer',
          entity_id: id,
          new_values: `Changes requested: ${reason}`,
        });
        syncToServer(get);
      },

      // ── POLICIES ──────────────────────────────────────────────────────────
      addPolicy: async (policy) => {
        const { policies, tenant } = get();
        const now = new Date();
        const full = { id: `pol_${Date.now()}`, created_at: now, updated_at: now, status: 'Active', ...policy } as CustomerPolicy;
        set({ policies: [...policies, full] });

        const rateMap: Record<string, number> = { motor: 5, health: 7, life: 8, term: 6, home: 5, travel: 5, others: 5 };
        const rate = rateMap[full.policy_type] || 5;
        const commAmount = (full.premium_amount || 0) * (rate / 100);

        const employeeId = tenant?.role === 'employee' 
          ? get().employees.find(e => e.email === tenant?.email)?.id 
          : undefined;

        await get().addCommission({
          id: `comm_${Date.now()}`,
          policy_id: full.id,
          tenant_id: tenant?.id || '',
          employee_id: employeeId || '',
          commission_rate: rate,
          commission_amount: commAmount,
          is_paid: false,
          created_at: new Date(),
        });

        await get().addRenewal({
          id: `ren_${Date.now()}`,
          policy_id: full.id,
          tenant_id: tenant?.id || '',
          renewal_date: new Date((new Date(full.end_date || Date.now()).getTime()) - 30 * 24 * 60 * 60 * 1000),
          status: 'pending',
          notified: false,
          processed: false,
          created_at: new Date(),
        });

        get().addAuditLog({
          action: 'ADD_POLICY',
          entity_type: 'policy',
          entity_id: full.id,
          new_values: `${full.insurer}, ${full.policy_type}, ₹${full.sum_assured?.toLocaleString()}`,
        });
        syncToServer(get);
        return full;
      },

      updatePolicy: async (id, data) => {
        const { policies } = get();
        set({ policies: policies.map(p => p.id === id ? { ...p, ...data, updated_at: new Date() } : p) });
        get().addAuditLog({
          action: 'UPDATE_POLICY',
          entity_type: 'policy',
          entity_id: id,
          new_values: JSON.stringify(data),
        });
        syncToServer(get);
      },

      // ── DOCUMENTS ─────────────────────────────────────────────────────────
      addDocument: async (doc) => {
        const { documents } = get();
        const full = { id: `doc_${Date.now()}`, created_at: new Date(), ...doc } as Document;
        set({ documents: [...documents, full] });
        get().addAuditLog({
          action: 'UPLOAD_DOCUMENT',
          entity_type: 'document',
          entity_id: full.id,
          new_values: `${full.document_type} - ${full.file_name}`,
        });
        syncToServer(get);
        return full;
      },

      deleteDocument: async (id) => {
        const { documents } = get();
        set({ documents: documents.filter(d => d.id !== id) });
        get().addAuditLog({
          action: 'DELETE_DOCUMENT',
          entity_type: 'document',
          entity_id: id,
        });
        syncToServer(get);
      },

      // ── CLAIMS ────────────────────────────────────────────────────────────
      addClaim: async (claim) => {
        const { claims } = get();
        const now = new Date();
        const full = { id: `clm_${Date.now()}`, created_at: now, updated_at: now, ...claim } as Claim;
        set({ claims: [...claims, full] });

        await get().addNotification({
          tenant_id: 'tenant_001',
          title: '🚨 New Claim Filed',
          message: `Claim ${claim.claim_number} filed – ₹${claim.claim_amount.toLocaleString()}`,
          type: 'warning',
          is_read: false,
          priority: 'high',
          action_url: '/claims',
          created_at: new Date(),
        });

        get().addAuditLog({
          action: 'FILE_CLAIM',
          entity_type: 'claim',
          entity_id: claim.id,
          new_values: `${claim.claim_number}, ${claim.claim_type}, ₹${claim.claim_amount}`,
        });
        syncToServer(get);
      },

      updateClaimStatus: async (id, status) => {
        const { claims } = get();
        set({ claims: claims.map(c => c.id === id ? { ...c, status, updated_at: new Date() } : c) });
        get().addAuditLog({
          action: 'UPDATE_CLAIM_STATUS',
          entity_type: 'claim',
          entity_id: id,
          new_values: `status: ${status}`,
        });
        syncToServer(get);
      },

      // ── LEADS ─────────────────────────────────────────────────────────────
      addLead: async (lead) => {
        const { leads } = get();
        const now = new Date();
        const full = { id: `led_${Date.now()}`, created_at: now, updated_at: now, ...lead } as Lead;
        set({ leads: [...leads, full] });
        get().addAuditLog({
          action: 'ADD_LEAD',
          entity_type: 'lead',
          entity_id: lead.id,
          new_values: `${lead.full_name}, ${lead.phone}, Interest: ${lead.policy_interest}`,
        });
        syncToServer(get);
      },

      updateLeadStage: async (id, status) => {
        const { leads } = get();
        set({ leads: leads.map(l => l.id === id ? { ...l, status, updated_at: new Date() } : l) });
        get().addAuditLog({
          action: 'UPDATE_LEAD_STAGE',
          entity_type: 'lead',
          entity_id: id,
          new_values: `status: ${status}`,
        });
        syncToServer(get);
      },

      updateLead: async (id, data) => {
        const { leads } = get();
        set({ leads: leads.map(l => l.id === id ? { ...l, ...data, updated_at: new Date() } : l) });
        syncToServer(get);
      },

      deleteLead: async (id) => {
        const { leads } = get();
        set({ leads: leads.map(l => l.id === id ? { ...l, status: 'deleted', deleted_at: new Date() } : l) });
        get().addAuditLog({
          action: 'DELETE_LEAD',
          entity_type: 'lead',
          entity_id: id,
        });
        syncToServer(get);
      },

      // ── NOTIFICATIONS ─────────────────────────────────────────────────────
      addNotification: async (notif) => {
        const { notifications } = get();
        const newNotif: Notification = { is_read: false, created_at: new Date(), ...notif, id: `notif_${Date.now()}_${Math.random()}` } as Notification;
        set({ notifications: [newNotif, ...notifications].slice(0, 100) });
        syncToServer(get);
      },

      markNotificationRead: (id) => {
        const { notifications } = get();
        set({ notifications: notifications.map(n => n.id === id ? { ...n, is_read: true } : n) });
        syncToServer(get);
      },

      markAllNotificationsRead: () => {
        const { notifications } = get();
        set({ notifications: notifications.map(n => ({ ...n, is_read: true })) });
        syncToServer(get);
      },

      // ── COMMISSIONS ───────────────────────────────────────────────────────
      addCommission: async (commission) => {
        const { commissions } = get();
        const full = { id: `com_${Date.now()}`, is_paid: false, created_at: new Date(), ...commission } as Commission;
        set({ commissions: [...commissions, full] });
        syncToServer(get);
      },

      payCommission: async (id) => {
        const { commissions } = get();
        set({ commissions: commissions.map(c => c.id === id ? { ...c, is_paid: true, paid_date: new Date() } : c) });
        const comm = commissions.find(c => c.id === id);
        get().addAuditLog({
          action: 'PAY_COMMISSION',
          entity_type: 'commission',
          entity_id: id,
          new_values: `₹${comm?.commission_amount} paid`,
        });
        syncToServer(get);
      },

      // ── RENEWALS ──────────────────────────────────────────────────────────
      addRenewal: async (renewal) => {
        const { renewals } = get();
        const full = { id: `ren_${Date.now()}`, notified: false, processed: false, created_at: new Date(), ...renewal } as Renewal;
        set({ renewals: [...renewals, full] });
        syncToServer(get);
      },

      processRenewal: async (id) => {
        const { renewals } = get();
        set({ renewals: renewals.map(r => r.id === id ? { ...r, status: 'completed', processed: true, processed_at: new Date() } : r) });
        get().addAuditLog({
          action: 'PROCESS_RENEWAL',
          entity_type: 'renewal',
          entity_id: id,
          new_values: 'Renewal processed',
        });
        syncToServer(get);
      },

      // ── AUDIT LOGS ────────────────────────────────────────────────────────
      addAuditLog: (log) => {
        const { auditLogs, profile, tenant } = get();
        
        // Auto-generate specific user name if not provided
        const userName = log.user_name || (
          profile?.full_name 
            ? `${profile.full_name} (${tenant?.role === 'owner' ? 'Admin' : 'Employee'})`
            : `${tenant?.name || 'System'}`
        );

        const newLog: AuditLog = {
          ...log,
          id: `aud_${Date.now()}_${Math.random()}`,
          tenant_id: tenant?.id || 'system',
          user_name: userName,
          created_at: new Date(),
        };
        set({ auditLogs: [newLog, ...auditLogs].slice(0, 500) });
        syncToServer(get);
      },

      // ── FAMILY MEMBERS ────────────────────────────────────────────────────
      addFamilyMember: async (member) => {
        const { familyMembers } = get();
        const full = { id: `fam_${Date.now()}`, created_at: new Date(), ...member } as FamilyMember;
        set({ familyMembers: [...familyMembers, full] });
        syncToServer(get);
      },

      deleteFamilyMember: async (id) => {
        const { familyMembers } = get();
        set({ familyMembers: familyMembers.filter(m => m.id !== id) });
        syncToServer(get);
      },

      // ── ENDORSEMENTS ──────────────────────────────────────────────────────
      addEndorsement: async (endorsement) => {
        const { endorsements } = get();
        const full = { id: `end_${Date.now()}`, created_at: new Date(), ...endorsement } as Endorsement;
        set({ endorsements: [...endorsements, full] });
        syncToServer(get);
      },

      approveEndorsement: async (id) => {
        const { endorsements, tenant, employees } = get();
        const employeeId = tenant?.role === 'employee' 
          ? employees.find(e => e.email === tenant.email)?.id 
          : null;
        const approverId = employeeId || tenant?.id;

        set({ endorsements: endorsements.map(e => e.id === id ? { ...e, status: 'approved', approved_by: approverId, approved_at: new Date() } : e) });
        syncToServer(get);
      },

      rejectEndorsement: async (id) => {
        const { endorsements } = get();
        set({ endorsements: endorsements.map(e => e.id === id ? { ...e, status: 'rejected' } : e) });
        syncToServer(get);
      },

      // ── COMPLIANCE ────────────────────────────────────────────────────────
      addComplianceReport: async (report) => {
        const { complianceReports } = get();
        const now = new Date();
        const full = { id: `comp_${Date.now()}`, created_at: now, ...report } as ComplianceReport;
        set({ complianceReports: [...complianceReports, full] });
        syncToServer(get);
      },

      updateComplianceReport: async (id, data) => {
        const { complianceReports } = get();
        set({ complianceReports: complianceReports.map(r => r.id === id ? { ...r, ...data } : r) });
        syncToServer(get);
      },

      // ── KNOWLEDGE BASE ────────────────────────────────────────────────────
      addKnowledgeArticle: async (article) => {
        const { knowledgeArticles } = get();
        const now = new Date();
        const full = { id: `kb_${Date.now()}`, created_at: now, updated_at: now, view_count: 0, is_published: true, ...article } as KnowledgeArticle;
        set({ knowledgeArticles: [...knowledgeArticles, full] });
        syncToServer(get);
      },

      updateKnowledgeArticle: async (id, data) => {
        const { knowledgeArticles } = get();
        set({ knowledgeArticles: knowledgeArticles.map(a => a.id === id ? { ...a, ...data, updated_at: new Date() } : a) });
        syncToServer(get);
      },

      // ── SETTINGS & PROFILE ────────────────────────────────────────────────
      updateAppSettings: async (settings) => {
        const { appSettings } = get();
        set({ appSettings: { ...appSettings, ...settings, updated_at: new Date() } });
        get().addAuditLog({
          action: 'UPDATE_SETTINGS',
          entity_type: 'settings',
          new_values: JSON.stringify(settings),
        });
        syncToServer(get);
      },

      updatePassword: async (oldPassword, newPassword) => {
        const { tenant } = get();
        if (!tenant) return { success: false, error: 'Not authenticated' };
        if (!verifyPassword(oldPassword, tenant.password)) return { success: false, error: 'Current password is incorrect' };
        const strength = validatePasswordStrength(newPassword);
        if (!strength.valid) return { success: false, error: strength.errors[0] || 'Password is weak' };
        const hashed = hashPassword(newPassword);
        set({ tenant: { ...tenant, password: hashed, updated_at: new Date() } });
        // Persist hashed password to DB
        try {
          await dbService.updateTenantPassword(tenant.id, hashed);
        } catch (err) {
          console.error('updatePassword DB error:', err);
        }
        syncToServer(get);
        return { success: true };
      },

      updateProfile: async (profileData) => {
        const { profile } = get();
        if (profile) {
          set({ profile: { ...profile, ...profileData, updated_at: new Date() } });
          // Persist profile to DB
          try {
            await dbService.updateProfile(profile.tenant_id, profileData);
          } catch (err) {
            console.error('updateProfile DB error:', err);
          }
          syncToServer(get);
        }
      },

      // ── EMPLOYEES ─────────────────────────────────────────────────────────
      addEmployee: async (employee) => {
        const { employees } = get();
        set({ employees: [...employees, employee] });
        // Persist to PostgreSQL
        try {
          await dbService.createEmployee({
            name: employee.email.split('@')[0],
            email: employee.email,
            password: (employee as any).password || 'ChangeMe@123',
            role: 'employee',
            is_active: employee.is_active,
            profile: {
              full_name: employee.profile.full_name,
              phone: employee.profile.phone || '',
              avatar_url: employee.profile.avatar_url,
              employee_code: employee.profile.employee_code || '',
              department: employee.profile.department || '',
              join_date: employee.profile.join_date || new Date(),
              is_active: true,
            }
          });
          console.log('✅ Employee persisted to DB');
        } catch (err) {
          console.error('addEmployee DB error:', err);
        }
        get().addAuditLog({
          action: 'ADD_EMPLOYEE',
          entity_type: 'employee',
          entity_id: employee.id,
          new_values: `Added employee: ${employee.profile.full_name}`,
        });
        syncToServer(get);
      },

      updateEmployee: async (id, tenantUpdates, profileUpdates) => {
        const { employees } = get();
        set({
          employees: employees.map(e => {
            if (e.id !== id) return e;
            return {
              ...e,
              ...(tenantUpdates.email ? { email: tenantUpdates.email } : {}),
              profile: { ...e.profile, ...profileUpdates, updated_at: new Date() }
            };
          })
        });
        // Persist to PostgreSQL
        try {
          await dbService.updateEmployee(id, tenantUpdates, profileUpdates);
          console.log('✅ Employee updated in DB');
        } catch (err) {
          console.error('updateEmployee DB error:', err);
        }
        get().addAuditLog({
          action: 'UPDATE_EMPLOYEE',
          entity_type: 'employee',
          entity_id: id,
          new_values: JSON.stringify({ ...tenantUpdates, ...profileUpdates }),
        });
        syncToServer(get);
      },

      toggleEmployeeStatus: async (id) => {
        const { employees } = get();
        const emp = employees.find(e => e.id === id);
        const newActive = !emp?.is_active;
        set({ employees: employees.map(e => e.id === id ? { ...e, is_active: newActive } : e) });
        // Persist to PostgreSQL
        try {
          await dbService.toggleEmployeeStatus(id, newActive);
          console.log('✅ Employee status updated in DB');
        } catch (err) {
          console.error('toggleEmployeeStatus DB error:', err);
        }
        get().addAuditLog({
          action: newActive ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
          entity_type: 'employee',
          entity_id: id,
          new_values: newActive ? 'Activated' : 'Deactivated',
        });
        syncToServer(get);
      },

      // ── UTILITY ───────────────────────────────────────────────────────────
      checkStorage: () => {
        const state = get();
        if (state.tenant && state.isAuthenticated) {
          console.log('✅ Session active:', state.tenant.email);
        }
      },

      setNewCustomerStep: (step) => set({ newCustomerStep: step }),
      setNewCustomerData: (data) => set(s => ({ newCustomerData: { ...s.newCustomerData, ...data } })),
      clearNewCustomerData: () => set({ newCustomerData: {}, newCustomerStep: 0 }),
      resetReAuthAttempts: () => set({ reAuthAttempts: 0 }),
      setReAuthRequired: (required) => set({ reAuthRequired: required }),

      loadInitialData: async (tenantId: string) => {
        if (!isServerSyncEnabled()) {
          set({ syncFromServerComplete: true });
          return;
        }
        const snap = await fetchSnapshot(tenantId);
        if (!snap) {
          set({ syncFromServerComplete: true });
          return;
        }
        const s = get();
        set({
          appSettings: snap.appSettings ? (reviveDeep(snap.appSettings) as AppSettings) : s.appSettings,
          customers: Array.isArray(snap.customers) ? (snap.customers.map(reviveDeep) as Customer[]) : s.customers,
          policies: Array.isArray(snap.policies) ? (snap.policies.map(reviveDeep) as CustomerPolicy[]) : s.policies,
          documents: Array.isArray(snap.documents) ? (snap.documents.map(reviveDeep) as Document[]) : s.documents,
          claims: Array.isArray(snap.claims) ? (snap.claims.map(reviveDeep) as Claim[]) : s.claims,
          leads: Array.isArray(snap.leads) ? (snap.leads.map(reviveDeep) as Lead[]) : s.leads,
          notifications: Array.isArray(snap.notifications) ? (snap.notifications.map(reviveDeep) as Notification[]) : s.notifications,
          knowledgeArticles: Array.isArray(snap.knowledgeArticles)
            ? (snap.knowledgeArticles.map(reviveDeep) as KnowledgeArticle[])
            : s.knowledgeArticles,
          commissions: Array.isArray(snap.commissions) ? (snap.commissions.map(reviveDeep) as Commission[]) : s.commissions,
          renewals: Array.isArray(snap.renewals) ? (snap.renewals.map(reviveDeep) as Renewal[]) : s.renewals,
          auditLogs: Array.isArray(snap.auditLogs) ? (snap.auditLogs.map(reviveDeep) as AuditLog[]) : s.auditLogs,
          familyMembers: Array.isArray(snap.familyMembers) ? (snap.familyMembers.map(reviveDeep) as FamilyMember[]) : s.familyMembers,
          endorsements: Array.isArray(snap.endorsements) ? (snap.endorsements.map(reviveDeep) as Endorsement[]) : s.endorsements,
          complianceReports: Array.isArray(snap.complianceReports)
            ? (snap.complianceReports.map(reviveDeep) as ComplianceReport[])
            : s.complianceReports,
          employees: Array.isArray(snap.employees) ? (snap.employees.map(reviveDeep) as Employee[]) : s.employees,
          darkMode: typeof (snap as any).darkMode === 'boolean' ? (snap as any).darkMode : s.darkMode,
          syncFromServerComplete: true,
        });
      },

      // ── AUTOMATION ────────────────────────────────────────────────────────
      checkBirthdayNotifications: async () => {
        const { customers, tenant, appSettings } = get();
        const today = new Date();
        const todayStr = `${today.getMonth()}-${today.getDate()}`;
        const dateKey = today.toISOString().slice(0, 10);

        const tenantId = tenant?.id ?? 'tenant_001';
        const automationEnabled = Boolean(appSettings.whatsapp_automation_enabled);
        const birthdayEnabled = Boolean(appSettings.whatsapp_birthday_enabled);
        const template = (appSettings.whatsapp_birthday_template || '').trim();

        const fillTemplate = (tpl: string, vars: Record<string, string>) =>
          tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

        const ensureOptOut = (message: string) => {
          const hasStop = /stop/i.test(message);
          const hasOptOut = /opt\s*out/i.test(message) || /optout/i.test(message);
          const hasNotGuarantee = /not a guarantee|no guarantee/i.test(message);

          let out = message;
          if (!hasNotGuarantee) {
            out = `${out}\n\nThis is an agency reminder, not a guarantee.`;
          }
          if (hasStop && hasOptOut) return out;
          return `${out}\n\nReply STOP to opt out.`;
        };

        const MAX_WHATSAPP_SENDS_PER_RUN = 10;
        let sends = 0;

        for (const customer of customers.filter((c) => c.status === 'approved' && c.date_of_birth)) {
          if (sends >= MAX_WHATSAPP_SENDS_PER_RUN) break;
          const dob = new Date(customer.date_of_birth!);
          const dobStr = `${dob.getMonth()}-${dob.getDate()}`;

          if (dobStr !== todayStr) continue;

          const currentNotifications = get().notifications;
          const alreadyNotified = currentNotifications.some(
            (n) =>
              n.message.includes(customer.full_name) &&
              n.title.includes('Birthday') &&
              new Date(n.created_at).toDateString() === today.toDateString(),
          );

          const alreadyWhatsAppSent = currentNotifications.some(
            (n) =>
              n.title === 'WhatsApp Sent: Birthday' &&
              n.message.includes(customer.id) &&
              n.message.includes(dateKey),
          );

          // Keep existing in-app notification behavior.
          if (!alreadyNotified) {
            await get().addNotification({
              tenant_id: tenantId,
              title: `🎂 Birthday Today!`,
              message: `${customer.full_name}'s birthday! Call: ${customer.phone} | WhatsApp: https://wa.me/${customer.phone?.replace(/\D/g, '')}`,
              type: 'success',
              is_read: false,
              priority: 'medium',
              created_at: new Date(),
            });
          }

          if (!automationEnabled || !birthdayEnabled) continue;
          if (!template || alreadyWhatsAppSent) continue;
          if (!customer.phone) continue;

          const message = ensureOptOut(
            fillTemplate(template, {
              name: customer.full_name,
              phone: customer.phone,
            }),
          ).slice(0, 3800);

          try {
            const r = await postWhatsAppSend({ to: customer.phone, message });
            await get().addAuditLog({
              user_name: `${tenant?.name ?? 'system'} (${tenant?.role ?? 'unknown'})`,
              action: 'WHATSAPP_SEND_BIRTHDAY',
              entity_type: 'customer',
              entity_id: customer.id,
              new_values: `to=${customer.phone} result=${r.ok ? 'ok' : 'fail'} ${r.error ? `error=${r.error}` : ''}`.trim(),
            });

            if (r.ok) {
              await get().addNotification({
                tenant_id: tenantId,
                title: 'WhatsApp Sent: Birthday',
                message: `customerId=${customer.id} date=${dateKey}\n${message}`,
                type: 'success',
                is_read: false,
                priority: 'low',
                created_at: new Date(),
              });
              sends += 1;
            }
          } catch (e) {
            await get().addAuditLog({
              user_name: `${tenant?.name ?? 'system'} (${tenant?.role ?? 'unknown'})`,
              action: 'WHATSAPP_SEND_BIRTHDAY_ERROR',
              entity_type: 'customer',
              entity_id: customer.id,
              new_values: `to=${customer.phone} error=${e instanceof Error ? e.message : String(e)}`,
            });
          }
        }
      },

      checkRenewalNotifications: async () => {
        const { renewals, policies, customers, tenant, appSettings } = get();
        const now = new Date();

        const tenantId = tenant?.id ?? 'tenant_001';
        const automationEnabled = Boolean(appSettings.whatsapp_automation_enabled);
        const renewalEnabled = Boolean(appSettings.whatsapp_renewal_enabled);
        const template = (appSettings.whatsapp_renewal_template || '').trim();

        const fillTemplate = (tpl: string, vars: Record<string, string>) =>
          tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

        const ensureOptOut = (message: string) => {
          const hasStop = /stop/i.test(message);
          const hasOptOut = /opt\s*out/i.test(message) || /optout/i.test(message);
          const hasNotGuarantee = /not a guarantee|no guarantee/i.test(message);

          let out = message;
          if (!hasNotGuarantee) {
            out = `${out}\n\nThis is an agency reminder, not a guarantee.`;
          }
          if (hasStop && hasOptOut) return out;
          return `${out}\n\nReply STOP to opt out.`;
        };

        const MAX_WHATSAPP_SENDS_PER_RUN = 10;
        let sends = 0;

        const renewalCandidates = renewals.filter((r) => !r.processed && r.status === 'pending');
        for (const renewal of renewalCandidates) {
          if (sends >= MAX_WHATSAPP_SENDS_PER_RUN) break;
          const renewalDate = new Date(renewal.renewal_date);
          const daysLeft = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 30) continue;

          const policy = policies.find((p) => p.id === renewal.policy_id);
          const customer = customers.find((c) => c.id === policy?.customer_id);
          if (!policy || !customer) continue;

          const currentNotifications = get().notifications;
          const alreadyNotified = currentNotifications.some(
            (n) =>
              n.message.includes(policy.policy_number || '') &&
              new Date(n.created_at).toDateString() === now.toDateString(),
          );

          if (!alreadyNotified) {
            await get().addNotification({
              tenant_id: tenantId,
              title: daysLeft <= 7 ? '🚨 Urgent Renewal!' : '🔔 Renewal Reminder',
              message: `${customer.full_name}'s ${policy.policy_type} policy ${policy.policy_number} expires in ${daysLeft} days`,
              type: daysLeft <= 7 ? 'error' : 'warning',
              is_read: false,
              priority: daysLeft <= 7 ? 'urgent' : 'high',
              action_url: '/renewals',
              created_at: new Date(),
            });
          }

          const dateKey = now.toISOString().slice(0, 10);
          const alreadyWhatsAppSent = currentNotifications.some(
            (n) =>
              n.title === 'WhatsApp Sent: Renewal' &&
              n.message.includes(customer.id) &&
              n.message.includes(dateKey),
          );

          if (!automationEnabled || !renewalEnabled) continue;
          if (!template || alreadyWhatsAppSent) continue;
          if (!customer.phone) continue;

          const message = ensureOptOut(
            fillTemplate(template, {
              name: customer.full_name,
              phone: customer.phone,
              policy_type: policy.policy_type,
              policy_number: policy.policy_number,
              days_left: String(daysLeft),
            }),
          ).slice(0, 3800);

          try {
            const r = await postWhatsAppSend({ to: customer.phone, message });
            await get().addAuditLog({
              user_name: `${tenant?.name ?? 'system'} (${tenant?.role ?? 'unknown'})`,
              action: 'WHATSAPP_SEND_RENEWAL',
              entity_type: 'customer',
              entity_id: customer.id,
              new_values: `to=${customer.phone} result=${r.ok ? 'ok' : 'fail'} ${r.error ? `error=${r.error}` : ''}`.trim(),
            });

            if (r.ok) {
              await get().addNotification({
                tenant_id: tenantId,
                title: 'WhatsApp Sent: Renewal',
                message: `customerId=${customer.id} date=${dateKey}\n${message}`,
                type: 'success',
                is_read: false,
                priority: 'low',
                created_at: new Date(),
              });
              sends += 1;
            }
          } catch (e) {
            await get().addAuditLog({
              user_name: `${tenant?.name ?? 'system'} (${tenant?.role ?? 'unknown'})`,
              action: 'WHATSAPP_SEND_RENEWAL_ERROR',
              entity_type: 'customer',
              entity_id: customer.id,
              new_values: `to=${customer.phone} error=${e instanceof Error ? e.message : String(e)}`,
            });
          }
        }
      },
    }),
    {
      name: 'uv-insurance-v13',
      partialize: (state) => ({
        tenant: state.tenant,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
        sessionStart: state.sessionStart,
        loginAttempts: state.loginAttempts,
        isLocked: state.isLocked,
        lockoutUntil: state.lockoutUntil,
        appSettings: state.appSettings,
        darkMode: state.darkMode,
        customers: state.customers,
        policies: state.policies,
        documents: state.documents,
        claims: state.claims,
        leads: state.leads,
        notifications: state.notifications,
        knowledgeArticles: state.knowledgeArticles,
        commissions: state.commissions,
        renewals: state.renewals,
        auditLogs: state.auditLogs,
        familyMembers: state.familyMembers,
        endorsements: state.endorsements,
        complianceReports: state.complianceReports,
        employees: state.employees,
      }),
    }
  )
);
