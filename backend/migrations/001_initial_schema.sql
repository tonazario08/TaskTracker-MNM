-- =============================================================================
-- TaskTracker — Database Bootstrap
-- PostgreSQL 14+
-- =============================================================================
-- Cảnh báo:
--   Script này DROP toàn bộ bảng TaskTracker và tạo lại từ đầu.
--   Chỉ dùng cho môi trường local/dev hoặc khi cần reset sạch.
--
-- Tài khoản demo sau khi import:
--   email    : admin@tasktracker.local
--   password : Admin@123  (hash SHA-256 — chỉ dùng cho dev seed)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. CLEANUP — xoá theo thứ tự phụ thuộc
-- ---------------------------------------------------------------------------

DROP VIEW  IF EXISTS v_project_summary  CASCADE;
DROP VIEW  IF EXISTS v_task_summary     CASCADE;

DROP TABLE IF EXISTS activity_logs      CASCADE;
DROP TABLE IF EXISTS task_attachments   CASCADE;
DROP TABLE IF EXISTS task_comments      CASCADE;
DROP TABLE IF EXISTS task_labels        CASCADE;
DROP TABLE IF EXISTS labels             CASCADE;
DROP TABLE IF EXISTS project_members    CASCADE;
DROP TABLE IF EXISTS tasks              CASCADE;
DROP TABLE IF EXISTS projects           CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

DROP TYPE  IF EXISTS member_role;
DROP TYPE  IF EXISTS task_priority;
DROP TYPE  IF EXISTS task_status;
DROP TYPE  IF EXISTS project_status;
DROP TYPE  IF EXISTS attachment_source;


-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------

CREATE TYPE project_status AS ENUM (
  'Planning',
  'Active',
  'On Hold',
  'Completed',
  'Archived'
);

CREATE TYPE task_status AS ENUM (
  'To Do',
  'In Progress',
  'In Review',
  'Blocked',
  'Done'
);

CREATE TYPE task_priority AS ENUM (
  'Low',
  'Medium',
  'High',
  'Urgent'
);

CREATE TYPE member_role AS ENUM (
  'Owner',
  'Admin',
  'Manager',
  'Member',
  'Viewer'
);

CREATE TYPE attachment_source AS ENUM (
  'upload',       -- file tải thẳng lên server
  'google_drive',
  'dropbox',
  'url'           -- link ngoài
);


-- ---------------------------------------------------------------------------
-- 2. TRIGGER FUNCTION — tự cập nhật updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Helper macro để gắn trigger (gọi sau mỗi CREATE TABLE cần updated_at)
-- Không có cú pháp macro trong PG nên ta dùng DO block inline ở cuối.


-- ---------------------------------------------------------------------------
-- 3. TABLES
-- ---------------------------------------------------------------------------

