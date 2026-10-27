-- Up Migration
-- MET-02 (doc 22, sans arbitrage) : les notes d'un employé sans manager sont
-- validées par la RH de son entreprise, dans la même file que celles des
-- managers racine. Seules les policies RH changent ; même forme indexable que
-- la migration précédente, la liste des auteurs étant bornée à l'entreprise.
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;

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

-- Down Migration
DROP POLICY expense_notes_hr_unmanaged_select ON expense_notes;
DROP POLICY expense_notes_hr_unmanaged_update ON expense_notes;

CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    AND user_id = ANY (ARRAY(SELECT id FROM users WHERE role = 'manager' AND manager_id IS NULL))
  );

CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = (SELECT app_current_user_id()) AND role = 'hr_admin')
    AND user_id = ANY (ARRAY(SELECT id FROM users WHERE role = 'manager' AND manager_id IS NULL))
  );
