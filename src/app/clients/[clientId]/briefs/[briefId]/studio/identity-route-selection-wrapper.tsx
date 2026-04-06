import { IdentityRouteSelectionForm } from "./identity-route-selection";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function IdentityRouteSelectionWrapper({
  clientId,
  briefId,
  taskId,
  content,
}: {
  clientId: string;
  briefId: string;
  taskId: string;
  content: unknown;
}) {
  if (!isRecord(content)) return null;
  const routes = content.routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;
  const norm = routes.map((r) =>
    isRecord(r)
      ? {
          routeName: typeof r.routeName === "string" ? r.routeName : undefined,
          routeType: typeof r.routeType === "string" ? r.routeType : undefined,
        }
      : {},
  );
  const pref = content.founderPreferredRouteIndex;
  const currentPreferredIndex =
    typeof pref === "number" && Number.isInteger(pref) ? pref : null;
  const fb = content.founderRouteFeedback;
  const currentFeedback = typeof fb === "string" ? fb : "";

  return (
    <IdentityRouteSelectionForm
      clientId={clientId}
      briefId={briefId}
      taskId={taskId}
      routes={norm}
      currentPreferredIndex={currentPreferredIndex}
      currentFeedback={currentFeedback}
    />
  );
}
