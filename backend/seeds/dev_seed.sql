-- ── 7.1 Users ────────────────────────────────────────────────────────────────
-- password_hash = SHA-256('Admin@123')
-- LƯU Ý: chỉ dùng SHA-256 cho seed/dev. Production phải dùng bcrypt/argon2.
INSERT INTO users (id, name, email, password_hash, title, bio, timezone, locale, last_login_at)
VALUES
  (1, 'Quản trị viên',   'admin@tasktracker.local',   'f8cd9045f531e2bfc4192cbf71e5f09791ea21b8b5b9a3407e7d138df27e1d3c', 'System Admin',       'Tài khoản quản trị mặc định cho môi trường phát triển.',           'Asia/Ho_Chi_Minh', 'vi-VN', NOW()),
  (2, 'Nguyễn Minh Anh', 'minhanh@tasktracker.local', 'f8cd9045f531e2bfc4192cbf71e5f09791ea21b8b5b9a3407e7d138df27e1d3c', 'Product Lead',       'Phụ trách điều phối roadmap và ra quyết định sản phẩm.',            'Asia/Ho_Chi_Minh', 'vi-VN', NOW()),
  (3, 'Trần Thu Hà',     'thuha@tasktracker.local',   'f8cd9045f531e2bfc4192cbf71e5f09791ea21b8b5b9a3407e7d138df27e1d3c', 'Marketing Manager',  'Phụ trách chiến dịch marketing và vận hành nội dung.',              'Asia/Ho_Chi_Minh', 'vi-VN', NOW()),
  (4, 'Lê Quốc Bảo',    'quocbao@tasktracker.local', 'f8cd9045f531e2bfc4192cbf71e5f09791ea21b8b5b9a3407e7d138df27e1d3c', 'Engineering Manager','Phụ trách thực thi kỹ thuật và năng lực đội phát triển.',            'Asia/Ho_Chi_Minh', 'vi-VN', NOW());

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- ── 7.2 Projects ─────────────────────────────────────────────────────────────
INSERT INTO projects (id, name, description, status, progress, color_hex, starts_on, due_on, owner_user_id, created_by_user_id)
VALUES
  ('marketing', 'Chiến dịch marketing Q4',
   'Kế hoạch marketing đa kênh cho quý 4, bao gồm paid social, email và trang đích.',
   'Active', 72, '#4A90E2', '2026-04-10', '2026-06-30', 3, 1),

  ('website', 'Thiết kế lại website V2',
   'Làm mới website công ty theo design system mới và cải thiện chuyển đổi.',
   'Active', 48, '#50E3C2', '2026-04-01', '2026-07-15', 2, 1),

  ('mobile', 'Ra mắt ứng dụng di động',
   'Triển khai beta iOS/Android và chuẩn bị quy trình go-live.',
   'Planning', 24, '#F5A623', '2026-05-01', '2026-08-20', 4, 1);

-- ── 7.3 Project members ───────────────────────────────────────────────────────
INSERT INTO project_members (project_id, user_id, role, allocation_pct, invited_by_user_id)
VALUES
  ('marketing', 1, 'Admin',   20,  NULL),
  ('marketing', 3, 'Owner',  100,  1),
  ('marketing', 2, 'Viewer',  15,  1),
  ('website',   1, 'Admin',   20,  NULL),
  ('website',   2, 'Owner',  100,  1),
  ('website',   4, 'Manager', 40,  1),
  ('mobile',    1, 'Admin',   20,  NULL),
  ('mobile',    4, 'Owner',  100,  1);

-- ── 7.4 Labels ───────────────────────────────────────────────────────────────
INSERT INTO labels (id, name, color_hex, project_id)
VALUES
  (1, 'Bug',        '#EF4444', NULL),
  (2, 'Feature',    '#3B82F6', NULL),
  (3, 'Docs',       '#8B5CF6', NULL),
  (4, 'Design',     '#EC4899', NULL),
  (5, 'Backend',    '#F59E0B', NULL),
  (6, 'Frontend',   '#10B981', NULL),
  (7, 'Urgent',     '#DC2626', NULL);

SELECT setval('labels_id_seq', (SELECT MAX(id) FROM labels));

