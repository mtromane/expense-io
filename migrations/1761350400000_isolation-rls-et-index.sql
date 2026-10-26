-- Up Migration
-- Isolation structurelle (ADR-006, ADR-007) et index des listes (PERF-02).
-- La migration initiale n'est pas modifiée ; users et companies ne changent pas.

-- 1. Entreprise de la note, recopiée depuis son auteur par un trigger (ADR-007).
ALTER TABLE expense_notes ADD COLUMN company_id uuid REFERENCES companies(id);
UPDATE expense_notes en SET company_id = u.company_id FROM users u WHERE u.id = en.user_id;
ALTER TABLE expense_notes ALTER COLUMN company_id SET NOT NULL;

CREATE FUNCTION expense_notes_set_company() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  SELECT company_id INTO NEW.company_id FROM users WHERE id = NEW.user_id;
  RETURN NEW;
END
$$;

CREATE TRIGGER expense_notes_set_company
  BEFORE INSERT ON expense_notes
  FOR EACH ROW EXECUTE FUNCTION expense_notes_set_company();

-- 2. Index des listes : employé (ses notes par date), manager et RH (notes en attente).
CREATE INDEX expense_notes_user_created_idx ON expense_notes (user_id, created_at);
CREATE INDEX expense_notes_pending_user_idx ON expense_notes (user_id, created_at) WHERE status = 'pending';
CREATE INDEX expense_notes_pending_company_idx ON expense_notes (company_id, created_at) WHERE status = 'pending';

-- 3. Policies réécrites : sous-requêtes non corrélées (calculées une fois par
--    requête, compatibles avec les index) ; la RH est limitée à son entreprise.
CREATE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

DROP POLICY expense_notes_owner_select ON expense_notes;
DROP POLICY expense_notes_owner_insert ON expense_notes;
DROP POLICY expense_notes_manager_select ON expense_notes;
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;

CREATE POLICY expense_notes_owner_select ON expense_notes
  FOR SELECT USING (user_id = app_current_user_id());

CREATE POLICY expense_notes_owner_insert ON expense_notes
  FOR INSERT WITH CHECK (user_id = app_current_user_id());

CREATE POLICY expense_notes_manager_select ON expense_notes
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE manager_id = app_current_user_id()));

CREATE POLICY expense_notes_manager_update ON expense_notes
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE manager_id = app_current_user_id()));

CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = app_current_user_id() AND role = 'hr_admin')
    AND user_id IN (SELECT id FROM users WHERE role = 'manager' AND manager_id IS NULL)
  );

CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = app_current_user_id() AND role = 'hr_admin')
    AND user_id IN (SELECT id FROM users WHERE role = 'manager' AND manager_id IS NULL)
  );

-- 4. Rôle applicatif sans privilège, pris dans chaque transaction scopée
--    (APP_DB_ROLE, défaut expense_app). Un rôle est global au cluster : créé
--    seulement s'il n'existe pas (base de perf recréée à chaque mesure).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'expense_app') THEN
    CREATE ROLE expense_app NOLOGIN;
  END IF;
END
$$;
GRANT expense_app TO CURRENT_USER;
GRANT SELECT, INSERT, UPDATE ON expense_notes TO expense_app;
GRANT SELECT ON users, companies TO expense_app;
GRANT USAGE ON SEQUENCE expense_notes_receipt_seq_seq TO expense_app;

-- Down Migration
REVOKE ALL ON expense_notes, users, companies FROM expense_app;
REVOKE USAGE ON SEQUENCE expense_notes_receipt_seq_seq FROM expense_app;

DROP POLICY expense_notes_owner_select ON expense_notes;
DROP POLICY expense_notes_owner_insert ON expense_notes;
DROP POLICY expense_notes_manager_select ON expense_notes;
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;
DROP FUNCTION app_current_user_id();

CREATE POLICY expense_notes_owner_select ON expense_notes
  FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
CREATE POLICY expense_notes_owner_insert ON expense_notes
  FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
CREATE POLICY expense_notes_manager_select ON expense_notes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id
    AND u.manager_id = nullif(current_setting('app.current_user_id', true), '')::uuid));
CREATE POLICY expense_notes_manager_update ON expense_notes
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id
    AND u.manager_id = nullif(current_setting('app.current_user_id', true), '')::uuid));
CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.role = 'manager' AND u.manager_id IS NULL)
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid AND hr.role = 'hr_admin'));
CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.role = 'manager' AND u.manager_id IS NULL)
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid AND hr.role = 'hr_admin'));

DROP INDEX expense_notes_pending_company_idx;
DROP INDEX expense_notes_pending_user_idx;
DROP INDEX expense_notes_user_created_idx;
DROP TRIGGER expense_notes_set_company ON expense_notes;
DROP FUNCTION expense_notes_set_company();
ALTER TABLE expense_notes DROP COLUMN company_id;
