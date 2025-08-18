import { Terminal, Search, Code, Brain, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { stepResultSchema } from "./types";
import { AgenticRetriever } from "./use-agentic-retriever";

type Step = z.infer<typeof stepResultSchema>;

// Helper function to get step type information
function getStepTypeInfo(stepType: Step["type"]) {
  switch (stepType) {
    case "answer":
      return { icon: MessageSquare, color: "text-green-600", bgColor: "bg-green-100", label: "Answer" };
    case "evaluated_answer":
      return { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100", label: "Evaluated Answer" };
    case "search":
      return { icon: Search, color: "text-blue-600", bgColor: "bg-blue-100", label: "Search" };
    case "reflect":
      return { icon: Brain, color: "text-purple-600", bgColor: "bg-purple-100", label: "Reflect" };
    case "code":
      return { icon: Code, color: "text-green-600", bgColor: "bg-green-100", label: "Code" };
    case "surrender":
      return { icon: XCircle, color: "text-orange-600", bgColor: "bg-orange-100", label: "Surrender" };
    default:
      return { icon: Terminal, color: "text-gray-600", bgColor: "bg-gray-100", label: "Unknown" };
  }
}

// HoverCard component for individual steps
function StepHoverCard({ step, index }: { step: Step; index: number }) {
  const stepInfo = getStepTypeInfo(step.type);
  const Icon = stepInfo.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Dialog>
      <Popover open={isHovered} onOpenChange={setIsHovered}>
        <PopoverTrigger asChild>
          <DialogTrigger asChild>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:${stepInfo.bgColor} ${stepInfo.bgColor} ${stepInfo.color} cursor-pointer`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => setIsHovered(false)} // Close popover when clicked
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{index + 1}</span>
            </button>
          </DialogTrigger>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" side="bottom" align="start">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`h-5 w-5 ${stepInfo.color}`} />
              <h3 className="font-semibold text-lg">
                {stepInfo.label} Step {index + 1}
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-600 mb-1">Current Question:</h4>
                <p className="text-gray-900">{step.current_question}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-600 mb-1">Thought Process:</h4>
                <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs max-h-20 overflow-y-auto">{step.think}</p>
              </div>

              {/* Type-specific content preview */}
              {step.type === "answer" && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-1">Answer:</h4>
                  <p className="text-gray-900 text-xs max-h-16 overflow-y-auto">
                    {step.answer.text.substring(0, 150)}
                    {step.answer.text.length > 150 ? "..." : ""}
                  </p>
                </div>
              )}

              {step.type === "evaluated_answer" && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-1">Evaluation:</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      step.eval_passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {step.eval_passed ? "PASSED" : "FAILED"}
                  </span>
                </div>
              )}

              {step.type === "search" && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-1">Search Requests:</h4>
                  <p className="text-xs text-gray-700">{step.search.search_requests.length} search request(s)</p>
                </div>
              )}

              {step.type === "reflect" && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-1">Questions to Answer:</h4>
                  <p className="text-xs text-gray-700">{step.questions_to_answer.length} question(s) to reflect on</p>
                </div>
              )}

              {step.type === "code" && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-1">Code Issue:</h4>
                  <p className="text-xs text-red-700 bg-red-50 p-1 rounded">
                    {step.code_issue.substring(0, 100)}
                    {step.code_issue.length > 100 ? "..." : ""}
                  </p>
                </div>
              )}

              {step.type === "surrender" && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-1">Partial Answer:</h4>
                  <p className="text-xs text-orange-700 bg-orange-50 p-1 rounded">
                    {step.partial_answer.text.substring(0, 100)}
                    {step.partial_answer.text.length > 100 ? "..." : ""}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 italic">Click for full details</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${stepInfo.color}`} />
            {stepInfo.label} Step {index + 1} - Full Details
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">{renderStep(step, index)}</div>
      </DialogContent>
    </Dialog>
  );
}

// Step navigation component
function StepNavigation({ steps }: { steps: AgenticRetriever["steps"] }) {
  if (steps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
        <Terminal className="h-4 w-4" />
        <span className="font-medium">Steps:</span>
      </div>
      {steps.map((step, index) => (
        <StepHoverCard key={index} step={step} index={index} />
      ))}
    </div>
  );
}