-- ── 7.5 Tasks ─────────────────────────────────────────────────────────────────
INSERT INTO tasks (
  id, title, description,
  project_id, status, priority,
  assignee_user_id, created_by_user_id,
  start_date, due_date, completed_at,
  estimate_hours, actual_hours, sort_order
) VALUES
  -- task-1 đang In Progress, chưa done → completed_at = NULL
  ('task-1',
   'Hoàn tất báo cáo marketing Q3',
   'Chốt số liệu, tổng hợp insight và gửi báo cáo cuối cho ban lãnh đạo.',
   'marketing', 'In Progress', 'High',
   3, 1, '2026-04-28', '2026-05-01', NULL,
   10, 6.5, 10),

  -- task-2 đang In Review, chưa done → completed_at = NULL
  ('task-2',
   'Rà soát cập nhật design system',
   'Kiểm tra các thay đổi thành phần cốt lõi trước khi đồng bộ sang website.',
   'website', 'In Review', 'Medium',
   2, 1, '2026-04-30', '2026-05-03', NULL,
   8, 7, 20),

  -- task-3 To Do
  ('task-3',
   'Lên lịch họp đồng bộ với khách hàng',
   'Xác nhận agenda, người tham gia và tài liệu trước cuộc họp.',
   'mobile', 'To Do', 'Low',
   4, 1, '2026-05-02', '2026-05-05', NULL,
   2, NULL, 30),

  -- task-4 Blocked, Urgent
  ('task-4',
   'Chốt ngân sách chiến dịch Q4',
   'Đối chiếu ngân sách paid social và phê duyệt với tài chính.',
   'marketing', 'Blocked', 'Urgent',
   1, 3, '2026-05-01', '2026-05-04', NULL,
   6, 3, 40),

  -- task-5 To Do
  ('task-5',
   'Chuẩn bị QA onboarding di động',
   'Hoàn thiện checklist, môi trường test và phân ca QA.',
   'mobile', 'To Do', 'High',
   4, 1, '2026-05-03', '2026-05-06', NULL,
   5, NULL, 50),

  -- task-6 Done (ví dụ có completed_at)
  ('task-6',
   'Thiết lập môi trường CI/CD',
   'Cấu hình GitHub Actions, Docker và deploy pipeline lên staging.',
   'mobile', 'Done', 'High',
   4, 4, '2026-04-15', '2026-04-25', '2026-04-24 10:30:00+07',
   12, 11, 60);

-- ── 7.6 Task labels ──────────────────────────────────────────────────────────
INSERT INTO task_labels (task_id, label_id) VALUES
  ('task-1', 2),   -- Feature
  ('task-2', 4),   -- Design
  ('task-2', 6),   -- Frontend
  ('task-4', 7),   -- Urgent
  ('task-5', 5),   -- Backend
  ('task-6', 5),   -- Backend
  ('task-6', 2);   -- Feature

-- ── 7.7 Task comments ────────────────────────────────────────────────────────
INSERT INTO task_comments (task_id, author_user_id, body) VALUES
  ('task-1', 3, 'Đã cập nhật số liệu từ paid social, đang chờ xác nhận doanh thu.'),
  ('task-2', 2, 'Đã duyệt phần token màu, cần kiểm tra lại component form.'),
  ('task-4', 1, 'Tài chính yêu cầu bổ sung phần dự báo CAC trước khi chốt.');

-- ── 7.8 Activity logs ────────────────────────────────────────────────────────
INSERT INTO activity_logs (actor_user_id, project_id, task_id, action, entity_type, entity_id, metadata)
VALUES
  (3, 'marketing', 'task-1', 'task.status_changed', 'task', 'task-1',
   '{"field":"status","from":"To Do","to":"In Progress"}'::jsonb),

  (2, 'website',   'task-2', 'task.review_requested', 'task', 'task-2',
   '{"reviewers":["design","frontend"]}'::jsonb),

  (1, 'mobile',    'task-5', 'task.created', 'task', 'task-5',
   '{"source":"seed"}'::jsonb),

  (4, 'mobile',    'task-6', 'task.status_changed', 'task', 'task-6',
   '{"field":"status","from":"In Review","to":"Done"}'::jsonb),

  (3, 'marketing', 'task-4', 'comment.added', 'task_comment', 'task-4',
   '{"preview":"Tài chính yêu cầu bổ sung phần dự báo CAC"}'::jsonb);


-- =============================================================================
-- DONE
-- =============================================================================
-- Kiểm tra nhanh:
--   SELECT * FROM v_project_summary;
--   SELECT * FROM v_task_summary WHERE is_overdue;
-- =============================================================================
