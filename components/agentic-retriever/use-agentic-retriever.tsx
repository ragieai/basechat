import assert from "assert";

import { EventSourceMessage, fetchEventSource } from "@microsoft/fetch-event-source";
import { parse, OBJ, ARR, STR } from "partial-json";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { z } from "zod";

import { getRagieAgentsSearchPath } from "@/lib/paths";

import {
  inProgressCitationStepSchema,
  evidenceSchema,
  orchestratorThinkSchema,
  orchestratorToolCallSchema,
  rawResponseEventSchema,
  resultSchema,
  runItemSchema,
  stepResultSchema,
  finalAnswerSchema,
  ragieEvidenceSchema,
} from "./types";

type StepType = "think" | "search" | "code" | "answer" | "plan" | "citation" | "surrender";

type Run = {
  timestamp: string;
  stepTiming: Array<number>;
  steps: Array<z.infer<typeof stepResultSchema>>;
  query: string;
  result: z.infer<typeof finalAnswerSchema> | null;
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
  submit: (payload: { query: string; effort?: string }) => void;
  getRun: (id: string) => Run | null;
  getEvidence: (runId: string, evidenceId: string) => z.infer<typeof evidenceSchema> | null;
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
  payload: string; // raw JSON string from the event
};

type TakeDoneEvent = {
  type: "TAKE_DONE_EVENT";
  payload: z.infer<typeof finalAnswerSchema>;
};
type StartRun = {
  type: "START_RUN";
  payload: {
    runId: string;
    startTime: number;
  };
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

type AgenticRetrieverAction =
  | SetQueryAction
  | SetEffortAction
  | StartRun
  | TakeDoneEvent
  | ResetAction
  | RetryAction
  | SetErrorAction
  | TakeAgentUpdatedStreamEventAction
  | TakeRunItemStreamEventAction
  | TakeRawResponseEventAction;

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
      // console.log("Current in-progress response:", _inprogressResponse);
      // console.log("Current event:", parse(action.payload, OBJ | ARR | STR));
      // const parsed = rawResponseEventSchema.parse(parse(action.payload, OBJ | ARR | STR));
      console.debug("Raw event payload:", action.payload);
      const parsedRes = rawResponseEventSchema.safeParse(action.payload);
      if (!parsedRes.success) {
        console.error("Failed to parse raw response event:", action.payload, parsedRes.error);
        return state;
      }
      const parsed = parsedRes.data;
      let _streamedResponses = state._streamedResponses;
      switch (parsed.type) {
        case "response.created":
          console.log("Response created:", parsed);
          break;
        case "response.in_progress":
          console.log("In-progress response:", parsed);
          break;
        case "response.output_item.added":
          console.log("Output item added:", parsed);
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
          console.log("Handoff call item:", parsed);
          _inprogressResponse = "";
          break;
        case "response.output_text.delta":
          console.log("Output text delta:", parsed);
          _inprogressResponse += parsed.delta;
          break;
        case "response.function_call_arguments.delta":
          console.log("Function call arguments delta:", parsed);
          // TypeScript now knows parsed.delta exists because of discriminated union
          _inprogressResponse += parsed.delta;
          break;
        case "response.function_call_arguments.done":
          console.log("Function call arguments done:", parsed);
          try {
            const parsed = JSON.parse(state._inprogressResponse);
            _streamedResponses = [..._streamedResponses, { type: currentStepType || "think", data: parsed }];
          } catch (err) {
            console.error("Failed to parse function call arguments done:", state._inprogressResponse, err);
          }
          break;
        case "response.completed":
          console.log("Response completed:", parsed);
          break;
        default:
          console.log("Parsed response:", parsed);
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

    case "TAKE_DONE_EVENT": {
      return {
        ...state,
        pastRuns: {
          ...state.pastRuns,
          [state.runId || ""]: {
            timestamp: new Date().toISOString(),
            query: state.query,
            result: action.payload,
            stepTiming: state._stepTiming,
            steps: state.steps,
          },
        },
        status: "idle",
        currentStepType: null,
        steps: [],
        accumulatedText: "",
        runId: null,
        query: "",
        result: null,
        _streamedResponses: [],
        _agentUpdatedStreamEvent: [],
        _runItemStreamEvent: [],
        _rawResponseEvent: [],
        _allEvents: [],
        _inprogressResponse: "",
        _stepTiming: [],
      };
    }
    case "RESET": {
      if (state.status !== "loading") {
        return state;
      }
      return {
        ...state,
        status: "idle",
        query: "",
        result: null,
        accumulatedText: "",
        steps: [],
      };
    }
    case "RETRY": {
      // TODO: Implement retry logic
      return state;
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
  onStart: (runId: string) => Promise<void>;
  onDone: (payload: { result: z.infer<typeof finalAnswerSchema>; runId: string }) => Promise<void>;
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

  const close = useCallback(() => {
    console.log("Closing EventSource");
  }, []);

  const reset = useCallback(() => {
    console.log("Resetting agentic retrieval state");
    abortControllerRef.current?.abort();
    close();
    dispatch({ type: "RESET" });
  }, [close]);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    abortControllerRef.current = new AbortController();

    const handleError = async (e: EventSourceMessage) => {
      // Browsers fire 'error' on transient disconnects too; the stream may auto-retry.
      // You can inspect (e as any).data if your server sends a body with errors.
      console.error("Stream error:", e);
      dispatch({ type: "SET_ERROR", payload: e instanceof Error ? e.message : "Unknown error" });
      await onError(e instanceof Error ? e.message : "Unknown error");
    };

    const handleEvent = (e: EventSourceMessage) => {
      // Attempt to parse and handle different event types
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

    const handleDone = async (e: EventSourceMessage) => {
      console.log("Stream done event:", e.data);
      let doneEvent = resultSchema.safeParse(JSON.parse(e.data));
      if (!doneEvent.success) {
        console.error("Failed to parse done event:", e.data, doneEvent.error);
        dispatch({ type: "SET_ERROR", payload: "Failed to parse done event" });
        return;
      }
      if (doneEvent.data.type !== "success") {
        dispatch({ type: "SET_ERROR", payload: doneEvent.data.data.message });
        return;
      }
      dispatch({ type: "TAKE_DONE_EVENT", payload: doneEvent.data.data });
      assert(runId, "Run ID is required");
      await onDone({ result: doneEvent.data.data, runId });
      console.log("Stream closed", e.data);
    };

    let runId = "";

    // TODO: Obv stop hardcoding here and PROXY to the actual API
    await fetchEventSource(getRagieAgentsSearchPath(), {
      openWhenHidden: true,
      method: "POST",
      body: JSON.stringify({
        query: state.query,
        effort: state.effort, // was previously hard coded to "medium"
        stream: true,
        tenantSlug,
      }),
      async onmessage(event) {
        console.debug("Event:", event);
        if (event.event === "message") {
          handleEvent(event);
        } else if (event.event === "done") {
          await handleDone(event);
        } else if (event.event === "error") {
          await handleError(event);
        }
      },
      async onopen(response) {
        console.log("Stream opened");
        runId = response.headers.get("run-id")!;
        if (!runId) {
          throw new Error("Run ID is required");
        }
        await onStart(runId);
        dispatch({ type: "START_RUN", payload: { runId, startTime: Date.now() } });
      },
      async onclose() {
        console.log("Stream closed");
      },
      onerror(event) {
        console.error("Stream error:", event);
      },
      signal: abortControllerRef.current?.signal,
    });
  }, [dispatch, abortControllerRef, state.query, tenantSlug, onDone, onError, onStart]);

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

  console.log("currentResponse", currentResponse, state.currentStepType, partialJson);

  const evidence = useMemo(() => {
    const toolCallOutputs = state._runItemStreamEvent.filter((item) => item.type === "tool_call_output_item");
    const evidence = toolCallOutputs.reduce<EvidenceCollection>((acc, item, idx) => {
      if ("output" in item && item.output.type === "search") {
        // TODO: This is not deduping as expected
        const searchResultMap = item.output.query_details
          .flatMap((q) => q.search_results)
          .reduce<Record<string, z.infer<typeof evidenceSchema>>>((searchAcc, searchItem) => {
            console.log("searchItem", searchItem.id);
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
      console.log("getRun", runId, state.pastRuns[runId], state.pastRuns);
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

  console.log("state", state, new Set(state._rawResponseEvent.map((e) => e.type)));

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
      submit,
      getRun,
      reset,
      getEvidence,
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
    submit,
    getRun,
    reset,
    getEvidence,
  ]);

  return hookRes;
}
