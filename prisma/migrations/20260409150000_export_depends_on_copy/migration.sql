-- EXPORT must also wait for COPY (so CD rework can re-block EXPORT until new copy exists)
INSERT INTO "TaskDependency" ("id", "taskId", "dependsOnTaskId")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text) AS "id",
  t_export."id" AS "taskId",
  t_copy."id" AS "dependsOnTaskId"
FROM "Task" t_export
JOIN "Task" t_copy
  ON t_copy."briefId" = t_export."briefId" AND t_copy."stage" = 'COPY_DEVELOPMENT'
WHERE t_export."stage" = 'EXPORT'
  AND NOT EXISTS (
    SELECT 1 FROM "TaskDependency" d
    WHERE d."taskId" = t_export."id" AND d."dependsOnTaskId" = t_copy."id"
  );
