-- Add identity evaluation stages (PostgreSQL enum extension)
ALTER TYPE "PrivateEvaluationStage" ADD VALUE 'IDENTITY_STRATEGY';
ALTER TYPE "PrivateEvaluationStage" ADD VALUE 'IDENTITY_ROUTES';