// Individual step components for each branch of the union
function AnswerStep({ step }: { step: Step & { type: "answer" } }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-green-600" />
          Answer Step
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Current Question:</h4>
          <p className="text-sm">{step.current_question}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Thought Process:</h4>
          <p className="text-sm bg-gray-50 p-2 rounded">{step.think}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Answer:</h4>
          <p className="text-sm">{step.answer.text}</p>
        </div>
        {step.answer.evidence.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Evidence:</h4>
            <ul className="text-sm space-y-1">
              {step.answer.evidence.map((evidence, idx) => (
                <li key={idx} className="bg-blue-50 p-2 rounded text-blue-800">
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        )}
        {step.other_resolved_question_ids.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Other Resolved Questions:</h4>
            <div className="flex flex-wrap gap-1">
              {step.other_resolved_question_ids.map((id, idx) => (
                <span key={idx} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EvaluatedAnswerStep({ step }: { step: Step & { type: "evaluated_answer" } }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {step.eval_passed ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          Evaluated Answer Step
          <span
            className={`px-2 py-1 rounded text-xs ${
              step.eval_passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {step.eval_passed ? "PASSED" : "FAILED"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Current Question:</h4>
          <p className="text-sm">{step.current_question}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Thought Process:</h4>
          <p className="text-sm bg-gray-50 p-2 rounded">{step.think}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Answer:</h4>
          <p className="text-sm">{step.answer.text}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Evaluation Reason:</h4>
          <p
            className={`text-sm p-2 rounded ${
              step.eval_passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {step.eval_reason}
          </p>
        </div>
        {step.answer.evidence.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Evidence:</h4>
            <ul className="text-sm space-y-1">
              {step.answer.evidence.map((evidence, idx) => (
                <li key={idx} className="bg-blue-50 p-2 rounded text-blue-800">
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SearchStep({ step }: { step: Step & { type: "search" } }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-blue-600" />
          Search Step
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Current Question:</h4>
          <p className="text-sm">{step.current_question}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Thought Process:</h4>
          <p className="text-sm bg-gray-50 p-2 rounded">{step.think}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Search Requests:</h4>
          <ul className="text-sm space-y-1">
            {step.search.search_requests.map((request, idx) => (
              <li key={idx} className="bg-blue-50 p-2 rounded">
                {request}
              </li>
            ))}
          </ul>
        </div>
        {step.query_details.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Query Details:</h4>
            <div className="space-y-2">
              {step.query_details.map((query, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded">
                  <p className="font-medium text-sm">Query: {query.query}</p>
                  <p className="text-xs text-gray-600">Effort: {query.search_effort}</p>
                  <p className="text-xs text-gray-600">Results: {query.search_results.length}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {step.search_log && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Search Log:</h4>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{step.search_log}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReflectStep({ step }: { step: Step & { type: "reflect" } }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-purple-600" />
          Reflect Step
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Current Question:</h4>
          <p className="text-sm">{step.current_question}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Thought Process:</h4>
          <p className="text-sm bg-gray-50 p-2 rounded">{step.think}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Questions to Answer:</h4>
          <ul className="text-sm space-y-1">
            {step.questions_to_answer.map((question, idx) => (
              <li key={idx} className="bg-purple-50 p-2 rounded text-purple-800">
                {question}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function CodingStep({ step }: { step: Step & { type: "code" } }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code className="h-5 w-5 text-green-600" />
          Coding Step
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Current Question:</h4>
          <p className="text-sm">{step.current_question}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Thought Process:</h4>
          <p className="text-sm bg-gray-50 p-2 rounded">{step.think}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Code Issue:</h4>
          <p className="text-sm bg-red-50 p-2 rounded text-red-800">{step.code_issue}</p>
        </div>
        {step.code && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Code:</h4>
            <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
              <code>{step.code}</code>
            </pre>
          </div>
        )}
        {step.code_result && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Code Result:</h4>
            <pre className="text-sm bg-blue-50 p-2 rounded overflow-x-auto">{step.code_result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SurrenderStep({ step }: { step: Step & { type: "surrender" } }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <XCircle className="h-5 w-5 text-orange-600" />
          Surrender Step
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Current Question:</h4>
          <p className="text-sm">{step.current_question}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Thought Process:</h4>
          <p className="text-sm bg-gray-50 p-2 rounded">{step.think}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-1">Partial Answer:</h4>
          <p className="text-sm bg-orange-50 p-2 rounded text-orange-800">{step.partial_answer.text}</p>
        </div>
        {step.partial_answer.evidence.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Evidence:</h4>
            <ul className="text-sm space-y-1">
              {step.partial_answer.evidence.map((evidence, idx) => (
                <li key={idx} className="bg-blue-50 p-2 rounded text-blue-800">
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Render function that switches based on step type
function renderStep(step: Step, index: number) {
  const stepNumber = index + 1;

  switch (step.type) {
    case "answer":
      return <AnswerStep key={stepNumber} step={step} />;
    case "evaluated_answer":
      return <EvaluatedAnswerStep key={stepNumber} step={step} />;
    case "search":
      return <SearchStep key={stepNumber} step={step} />;
    case "reflect":
      return <ReflectStep key={stepNumber} step={step} />;
    case "code":
      return <CodingStep key={stepNumber} step={step} />;
    case "surrender":
      return <SurrenderStep key={stepNumber} step={step} />;
    default:
      // Fallback for unknown step types
      return (
        <Card key={stepNumber} className="mb-4">
          <CardHeader>
            <CardTitle>Unknown Step Type: {(step as any).type}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(step, null, 2)}</pre>
          </CardContent>
        </Card>
      );
  }
}
export default function AgenticResponse({ agenticRetriever }: { agenticRetriever: AgenticRetriever }) {
  return (
    <Alert variant="default">
      <Terminal />
      <AlertTitle>
        <StepNavigation steps={agenticRetriever.steps} />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-semibold">{agenticRetriever.currentStepType}ing</span>
          {agenticRetriever.steps.length > 0 && (
            <span className="text-sm text-gray-500">
              ({agenticRetriever.steps.length} step{agenticRetriever.steps.length !== 1 ? "s" : ""} completed)
            </span>
          )}
        </div>
      </AlertTitle>
      <AlertDescription>
        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <span>Current Response Data</span>
              <span className="group-open:rotate-90 transition-transform">▶</span>
            </summary>
            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(agenticRetriever.currentResponse, null, 2)}
            </pre>
          </details>
        </div>
      </AlertDescription>
    </Alert>
  );
}
