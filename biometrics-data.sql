-- Insert biometrics data for 9 patients
-- Note: Replace the UUIDs with actual patient IDs from your database

-- First, we need to map P001-P009 to actual patient UUIDs
-- You'll need to run a query to get the actual patient IDs based on medical_record_number
-- For now, this uses placeholder patient IDs that need to be replaced

-- Get patient UUIDs (run this query first to get actual IDs)
-- SELECT id, medical_record_number FROM patients WHERE medical_record_number IN ('P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008', 'P009');

-- Biometrics data insertion
-- Replace {patient_id_P001} etc. with actual UUIDs from the query above

-- Patient P001
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P001}', 'baseline', 482, 79, 1.0, 30.00, 152, 41, 61, 4.0),
  ('{patient_id_P001}', '3m', 457, 75.1, 1.0, 29.81, 148, 44, 58, 4.4),
  ('{patient_id_P001}', '6m', 429, 71.8, 0.9, 29.12, 156, 51, 56, 4.7),
  ('{patient_id_P001}', '12m', 378, 65.6, 0.8, 26.98, 160, 57, 50, 6.0);

-- Patient P002
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P002}', 'baseline', 495, 81, 1.0, 34.00, 148, 42, 68, 5.0),
  ('{patient_id_P002}', '3m', 470, 75.3, 1.0, 32.72, 155, 48, 67, 5.4),
  ('{patient_id_P002}', '6m', 445, 69.3, 1.0, 31.90, 160, 52, 61, 6.2),
  ('{patient_id_P002}', '12m', 404, 59.2, 0.8, 28.12, 172, 64, 56, 7.0);

-- Patient P003
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P003}', 'baseline', 468, 76, 1.0, 31.00, 162, 46, 58, 6.0),
  ('{patient_id_P003}', '3m', 443, 72.3, 0.9, 29.63, 160, 52, 56, 6.3),
  ('{patient_id_P003}', '6m', 410, 69.7, 0.8, 28.27, 159, 58, 54, 7.2),
  ('{patient_id_P003}', '12m', 357, 61.3, 0.7, 23.77, 172, 72, 49, 7.8);

-- Patient P004
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P004}', 'baseline', 455, 82, 1.1, 32.00, 145, 40, 72, 3.0),
  ('{patient_id_P004}', '3m', 440, 80, 1.0, 30.66, 142, 43, 71, 3.4),
  ('{patient_id_P004}', '6m', 436, 77, 1.0, 28.19, 137, 47, 68, 4.0),
  ('{patient_id_P004}', '12m', 413, 73.2, 0.9, 24.95, 137, 52, 64, 4.7);

-- Patient P005
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P005}', 'baseline', 478, 78, 1.0, 33.00, 150, 47, 66, 4.0),
  ('{patient_id_P005}', '3m', 443, 73.7, 1.0, 30.71, 153, 58, 63, 4.9),
  ('{patient_id_P005}', '6m', 416, 70.3, 0.9, 29.23, 162, 64, 61, 5.6),
  ('{patient_id_P005}', '12m', 363, 62.4, 0.9, 25.74, 168, 86, 55, 7.0);

-- Patient P006
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P006}', 'baseline', 460, 80, 1.2, 33.00, 232, 39, 64, 5.0),
  ('{patient_id_P006}', '3m', 447, 79.4, 1.1, 33.57, 212, 40, 68, 4.2),
  ('{patient_id_P006}', '6m', 441, 77.8, 1.1, 31.40, 190, 40, 67, 3.7),
  ('{patient_id_P006}', '12m', 431, 77.3, 1.1, 33.46, 143, 41, 72, 3.1);

-- Patient P007
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P007}', 'baseline', 470, 77, 1.0, 29.00, 155, 44, 55, 6.0),
  ('{patient_id_P007}', '3m', 465, 76.5, 1.0, 29.42, 157, 43, 59, 5.0),
  ('{patient_id_P007}', '6m', 459, 76.1, 1.0, 31.41, 153, 43, 63, 4.1),
  ('{patient_id_P007}', '12m', 465, 75.7, 1.0, 30.59, 152, 39, 73, 3.1);

-- Patient P008
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P008}', 'baseline', 420, 74, 1.0, 30.00, 159, 36, 62, 5.0),
  ('{patient_id_P008}', '3m', 391, 70, 0.9, 28.27, 160, 39, 57, 5.8),
  ('{patient_id_P008}', '6m', 373, 66.1, 0.8, 26.23, 168, 46, 55, 6.8),
  ('{patient_id_P008}', '12m', 309, 58.6, 0.7, 21.39, 164, 57, 49, 8.0);

-- Patient P009
INSERT INTO biometrics (patient_id, timepoint, six_minute_walk_distance, fev1_percent, gait_speed, grip_strength, ldl_c, alt, quality_of_life, fatigue_score)
VALUES
  ('{patient_id_P009}', 'baseline', 488, 75, 1.1, 31.00, 160, 43, 63, 4.0),
  ('{patient_id_P009}', '3m', 458, 74.1, 1.0, 28.96, 164, 47, 61, 4.5),
  ('{patient_id_P009}', '6m', 434, 72.6, 1.0, 28.52, 156, 52, 58, 4.6),
  ('{patient_id_P009}', '12m', 372, 67.9, 0.9, 24.34, 169, 61, 56, 6.2);