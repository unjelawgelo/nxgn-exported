-- Migration: Add category and date columns to playlists table
ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS date text;
