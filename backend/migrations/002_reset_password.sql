-- Migration to support password reset feature
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;