-- ── 3.1 users ───────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              BIGSERIAL    PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(320) NOT NULL,  -- RFC 5321 max 320 ký tự
  password_hash   VARCHAR(255) NOT NULL,  -- bcrypt / argon2 output, không lưu plain
  title           VARCHAR(255),
  avatar_url      TEXT,
  -- Màu avatar fallback khi chưa có ảnh (hex 6 chữ số)
  avatar_color    VARCHAR(7),
  bio             TEXT,
  timezone        VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  locale          VARCHAR(20)  NOT NULL DEFAULT 'vi-VN',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email             UNIQUE (email),
  CONSTRAINT chk_users_name_not_blank   CHECK  (BTRIM(name)  <> ''),
  CONSTRAINT chk_users_email_not_blank  CHECK  (BTRIM(email) <> ''),
  CONSTRAINT chk_users_email_format     CHECK  (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT chk_users_avatar_color     CHECK  (avatar_color IS NULL
                                                OR avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT chk_users_locale_format    CHECK  (locale ~ '^[a-z]{2,3}(-[A-Z]{2,4})?$'),
  CONSTRAINT chk_users_timezone_length  CHECK  (CHAR_LENGTH(BTRIM(timezone)) > 0)
);

-- ── 3.2 projects ────────────────────────────────────────────────────────────
-- id: slug ngắn gọn, chỉ chứa chữ thường/số/gạch ngang, tối đa 100 ký tự
CREATE TABLE projects (
  id                  VARCHAR(100) PRIMARY KEY,
  name                VARCHAR(255)   NOT NULL,
  description         TEXT,
  status              project_status NOT NULL DEFAULT 'Planning',
  -- progress tính toán từ tasks; cột này dùng để cache/override thủ công nếu cần
  progress            SMALLINT       NOT NULL DEFAULT 0,
  color_hex           VARCHAR(7),
  starts_on           DATE,
  due_on              DATE,
  archived_at         TIMESTAMPTZ,
  owner_user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_projects_id_format      CHECK  (id ~ '^[a-z0-9][a-z0-9\-]{0,98}[a-z0-9]$'
                                                  OR CHAR_LENGTH(id) = 1),
  CONSTRAINT chk_projects_name_not_blank CHECK  (BTRIM(name) <> ''),
  CONSTRAINT chk_projects_progress_range CHECK  (progress BETWEEN 0 AND 100),
  CONSTRAINT chk_projects_color_hex      CHECK  (color_hex IS NULL
                                                  OR color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT chk_projects_date_order     CHECK  (starts_on IS NULL
                                                  OR due_on IS NULL
                                                  OR due_on >= starts_on),
  CONSTRAINT chk_projects_archived_status CHECK (archived_at IS NULL
                                                  OR status = 'Archived')
);

-- ── 3.3 project_members ─────────────────────────────────────────────────────
CREATE TABLE project_members (
  project_id      VARCHAR(100)  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         BIGINT        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role            member_role   NOT NULL DEFAULT 'Member',
  -- Phần trăm thời gian phân bổ cho dự án này (0–100)
  allocation_pct  SMALLINT      NOT NULL DEFAULT 100,
  invited_by_user_id BIGINT     REFERENCES users(id) ON DELETE SET NULL,
  joined_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- Soft-delete: giữ lịch sử thành viên cũ thay vì xoá hẳn
  left_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  PRIMARY KEY (project_id, user_id),

  CONSTRAINT chk_pm_allocation_range CHECK (allocation_pct BETWEEN 0 AND 100),
  CONSTRAINT chk_pm_left_after_joined CHECK (left_at IS NULL OR left_at >= joined_at)
);

-- ── 3.4 labels ──────────────────────────────────────────────────────────────
-- Labels dùng chung cho toàn bộ workspace (có thể scope theo project nếu cần)
CREATE TABLE labels (
  id          BIGSERIAL    PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  color_hex   VARCHAR(7)   NOT NULL DEFAULT '#6B7280',
  project_id  VARCHAR(100) REFERENCES projects(id) ON DELETE CASCADE,
  -- NULL = label toàn workspace; NOT NULL = label riêng của project
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_labels_name_project UNIQUE (name, project_id),
  CONSTRAINT chk_labels_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT chk_labels_color_hex      CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- ── 3.5 tasks ────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id                  VARCHAR(100) PRIMARY KEY,
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  project_id          VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
  -- Subtask: tự tham chiếu, tối đa 1 cấp cha (giữ đơn giản)
  parent_task_id      VARCHAR(100) REFERENCES tasks(id)    ON DELETE SET NULL,
  status              task_status  NOT NULL DEFAULT 'To Do',
  priority            task_priority NOT NULL DEFAULT 'Medium',
  -- assignee_user_id là nguồn tin cậy; xoá cột assignee text trùng lặp
  assignee_user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  start_date          DATE,
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  estimate_hours      NUMERIC(7,2),
  actual_hours        NUMERIC(7,2),
  -- sort_order dùng float để reorder không cần cập nhật nhiều row
  -- (kỹ thuật: insert giữa 2 item = trung bình 2 giá trị float)
  sort_order          DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_tasks_id_format        CHECK  (id ~ '^[a-z0-9][a-z0-9\-]{0,98}[a-z0-9]$'
                                                  OR CHAR_LENGTH(id) = 1),
  CONSTRAINT chk_tasks_title_not_blank  CHECK  (BTRIM(title) <> ''),
  CONSTRAINT chk_tasks_date_order       CHECK  (start_date IS NULL
                                                  OR due_date IS NULL
                                                  OR due_date >= start_date),
  CONSTRAINT chk_tasks_estimate_nn      CHECK  (estimate_hours IS NULL OR estimate_hours >= 0),
  CONSTRAINT chk_tasks_actual_nn        CHECK  (actual_hours   IS NULL OR actual_hours   >= 0),
  -- Nếu status = Done thì completed_at phải có giá trị
  CONSTRAINT chk_tasks_completed_at     CHECK  (status <> 'Done' OR completed_at IS NOT NULL),
  -- Task không thể tự là cha của chính nó
  CONSTRAINT chk_tasks_no_self_parent   CHECK  (parent_task_id IS NULL OR parent_task_id <> id)
);

-- ── 3.6 task_labels (junction) ───────────────────────────────────────────────
CREATE TABLE task_labels (
  task_id     VARCHAR(100) NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
  label_id    BIGINT       NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (task_id, label_id)
);

-- ── 3.7 task_comments ────────────────────────────────────────────────────────
CREATE TABLE task_comments (
  id              BIGSERIAL    PRIMARY KEY,
  task_id         VARCHAR(100) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_user_id  BIGINT       REFERENCES users(id)          ON DELETE SET NULL,
  -- parent_comment_id cho phép trả lời (reply) 1 cấp
  parent_comment_id BIGINT     REFERENCES task_comments(id)  ON DELETE SET NULL,
  body            TEXT         NOT NULL,
  -- NULL = chưa sửa; NOT NULL = đã sửa ít nhất 1 lần
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_tc_body_not_blank      CHECK (BTRIM(body) <> ''),
  CONSTRAINT chk_tc_no_self_parent      CHECK (parent_comment_id IS NULL
                                                OR parent_comment_id <> id)
);

-- ── 3.8 task_attachments ─────────────────────────────────────────────────────
CREATE TABLE task_attachments (
  id              BIGSERIAL         PRIMARY KEY,
  task_id         VARCHAR(100)      NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploader_user_id BIGINT           REFERENCES users(id)          ON DELETE SET NULL,
  source          attachment_source NOT NULL DEFAULT 'upload',
  file_name       VARCHAR(500)      NOT NULL,
  file_url        TEXT              NOT NULL,
  -- bytes; NULL nếu là link ngoài không biết size
  file_size_bytes BIGINT,
  mime_type       VARCHAR(255),
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ta_file_name_not_blank CHECK (BTRIM(file_name) <> ''),
  CONSTRAINT chk_ta_file_url_not_blank  CHECK (BTRIM(file_url)  <> ''),
  CONSTRAINT chk_ta_file_size_nn        CHECK (file_size_bytes IS NULL
                                                OR file_size_bytes >= 0)
);

-- ── 3.9 activity_logs ────────────────────────────────────────────────────────
-- Bảng này là append-only (immutable audit log) — KHÔNG có updated_at
CREATE TABLE activity_logs (
  id            BIGSERIAL    PRIMARY KEY,
  actor_user_id BIGINT       REFERENCES users(id)    ON DELETE SET NULL,
  project_id    VARCHAR(100) REFERENCES projects(id) ON DELETE CASCADE,
  task_id       VARCHAR(100) REFERENCES tasks(id)    ON DELETE CASCADE,
  -- Ví dụ: 'task.created', 'task.status_changed', 'comment.added'
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50)  NOT NULL,
  entity_id     VARCHAR(100) NOT NULL,
  -- Lưu diff hoặc context tuỳ action
  metadata      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_al_action_not_blank       CHECK (BTRIM(action)      <> ''),
  CONSTRAINT chk_al_entity_type_not_blank  CHECK (BTRIM(entity_type) <> ''),
  CONSTRAINT chk_al_entity_id_not_blank    CHECK (BTRIM(entity_id)   <> '')
);


-- ---------------------------------------------------------------------------
-- 4. INDEXES
-- ---------------------------------------------------------------------------

-- users
CREATE UNIQUE INDEX uix_users_email_lower ON users (LOWER(email));
-- (thay thế index email thường để tìm kiếm case-insensitive)

-- projects
CREATE INDEX idx_projects_status         ON projects (status);
CREATE INDEX idx_projects_owner_user_id  ON projects (owner_user_id);
CREATE INDEX idx_projects_due_on         ON projects (due_on)
  WHERE due_on IS NOT NULL AND status NOT IN ('Completed', 'Archived');

-- project_members
CREATE INDEX idx_pm_user_id  ON project_members (user_id);
-- Lọc active members (chưa rời dự án)
CREATE INDEX idx_pm_active   ON project_members (project_id, user_id)
  WHERE left_at IS NULL;

-- tasks
CREATE INDEX idx_tasks_project_id        ON tasks (project_id);
CREATE INDEX idx_tasks_parent_task_id    ON tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_status            ON tasks (status);
CREATE INDEX idx_tasks_priority          ON tasks (priority);
CREATE INDEX idx_tasks_assignee_user_id  ON tasks (assignee_user_id) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX idx_tasks_due_date          ON tasks (due_date)
  WHERE due_date IS NOT NULL AND status <> 'Done';
CREATE INDEX idx_tasks_sort_order        ON tasks (project_id, sort_order);

-- task_labels
CREATE INDEX idx_task_labels_label_id  ON task_labels (label_id);

-- task_comments
CREATE INDEX idx_task_comments_task_id    ON task_comments (task_id);
CREATE INDEX idx_task_comments_parent_id  ON task_comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

-- task_attachments
CREATE INDEX idx_task_attachments_task_id ON task_attachments (task_id);

-- activity_logs
CREATE INDEX idx_al_actor_user_id  ON activity_logs (actor_user_id);
CREATE INDEX idx_al_project_id     ON activity_logs (project_id);
CREATE INDEX idx_al_task_id        ON activity_logs (task_id);
CREATE INDEX idx_al_created_at     ON activity_logs (created_at DESC);
CREATE INDEX idx_al_action         ON activity_logs (action);
-- GIN index để query metadata JSONB (ví dụ: metadata @> '{"field":"status"}')
CREATE INDEX idx_al_metadata_gin   ON activity_logs USING GIN (metadata);


-- ---------------------------------------------------------------------------
-- 5. TRIGGERS — updated_at
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'projects',
    'project_members',
    'tasks',
    'task_comments',
    'task_attachments'
    -- activity_logs: append-only, không cần updated_at
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- 6. VIEWS
-- ---------------------------------------------------------------------------

-- Tổng quan dự án: số task, hoàn thành, trễ hạn
CREATE VIEW v_project_summary AS
SELECT
  p.id,
  p.name,
  p.status,
  p.progress,
  p.due_on,
  p.owner_user_id,
  u.name                                                          AS owner_name,
  COUNT(t.id)                                                     AS task_count,
  COUNT(t.id) FILTER (WHERE t.status = 'Done')                   AS completed_task_count,
  COUNT(t.id) FILTER (WHERE t.status <> 'Done'
                        AND t.due_date IS NOT NULL
                        AND t.due_date < CURRENT_DATE)            AS overdue_task_count,
  -- % hoàn thành thực tế từ tasks (0 khi chưa có task)
  CASE
    WHEN COUNT(t.id) = 0 THEN 0
    ELSE ROUND(
      COUNT(t.id) FILTER (WHERE t.status = 'Done') * 100.0 / COUNT(t.id)
    )
  END                                                             AS computed_progress_pct
FROM projects p
LEFT JOIN users u ON u.id = p.owner_user_id
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name, p.status, p.progress, p.due_on, p.owner_user_id, u.name;


-- Chi tiết task kèm tên project và người được giao
CREATE VIEW v_task_summary AS
SELECT
  t.id,
  t.title,
  t.project_id,
  p.name                                                          AS project_name,
  t.parent_task_id,
  t.status,
  t.priority,
  t.assignee_user_id,
  u.name                                                          AS assignee_name,
  t.due_date,
  t.estimate_hours,
  t.actual_hours,
  t.sort_order,
  (
    t.due_date IS NOT NULL
    AND t.status <> 'Done'
    AND t.due_date < CURRENT_DATE
  )                                                               AS is_overdue,
  t.completed_at,
  t.created_at,
  t.updated_at
FROM tasks t
LEFT JOIN projects p ON p.id = t.project_id
LEFT JOIN users   u ON u.id = t.assignee_user_id;


-- ---------------------------------------------------------------------------
-- 7. SEED DATA
-- ---------------------------------------------------------------------------

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