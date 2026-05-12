-- Add timezone support to contracts
ALTER TABLE contracts
ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';

COMMENT ON COLUMN contracts.timezone IS 'IANA timezone name for week boundary calculations';
