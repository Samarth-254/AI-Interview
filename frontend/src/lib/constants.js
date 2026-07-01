/**
 * Shared dropdown constants — imported by OnboardingPage and ProfilePage.
 * These feed directly into AI prompt interpolation, so keeping them as a
 * controlled set prevents garbage input from degrading question quality.
 */

export const JOB_ROLE_OPTIONS = [
  'SDE / Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist / ML Engineer',
  'DevOps / SRE',
  'Product Manager',
  'Sales',
  'Marketing',
  'Design (UI/UX)',
  'Operations',
  'Finance / Accounting',
  'Consulting',
  'Customer Support',
  'Other',
];

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'junior', label: 'Junior (0–2 yrs)' },
  { value: 'mid', label: 'Mid-Level (2–5 yrs)' },
  { value: 'senior', label: 'Senior (5+ yrs)' },
];

/**
 * Returns true if the given role value is a predefined list item (not 'Other' or custom free text).
 */
export const isKnownRole = (role) =>
  role && JOB_ROLE_OPTIONS.includes(role) && role !== 'Other';
