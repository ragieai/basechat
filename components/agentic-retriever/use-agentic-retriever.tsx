import { EventSourceMessage, fetchEventSource } from "@microsoft/fetch-event-source";
import { parse, OBJ, ARR, STR } from "partial-json";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { z } from "zod/v3";

import { getRagieAgentsSearchPath } from "@/lib/paths";

import {
  inProgressCitationStepSchema,
  evidenceSchema,
  orchestratorThinkSchema,
  orchestratorToolCallSchema,
  rawResponseEventSchema,
  runItemSchema,
  stepResultSchema,
  finalAnswerSchema,
} from "./types";

type StepType = "think" | "search" | "code" | "answer" | "plan" | "citation" | "surrender";

export type Run = {
  timestamp: string;
  stepTiming: Array<number>;
  steps: Array<z.infer<typeof stepResultSchema>>;
  query: string;
  result: z.infer<typeof finalAnswerSchema> | null;
  effort: string;
};

// TODO: test surrender step
type AgenticRetrieverState = {
  query: string;
  effort: string;
  runId: string | null;
  pastRuns: Record<string, Run>;
  result: null | z.infer<typeof finalAnswerSchema>;
  status: "idle" | "loading" | "error" | "success";
  currentStepType: StepType | null;
  accumulatedText: string;
  error: string | null;
  steps: Array<z.infer<typeof stepResultSchema>>;
  _stepTiming: Array<number>;
  _streamedResponses: Array<any>;
  _agentUpdatedStreamEvent: Array<z.infer<any>>;
  _runItemStreamEvent: Array<z.infer<typeof runItemSchema>>;
  _rawResponseEvent: Array<z.infer<typeof rawResponseEventSchema>>;
  _inprogressResponse: string;
  _allEvents: Array<any>;
};

type EvidenceCollection = Record<string, Array<z.infer<typeof evidenceSchema>>>;
export type AgenticRetriever = {
  steps: Array<z.infer<typeof stepResultSchema>>;
  status: AgenticRetrieverState["status"];
  currentStepType: AgenticRetrieverState["currentStepType"];
  query: string;
  currentResponse:
    | z.infer<typeof orchestratorToolCallSchema>
    | z.infer<typeof orchestratorThinkSchema>
    | z.infer<typeof inProgressCitationStepSchema>
    | null;
  result: AgenticRetrieverState["result"];
  evidence: EvidenceCollection;
  stepTiming: Array<number>;
  effort: string;
  submit: (payload: { query: string; effort?: string }) => void;
  getRun: (id: string) => Run | null;
  getEvidence: (runId: string, evidenceId: string) => z.infer<typeof evidenceSchema> | null;
  setPastRuns: (runs: Record<string, Run>) => void;
  reset: () => void;
};

type SetQueryAction = {
  type: "SET_QUERY";
  payload: string;
};

type SetEffortAction = {
  type: "SET_EFFORT";
  payload: string;
};

type TakeAgentUpdatedStreamEventAction = {
  type: "TAKE_AGENT_UPDATED_STREAM_EVENT";
  payload: any;
};
type TakeRunItemStreamEventAction = {
  type: "TAKE_RUN_ITEM_STREAM_EVENT";
  payload: {
    runItem: z.infer<typeof runItemSchema>;
    stepDoneTime: number;
  };
};
type TakeRawResponseEventAction = {
  type: "TAKE_RAW_RESPONSE_EVENT";
  payload: z.infer<typeof rawResponseEventSchema>;
};

type StartRun = {
  type: "START_RUN";
  payload: {
    runId: string;
    startTime: number;
  };
};

type CloseStreamAction = {
  type: "TAKE_CLOSE_STREAM";
};

type ResetAction = {
  type: "RESET";
};

type RetryAction = {
  type: "RETRY";
};

type SetErrorAction = {
  type: "SET_ERROR";
  payload: string;
};

type SetPastRunsAction = {
  type: "SET_PAST_RUNS";
  payload: Record<string, Run>;
};

