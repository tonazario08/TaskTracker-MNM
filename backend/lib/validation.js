const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const colorRegex = /^#[0-9A-Fa-f]{6}$/;
const projectStatuses = new Set(['Planning', 'Active', 'On Hold', 'Completed', 'Archived']);
const taskStatuses = new Set(['To Do', 'In Progress', 'In Review', 'Blocked', 'Done']);
const taskPriorities = new Set(['Low', 'Medium', 'High', 'Urgent']);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function requireNonEmptyString(value, fieldName, maxLength = 255) {
  const normalized = String(value || '').trim();
  if (!normalized) throw badRequest(`${fieldName} is required`);
  if (normalized.length > maxLength) throw badRequest(`${fieldName} is too long`);
  return normalized;
}

function optionalString(value, fieldName, maxLength = 1000) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const normalized = String(value).trim();
  if (normalized.length > maxLength) throw badRequest(`${fieldName} is too long`);
  return normalized;
}

function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (!emailRegex.test(normalized)) throw badRequest('Email is invalid');
  return normalized;
}

function validatePassword(password) {
  const normalized = String(password || '');
  if (normalized.length < 8) throw badRequest('Password must be at least 8 characters');
  if (normalized.length > 128) throw badRequest('Password is too long');
  return normalized;
}

function optionalEnum(value, allowed, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (!allowed.has(value)) throw badRequest(`${fieldName} is invalid`);
  return value;
}

function optionalColor(value, fieldName = 'Color') {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (!colorRegex.test(String(value))) throw badRequest(`${fieldName} must be a hex color like #AABBCC`);
  return String(value);
}

function optionalDate(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const normalized = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw badRequest(`${fieldName} must be in YYYY-MM-DD format`);
  return normalized;
}

function optionalInteger(value, fieldName, { min, max } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const normalized = Number(value);
  if (!Number.isInteger(normalized)) throw badRequest(`${fieldName} must be an integer`);
  if (min !== undefined && normalized < min) throw badRequest(`${fieldName} must be at least ${min}`);
  if (max !== undefined && normalized > max) throw badRequest(`${fieldName} must be at most ${max}`);
  return normalized;
}

function optionalNumber(value, fieldName, { min, max } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) throw badRequest(`${fieldName} must be a number`);
  if (min !== undefined && normalized < min) throw badRequest(`${fieldName} must be at least ${min}`);
  if (max !== undefined && normalized > max) throw badRequest(`${fieldName} must be at most ${max}`);
  return normalized;
}

function validateRegisterPayload(body) {
  return {
    name: requireNonEmptyString(body.name, 'Name'),
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  };
}

function validateLoginPayload(body) {
  return {
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  };
}

function validateProjectCreatePayload(body) {
  return {
    name: requireNonEmptyString(body.name, 'Project name'),
    description: optionalString(body.description, 'Description', 4000) ?? null,
    color: optionalColor(body.color),
    startsOn: optionalDate(body.startsOn, 'Start date'),
    dueDate: optionalDate(body.dueDate, 'Due date'),
    status: optionalEnum(body.status, projectStatuses, 'Project status') || 'Planning',
  };
}

function validateProjectUpdatePayload(body) {
  return {
    name: optionalString(body.name, 'Project name', 255),
    description: optionalString(body.description, 'Description', 4000),
    color: optionalColor(body.color),
    startsOn: optionalDate(body.startsOn, 'Start date'),
    dueDate: optionalDate(body.dueDate, 'Due date'),
    status: optionalEnum(body.status, projectStatuses, 'Project status'),
    progress: optionalInteger(body.progress, 'Progress', { min: 0, max: 100 }),
  };
}

function validateTaskPayload(body, { partial = false } = {}) {
  const title = partial ? optionalString(body.title, 'Task title', 500) : requireNonEmptyString(body.title, 'Task title', 500);
  return {
    title,
    description: optionalString(body.description, 'Description', 4000),
    projectId: optionalString(body.projectId, 'Project ID', 100),
    priority: optionalEnum(body.priority, taskPriorities, 'Task priority'),
    assigneeUserId: optionalInteger(body.assigneeUserId, 'Assignee user ID', { min: 1 }),
    dueDate: optionalDate(body.dueDate, 'Due date'),
    status: optionalEnum(body.status, taskStatuses, 'Task status'),
    parentTaskId: optionalString(body.parentTaskId, 'Parent task ID', 100),
    position: optionalNumber(body.position, 'Position'),
  };
}

function validateCommentPayload(body) {
  return {
    content: requireNonEmptyString(body.content, 'Comment content', 4000),
  };
}

function validateLabelPayload(body) {
  return {
    name: requireNonEmptyString(body.name, 'Label name', 100),
    color: optionalColor(body.color) || '#6B7280',
  };
}

function validateProfilePayload(body) {
  const payload = {
    name: requireNonEmptyString(body.name, 'Name'),
    email: validateEmail(body.email),
    password: body.password === undefined || body.password === '' ? undefined : validatePassword(body.password),
    currentPassword: body.currentPassword === undefined || body.currentPassword === '' ? undefined : String(body.currentPassword),
    bio: optionalString(body.bio, 'Bio', 4000),
    timezone: optionalString(body.timezone, 'Timezone', 100),
    locale: optionalString(body.locale, 'Locale', 20),
    title: optionalString(body.title, 'Title', 255),
    avatarUrl: optionalString(body.avatarUrl, 'Avatar URL', 2000),
  };

  if (payload.password && !payload.currentPassword) {
    throw badRequest('Current password is required to set a new password');
  }

  return payload;
}

module.exports = {
  badRequest,
  validateRegisterPayload,
  validateLoginPayload,
  validateProjectCreatePayload,
  validateProjectUpdatePayload,
  validateTaskPayload,
  validateCommentPayload,
  validateLabelPayload,
  validateProfilePayload,
};
