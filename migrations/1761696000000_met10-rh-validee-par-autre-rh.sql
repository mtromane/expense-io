-- Up Migration
-- MET-10 (réunion d'équipe du 2026-10-28, D13) : une RH sans manager est
-- validée par n'importe quelle autre RH de son entreprise, jamais par
-- elle-même. Les policies RH voient aussi les autres RH sans manager de
-- l'entreprise, sauf la RH courante. Seules les policies RH changent ; même
-- forme indexable (sous-requêtes non corrélées) que la migration précédente.
DROP POLICY expense_notes_hr_unmanaged_select ON expense_notes;
DROP POLICY expense_notes_hr_unmanaged_update ON expense_notes;

CREATE POLICY expense_notes_hr_unmanaged_select ON expense_notes
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    AND user_id = ANY (ARRAY(
      SELECT u.id FROM users u
      WHERE u.manager_id IS NULL AND u.role IN ('manager', 'employee', 'hr_admin')
        AND u.id <> (SELECT app_current_user_id())
        AND u.company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    ))
  );

CREATE POLICY expense_notes_hr_unmanaged_update ON expense_notes
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    AND user_id = ANY (ARRAY(
      SELECT u.id FROM users u
      WHERE u.manager_id IS NULL AND u.role IN ('manager', 'employee', 'hr_admin')
        AND u.id <> (SELECT app_current_user_id())
        AND u.company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    ))
  );

-- Down Migration
DROP POLICY expense_notes_hr_unmanaged_select ON expense_notes;
DROP POLICY expense_notes_hr_unmanaged_update ON expense_notes;

CREATE POLICY expense_notes_hr_unmanaged_select ON expense_notes
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    AND user_id = ANY (ARRAY(
      SELECT u.id FROM users u
      WHERE u.manager_id IS NULL AND u.role IN ('manager', 'employee')
        AND u.company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    ))
  );

CREATE POLICY expense_notes_hr_unmanaged_update ON expense_notes
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    AND user_id = ANY (ARRAY(
      SELECT u.id FROM users u
      WHERE u.manager_id IS NULL AND u.role IN ('manager', 'employee')
        AND u.company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    ))
  );