type AgenticRetrieverAction =
  | SetQueryAction
  | SetEffortAction
  | StartRun
  | ResetAction
  | RetryAction
  | SetErrorAction
  | TakeAgentUpdatedStreamEventAction
  | TakeRunItemStreamEventAction
  | TakeRawResponseEventAction
  | CloseStreamAction
  | SetPastRunsAction;

const IGNORED_RAW_EVENT_TYPES = [
  "response.output_item.done",
  "response.output_text.done",
  "response.content_part.added",
  "response.content_part.done",
];

function agenticRetrieverReducer(state: AgenticRetrieverState, action: AgenticRetrieverAction): AgenticRetrieverState {
  switch (action.type) {
    case "SET_QUERY":
      if (action.payload === state.query) {
        return state;
      }
      return { ...state, status: "loading", query: action.payload };

    case "SET_EFFORT":
      return {
        ...state,
        effort: action.payload,
      };

    case "START_RUN":
      return { ...state, runId: action.payload.runId, _stepTiming: [action.payload.startTime] };

    case "TAKE_AGENT_UPDATED_STREAM_EVENT":
      return {
        ...state,
        _agentUpdatedStreamEvent: [...state._agentUpdatedStreamEvent, action.payload],
        _allEvents: [...state._allEvents, action.payload],
      };

    case "TAKE_RUN_ITEM_STREAM_EVENT": {
      let steps = state.steps;
      let _stepTiming = state._stepTiming;
      let currentStepType = state.currentStepType;
      if ("output" in action.payload.runItem) {
        steps = [...steps, stepResultSchema.parse(action.payload.runItem.output)];
        _stepTiming = [..._stepTiming, action.payload.stepDoneTime];
        currentStepType = "think";
      }
      return {
        ...state,
        steps,
        currentStepType,
        _runItemStreamEvent: [...state._runItemStreamEvent, action.payload.runItem],
        _stepTiming,
        _allEvents: [...state._allEvents, action.payload],
      };
    }

    case "TAKE_RAW_RESPONSE_EVENT": {
      let _inprogressResponse = state._inprogressResponse;
      let currentStepType = state.currentStepType;
      console.debug("Raw event payload:", action.payload);
      if (IGNORED_RAW_EVENT_TYPES.includes(action.payload.type)) {
        return state;
      }
      const parsedRes = rawResponseEventSchema.safeParse(action.payload);
      if (!parsedRes.success) {
        console.error("Failed to parse raw response event:", action.payload, parsedRes.error);
        return state;
      }
      const parsed = parsedRes.data;
      let _streamedResponses = state._streamedResponses;
      switch (parsed.type) {
        case "response.created":
          console.debug("Response created:", parsed);
          break;
        case "response.in_progress":
          console.debug("In-progress response:", parsed);
          break;
        case "response.output_item.added":
          console.debug("Output item added:", parsed);
          _inprogressResponse = "";
          // Check if the item is a function call (which has a name property)
          if (parsed.item.type === "function_call") {
            // Map tool names to step types
            const toolToStepType: Record<string, StepType> = {
              plan: "plan",
              search: "search",
              code: "code",
              answer: "answer",
              transfer_to_citation: "citation",
              // TODO: Handle surrender step
              transfer_to_surrender: "answer",
            };
            currentStepType = toolToStepType[parsed.item.name] || "think";
          }
          break;
        case "handoff_call_item":
          console.debug("Handoff call item:", parsed);
          _inprogressResponse = "";
          break;
        case "response.output_text.delta":
          console.debug("Output text delta:", parsed);
          _inprogressResponse += parsed.delta;
          break;
        case "response.function_call_arguments.delta":
          console.debug("Function call arguments delta:", parsed);
          // TypeScript now knows parsed.delta exists because of discriminated union
          _inprogressResponse += parsed.delta;
          break;
        case "response.function_call_arguments.done":
          console.debug("Function call arguments done:", parsed);
          try {
            const parsed = JSON.parse(state._inprogressResponse);
            _streamedResponses = [..._streamedResponses, { type: currentStepType || "think", data: parsed }];
          } catch (err) {
            console.error("Failed to parse function call arguments done:", state._inprogressResponse, err);
          }
          break;
        case "response.completed":
          console.debug("Response completed:", parsed);
          break;
        default:
          console.warn("Unhandled raw response event:", parsed);
      }

      return {
        ...state,
        currentStepType,
        _rawResponseEvent: [...state._rawResponseEvent, parsed],
        _allEvents: [...state._allEvents, parsed],
        _inprogressResponse,
        _streamedResponses,
      };
    }

    case "SET_ERROR": {
      return {
        ...state,
        error: action.payload,
      };
    }

    case "TAKE_CLOSE_STREAM": {
      // Inspect the last stream event and determine status
      if (state.error) {
        return {
          ...state,
          status: "error",
        };
      }
      const lastEvent = state._runItemStreamEvent[state._runItemStreamEvent.length - 1];
      if (lastEvent.type !== "message_output_item" || lastEvent.raw_item.content[0].type !== "output_text") {
        return {
          ...state,
          status: "error",
          error: "Unexpected terminal event",
        };
      }
      const finalAnswer = finalAnswerSchema.safeParse(JSON.parse(lastEvent.raw_item.content[0].text));
      if (!finalAnswer.success) {
        console.error("Failed to parse final answer:", lastEvent.raw_item.content[0].text, finalAnswer.error);
        return {
          ...state,
          error: "Failed to parse final answer",
          status: "error",
        };
      }
      return {
        ...state,
        result: finalAnswer.data,
        status: "success",
      };
    }

    case "RESET": {
      // TODO: Need to handle runs that errored
      return {
        effort: state.effort,
        pastRuns: state.result
          ? {
              ...state.pastRuns,
              [state.runId || ""]: {
                timestamp: new Date().toISOString(),
                query: state.query,
                result: state.result,
                stepTiming: state._stepTiming,
                steps: state.steps,
                effort: state.effort,
              },
            }
          : state.pastRuns,
        status: "idle",
        currentStepType: null,
        steps: [],
        accumulatedText: "",
        runId: null,
        query: "",
        result: null,
        error: null,
        _streamedResponses: [],
        _agentUpdatedStreamEvent: [],
        _runItemStreamEvent: [],
        _rawResponseEvent: [],
        _allEvents: [],
        _inprogressResponse: "",
        _stepTiming: [],
      };
    }
    case "RETRY": {
      // TODO: Implement retry logic
      return state;
    }
    case "SET_PAST_RUNS": {
      return {
        ...state,
        pastRuns: action.payload,
      };
    }
    default:
      return state;
  }
}

