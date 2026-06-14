
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('patient','doctor','assistant','admin');
CREATE TYPE public.treatment_type AS ENUM ('allopathic','homeopathic','herbal');
CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','completed','cancelled','no_show');
CREATE TYPE public.payment_status AS ENUM ('pending','verified','rejected','refunded');
CREATE TYPE public.gender_type AS ENUM ('male','female','other');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  date_of_birth date,
  gender public.gender_type,
  city text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_self" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- handle_new_user trigger: create profile + default patient role
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLINICS
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  phone text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics_read_all" ON public.clinics FOR SELECT USING (true);
CREATE POLICY "clinics_manage_owner" ON public.clinics FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- DOCTORS
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization text NOT NULL,
  treatment_type public.treatment_type NOT NULL,
  qualifications text,
  experience_years int NOT NULL DEFAULT 0,
  bio text,
  consultation_fee numeric(10,2) NOT NULL DEFAULT 0,
  diseases text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  total_reviews int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctors_public_read" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "doctors_insert_self" ON public.doctors FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "doctors_update_self" ON public.doctors FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_doctors_updated BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_doctors_treatment ON public.doctors(treatment_type);
CREATE INDEX idx_doctors_diseases ON public.doctors USING gin(diseases);

-- DOCTOR SCHEDULES (weekly slots)
CREATE TABLE public.doctor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctor_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedules TO authenticated;
GRANT ALL ON public.doctor_schedules TO service_role;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules_read_all" ON public.doctor_schedules FOR SELECT USING (true);
CREATE POLICY "schedules_manage_owner" ON public.doctor_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

-- ASSISTANTS (linked to doctors)
CREATE TABLE public.assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, doctor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistants TO authenticated;
GRANT ALL ON public.assistants TO service_role;
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assist_select_related" ON public.assistants FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);
CREATE POLICY "assist_manage_doctor" ON public.assistants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  reason text,
  symptoms text,
  share_history boolean NOT NULL DEFAULT false,
  fee numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt_select_related" ON public.appointments FOR SELECT TO authenticated USING (
  patient_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.assistants a WHERE a.doctor_id = appointments.doctor_id AND a.user_id = auth.uid())
);
CREATE POLICY "appt_insert_patient" ON public.appointments FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "appt_update_related" ON public.appointments FOR UPDATE TO authenticated USING (
  patient_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.assistants a WHERE a.doctor_id = appointments.doctor_id AND a.user_id = auth.uid())
);
CREATE TRIGGER trg_appts_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_appts_doctor_date ON public.appointments(doctor_id, appointment_date);
CREATE INDEX idx_appts_patient ON public.appointments(patient_id);

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'manual',
  transaction_reference text,
  proof_url text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_select_related" ON public.payments FOR SELECT TO authenticated USING (
  patient_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id
             WHERE a.id = appointment_id AND d.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.appointments a JOIN public.assistants asst ON asst.doctor_id = a.doctor_id
             WHERE a.id = appointment_id AND asst.user_id = auth.uid())
);
CREATE POLICY "pay_insert_patient" ON public.payments FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "pay_update_staff" ON public.payments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = appointment_id AND d.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.appointments a JOIN public.assistants asst ON asst.doctor_id = a.doctor_id
             WHERE a.id = appointment_id AND asst.user_id = auth.uid())
);
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PRESCRIPTIONS
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  diagnosis text NOT NULL,
  medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  advice text,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presc_select_related" ON public.prescriptions FOR SELECT TO authenticated USING (
  patient_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);
CREATE POLICY "presc_doctor_write" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);
CREATE POLICY "presc_doctor_update" ON public.prescriptions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);
CREATE TRIGGER trg_presc_updated BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- MEDICAL HISTORY
CREATE TABLE public.medical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition text NOT NULL,
  notes text,
  diagnosed_on date,
  allergies text[] NOT NULL DEFAULT '{}',
  current_medications text[] NOT NULL DEFAULT '{}',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_history TO authenticated;
GRANT ALL ON public.medical_history TO service_role;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_select_related" ON public.medical_history FOR SELECT TO authenticated USING (
  patient_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = medical_history.patient_id AND d.user_id = auth.uid() AND a.share_history = true
  )
);
CREATE POLICY "mh_manage_own" ON public.medical_history FOR ALL TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE TRIGGER trg_mh_updated BEFORE UPDATE ON public.medical_history FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_manage_own" ON public.reviews FOR ALL TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
