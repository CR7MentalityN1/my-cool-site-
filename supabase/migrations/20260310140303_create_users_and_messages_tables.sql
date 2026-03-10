/*
  # Create StudyConnect Database Schema

  ## Overview
  This migration creates the core tables for the StudyConnect platform - a student project collaboration platform.

  ## New Tables
  
  ### `profiles`
  Stores student profile information including:
  - `id` (uuid, primary key) - Unique profile identifier
  - `auth_id` (uuid, foreign key) - References auth.users for authentication
  - `email` (text) - Student email address
  - `name` (text) - Full name
  - `faculty` (text) - Academic faculty/department
  - `course` (integer) - Current year of study (1-4)
  - `skills` (text array) - List of student skills/technologies
  - `project_description` (text) - Description of desired project
  - `contacts` (text) - Contact information (Telegram/email)
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `messages`
  Stores chat messages including:
  - `id` (uuid, primary key) - Unique message identifier
  - `user_id` (uuid, foreign key) - References profiles table
  - `content` (text) - Message content
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - Enable RLS on all tables
  - Profiles: Users can read all profiles, but only update their own
  - Messages: Users can read all messages, but only create their own
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL,
  name text,
  faculty text,
  course integer CHECK (course >= 1 AND course <= 4),
  skills text[] DEFAULT '{}',
  project_description text,
  contacts text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_faculty ON profiles(faculty);
CREATE INDEX IF NOT EXISTS idx_profiles_course ON profiles(course);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Messages policies
CREATE POLICY "Anyone can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = messages.user_id
      AND profiles.auth_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();