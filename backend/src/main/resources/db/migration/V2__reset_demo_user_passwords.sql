-- Ensure demo credentials remain consistent across environments.
-- Password for all demo users: Admin@123
UPDATE users
SET password_hash = '$2a$12$i/T2drK09AKOKJYOsXmX1uRtopEZ68PBHwXbpeysRZM78uS0F3BEW'
WHERE username IN ('admin', 'manager1', 'employee1');
