-- Optional agent on system tasks; intake artifact type for brief intake completion.
ALTER TYPE "ArtifactType" ADD VALUE 'INTAKE_SUMMARY';

ALTER TABLE "Task" ALTER COLUMN "agentType" DROP NOT NULL;
