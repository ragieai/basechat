import { Terminal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

import { AgenticRetriever } from "./use-agentic-retriever";
export default function AgenticResponse({ agenticRetriever }: { agenticRetriever: AgenticRetriever }) {
  return (
    <Alert variant="default">
      <Terminal />
      <AlertTitle>{agenticRetriever.currentStepType}ing</AlertTitle>
      <AlertDescription>{JSON.stringify(agenticRetriever.currentResponse, null, 2)}</AlertDescription>
    </Alert>
  );
}