export default function useAgenticRetriever({
  tenantSlug,
  onDone,
  onError,
  onStart,
}: {
  tenantSlug: string;
  onStart: (payload: { runId: string; query: string; effort: string }) => Promise<void>;
  onDone: (payload: {
    result: z.infer<typeof finalAnswerSchema>;
    runId: string;
    query: string;
    effort: string;
    stepTiming: Array<number>;
  }) => Promise<void>;
  onError: (payload: string) => Promise<void>;
}): AgenticRetriever {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [state, dispatch] = useReducer(agenticRetrieverReducer, {
    query: "",
    effort: "medium",
    runId: null,
    status: "idle",
    pastRuns: {},
    result: null,
    currentStepType: null,
    accumulatedText: "",
    error: null,
    steps: [],
    _stepTiming: [],
    _streamedResponses: [],
    _agentUpdatedStreamEvent: [],
    _runItemStreamEvent: [],
    _rawResponseEvent: [],
    _allEvents: [],
    _inprogressResponse: "",
  });

  const submit = useCallback((payload: { query: string; effort?: string }) => {
    dispatch({ type: "SET_QUERY", payload: payload.query });
    dispatch({ type: "SET_EFFORT", payload: payload.effort || "medium" });
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    abortControllerRef.current = new AbortController();

    const handleEvent = (e: EventSourceMessage) => {
      // Parse and handle protocol event types
      try {
        const parsed = JSON.parse(e.data);
        console.debug("Parsed generic event:", parsed);
        switch (parsed.type) {
          case "agent_updated_stream_event":
            dispatch({ type: "TAKE_AGENT_UPDATED_STREAM_EVENT", payload: parsed });
            break;
          case "run_item_stream_event":
            dispatch({
              type: "TAKE_RUN_ITEM_STREAM_EVENT",
              payload: {
                runItem: runItemSchema.parse(parsed.data.item),
                stepDoneTime: Date.now(),
              },
            });
            break;
          case "raw_response_event":
            dispatch({ type: "TAKE_RAW_RESPONSE_EVENT", payload: parsed.data });
            break;
          default:
            console.warn("Unhandled event type:", parsed, parsed.type);
        }
      } catch (err) {
        console.error("Failed to parse generic event:", e.data, err);
      }
    };

    let runId = "";

    await fetchEventSource(getRagieAgentsSearchPath(), {
      openWhenHidden: true,
      method: "POST",
      body: JSON.stringify({
        input: state.query,
        reasoningText: {
          effort: state.effort,
        },
        tenantSlug,
      }),
      async onmessage(event) {
        console.debug("Event:", event);
        if (event.event === "message") {
          handleEvent(event);
        } else if (event.event === "error") {
          dispatch({ type: "SET_ERROR", payload: event.data });
        }
      },
      async onopen(response) {
        console.log("Stream opened");
        runId = response.headers.get("Response-Id")!;
        if (!runId) {
          dispatch({ type: "SET_ERROR", payload: "Response ID is required" });
          throw new Error("Response ID is required");
        }
        await onStart({ runId, query: state.query, effort: state.effort });
        dispatch({ type: "START_RUN", payload: { runId, startTime: Date.now() } });
      },
      async onclose() {
        console.debug("Stream closed");
        dispatch({ type: "TAKE_CLOSE_STREAM" });
      },
      onerror(event) {
        console.error("Stream error:", event);
        dispatch({ type: "SET_ERROR", payload: event instanceof Error ? event.message : "Unknown error" });
      },
      signal: abortControllerRef.current?.signal,
    });
  }, [dispatch, abortControllerRef, state.query, tenantSlug, onStart]);

  useEffect(() => {
    if (state.query) {
      // reset(); // reset state before starting a new query
      start();
    }
  }, [state.query, start, reset]);

  let partialJson = null;
  try {
    partialJson = state._inprogressResponse ? parse(state._inprogressResponse, OBJ | ARR | STR) : null;
    console.debug("partial-json", partialJson);
  } catch (err) {
    console.error("Failed to parse in progress response", state._inprogressResponse, err);
  }

  // TODO: Memoize currentResponse
  let currentResponse:
    | null
    | z.infer<typeof orchestratorToolCallSchema>
    | z.infer<typeof orchestratorThinkSchema>
    | z.infer<typeof inProgressCitationStepSchema> = null;
  if (state.currentStepType === "think") {
    currentResponse = { type: "think" };
  } else if (partialJson && state.currentStepType === "citation") {
    const safeParse = inProgressCitationStepSchema.safeParse({ ...partialJson, type: "citation" });
    if (safeParse.success) {
      currentResponse = safeParse.data;
    } else {
      console.error("Failed to parse in progress citation step schema", safeParse.error);
    }
  } else if (partialJson && Object.keys(partialJson).length > 0) {
    const safeParse = orchestratorToolCallSchema.safeParse({
      type: state.currentStepType,
      arguments: partialJson,
    });
    if (safeParse.success) {
      currentResponse = safeParse.data;
    } else {
      // If parsing fails, we can still return a partial response
      console.error(partialJson);
      console.error("Failed to parse orchestrator tool call schema", safeParse.error);
    }
  }

  console.debug("currentResponse", currentResponse, state.currentStepType, partialJson);

  const evidence = useMemo(() => {
    const toolCallOutputs = state._runItemStreamEvent.filter((item) => item.type === "tool_call_output_item");
    const evidence = toolCallOutputs.reduce<EvidenceCollection>((acc, item, idx) => {
      if ("output" in item && item.output.type === "search") {
        // TODO: This is not deduping as expected
        const searchResultMap = item.output.query_details
          .flatMap((q) => q.search_results)
          .reduce<Record<string, z.infer<typeof evidenceSchema>>>((searchAcc, searchItem) => {
            searchAcc[searchItem.id] = searchItem;
            return searchAcc;
          }, {});
        if (Object.keys(searchResultMap).length === 0) {
          return acc;
        }
        acc[String(idx)] = Object.entries(searchResultMap).map(([id, searchItem]) => searchItem);
      }
      if ("output" in item && item.output.type === "code") {
        // TODO: Hack. The code step does not have the same shape as evidence.
        // Maybe this should only get pulled if you used by an answer step?
        const codeInterpreterEvidence = evidenceSchema.parse({ ...item.output, text: item.output.code_result });
        acc[String(idx)] = [codeInterpreterEvidence];
      }
      return acc;
    }, {});
    return evidence;
  }, [state._runItemStreamEvent]);

  const getRun = useCallback(
    (runId: string) => {
      console.debug("getRun", runId, state.pastRuns[runId], state.pastRuns);
      if (runId in state.pastRuns) {
        return state.pastRuns[runId];
      }
      if (state.runId === runId) {
        // Construct run from current run in state
        return {
          runId,
          timestamp: new Date().toISOString(),
          query: state.query,
          result: state.result,
          stepTiming: state._stepTiming,
          steps: state.steps,
          effort: state.effort,
        };
      }
      return null;
    },
    [state],
  );

  const getEvidence = useCallback(
    (runId: string, evidenceId: string): z.infer<typeof evidenceSchema> | null => {
      const run = getRun(runId);
      if (!run) {
        return null;
      }

      if (run.result?.evidence) {
        const evidence = run.result.evidence.find((e) => {
          return e.type === "ragie" && "id" in e && e.id === evidenceId;
        });
        if (evidence) {
          return evidence;
        }
      }

      // If not found in final result, search in the stream events
      const searchStep = run.steps
        .filter((item) => item.type === "search")
        .find((item) => item.query_details.flatMap((q: any) => q.search_results).find((e: any) => e.id === evidenceId));

      if (searchStep) {
        const evidence = searchStep.query_details
          .flatMap((q: any) => q.search_results)
          .find((e: any) => e.id === evidenceId);

        if (evidence) {
          return evidence;
        }
      }
      return null;
    },
    [getRun],
  );

  // Invoke onDone or onError when a run completes
  useEffect(() => {
    async function handleDone() {
      if (state.result) {
        await onDone({
          result: state.result,
          runId: state.runId || "",
          query: state.query,
          effort: state.effort,
          stepTiming: state._stepTiming,
        });
        dispatch({ type: "RESET" });
        return;
      }

      if (state.error) {
        await onError(state.error);
        dispatch({ type: "RESET" });
        return;
      }
    }
    handleDone();
  }, [state.result, state.error, state.runId, state.query, state.effort, state._stepTiming, onDone, onError]);

  const setPastRuns = useCallback((runs: Record<string, Run>) => {
    dispatch({ type: "SET_PAST_RUNS", payload: runs });
  }, []);

  const hookRes = useMemo(() => {
    return {
      query: state.query,
      result: state.result,
      status: state.status,
      steps: state.steps,
      stepTiming: state._stepTiming,
      currentResponse,
      currentStepType: state.currentStepType,
      evidence,
      effort: state.effort,
      submit,
      getRun,
      reset,
      getEvidence,
      setPastRuns,
    };
  }, [
    state.query,
    state.result,
    state.status,
    state.steps,
    state._stepTiming,
    currentResponse,
    state.currentStepType,
    evidence,
    state.effort,
    submit,
    getRun,
    reset,
    getEvidence,
    setPastRuns,
  ]);

  return hookRes;
}
