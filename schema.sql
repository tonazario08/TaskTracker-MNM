-- TaskTracker Schema
-- Chạy file này trong PostgreSQL để tạo database

-- Bảng người dùng
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng dự án
CREATE TABLE IF NOT EXISTS projects (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(50)  NOT NULL DEFAULT 'Active',
  progress   INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Bảng công việc
CREATE TABLE IF NOT EXISTS tasks (
  id          VARCHAR(100) PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  project_id  VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
  status      VARCHAR(50)  NOT NULL DEFAULT 'To Do',
  priority    VARCHAR(50)  NOT NULL DEFAULT 'Medium',
  assignee    VARCHAR(255),
  due_date    DATE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Dữ liệu mẫu - Projects
INSERT INTO projects (id, name, status, progress) VALUES
  ('marketing', 'Q4 Marketing Campaign', 'Active',   72),
  ('website',   'Website Redesign V2',   'Active',   48),
  ('mobile',    'Mobile App Launch',     'Planning', 24)
ON CONFLICT (id) DO NOTHING;

-- Dữ liệu mẫu - Tasks
INSERT INTO tasks (id, title, project_id, status, priority, assignee, due_date) VALUES
  ('task-1', 'Finalize Q3 Marketing Report',    'marketing', 'In Progress', 'High',   'Alex Morgan',   '2026-05-01'),
  ('task-2', 'Review UI Design System Updates', 'website',   'In Review',   'Medium', 'Sarah Jenkins', '2026-05-03'),
  ('task-3', 'Schedule Client Sync Meeting',    'mobile',    'To Do',       'Low',    'Jordan Lee',    '2026-05-05')
ON CONFLICT (id) DO NOTHING;
