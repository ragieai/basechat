import { parse, OBJ, ARR, STR } from "partial-json";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { z } from "zod";

import { evidenceSchema, rawResponseEventSchema, runItemSchema, stepResultSchema } from "./types";

type AgenticRetrieverState = {
  query: string;
  result: null | any;
  status: "idle" | "loading" | "error";
  currentStepType: "think" | "search" | "code" | "answer";
  accumulatedText: string;
  steps: Array<z.infer<typeof stepResultSchema>>;
  final: null | any;
  error: null | any;
  _agentUpdatedStreamEvent: Array<z.infer<any>>;
  _runItemStreamEvent: Array<z.infer<typeof runItemSchema>>;
  _rawResponseEvent: Array<z.infer<typeof rawResponseEventSchema>>;
  _inprogressResponse: string;
  _allEvents: Array<any>;
  _evidence: Array<{
    stepIndex: number;
    evidence: z.infer<typeof evidenceSchema>;
  }>;
};

export type AgenticRetriever = {
  deltas: any[];
  result: any;
  steps: Array<z.infer<typeof stepResultSchema>>;
  status: AgenticRetrieverState["status"];
  currentStepType: AgenticRetrieverState["currentStepType"];
  query: string;
  currentResponse: Record<string, any> | null;
  submit: (payload: { query: string }) => void;
  reset: () => void;
};

type SetQueryAction = {
  type: "SET_QUERY";
  payload: string;
};

type TakeAgentUpdatedStreamEventAction = {
  type: "TAKE_AGENT_UPDATED_STREAM_EVENT";
  payload: any;
};
type TakeRunItemStreamEventAction = {
  type: "TAKE_RUN_ITEM_STREAM_EVENT";
  payload: z.infer<typeof runItemSchema>;
};
type TakeRawResponseEventAction = {
  type: "TAKE_RAW_RESPONSE_EVENT";
  payload: string; // raw JSON string from the event
};

type TakeStepAction = {
  type: "TAKE_STEP";
  payload: z.infer<typeof stepResultSchema>;
};

type FinishAction = {
  type: "FINISH";
  payload: any;
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
  | FinishAction
  | ResetAction
  | RetryAction
  | SetErrorAction
  | TakeStepAction
  | TakeAgentUpdatedStreamEventAction
  | TakeRunItemStreamEventAction
  | TakeRawResponseEventAction;

// async function* streamText(resp: Response) {
//   const reader = resp.body!.pipeThrough(new TextDecoderStream()).getReader();
//   let buf = '';
//   for (; ;) {
//     const { value, done } = await reader.read();
//     if (done) break;
//     buf += value!;
//     try {
//       // allow half-built objects/arrays/strings during streaming
//       const snapshot = parse(buf, OBJ | ARR | STR);
//       yield snapshot;               // e.g., render to UI
//     } catch {
//       /* ignore until we have a parsable snapshot under the rules */
//     }
//   }
// }

function agenticRetrieverReducer(state: AgenticRetrieverState, action: AgenticRetrieverAction): AgenticRetrieverState {
  switch (action.type) {
    case "SET_QUERY":
      if (action.payload === state.query) {
        return state;
      }
      return { ...state, status: "loading", query: action.payload };

    case "TAKE_AGENT_UPDATED_STREAM_EVENT":
      return {
        ...state,
        _agentUpdatedStreamEvent: [...state._agentUpdatedStreamEvent, action.payload],
        _allEvents: [...state._allEvents, action.payload],
      };

    case "TAKE_RUN_ITEM_STREAM_EVENT":
      let steps = state.steps;
      console.log("TAKE_RUN_ITEM_STREAM_EVENT", action.payload);
      if ("output" in action.payload) {
        steps = [...steps, stepResultSchema.parse(action.payload.output)];
      }
      return {
        ...state,
        steps,
        _runItemStreamEvent: [...state._runItemStreamEvent, action.payload],
        _allEvents: [...state._allEvents, action.payload],
      };

    case "TAKE_RAW_RESPONSE_EVENT":
      console.log("TAKE_RAW_RESPONSE_EVENT", action.payload);
      let _inprogressResponse = state._inprogressResponse;
      let currentStepType = state.currentStepType;
      // console.log("Current in-progress response:", _inprogressResponse);
      // console.log("Current event:", parse(action.payload, OBJ | ARR | STR));
      // const parsed = rawResponseEventSchema.parse(parse(action.payload, OBJ | ARR | STR));
      const parsed = rawResponseEventSchema.parse(action.payload);
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
            const toolToStepType: Record<string, "think" | "search" | "code" | "answer"> = {
              reflect: "think",
              search: "search",
              code: "code",
              answer: "answer",
              transfer_to_citation: "answer",
              transfer_to_surrender: "answer",
            };
            currentStepType = toolToStepType[parsed.item.name] || "think";
          }
          break;
        case "response.function_call_arguments.delta":
          console.log("Function call arguments delta:", parsed);
          // TypeScript now knows parsed.delta exists because of discriminated union
          _inprogressResponse += parsed.delta;
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
        _inprogressResponse: _inprogressResponse,
      };

    case "FINISH": {
      if (state.status !== "loading") {
        return state;
      }
      return {
        ...state,
        status: "idle",
        result: action.payload,
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
        final: null,
        error: null,
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

export default function useAgenticRetriever(): AgenticRetriever {
  const esRef = useRef<EventSource | null>(null);
  const [state, dispatch] = useReducer(agenticRetrieverReducer, {
    query: "",
    result: null,
    status: "idle",
    currentStepType: "think",
    accumulatedText: "",
    steps: [],
    final: null,
    error: null,
    _agentUpdatedStreamEvent: [],
    _runItemStreamEvent: [],
    _rawResponseEvent: [],
    _allEvents: [],
    _inprogressResponse: "",
    _evidence: [], // Probably track by step
  });

  const submit = useCallback((payload: { query: string }) => {
    dispatch({ type: "SET_QUERY", payload: payload.query });
  }, []);

  const close = useCallback(() => {
    console.log("Closing EventSource");
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    console.log("Resetting agentic retrieval state");
    close();
    dispatch({ type: "RESET" });
  }, [close]);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    // if (!fullUrl) return;
    if (esRef.current) return; // already open

    // Note: native EventSource doesn’t allow custom headers.
    // If you need headers/bearer tokens, use a polyfill that supports them.
    const es = new EventSource(`http://localhost:8010/sse?query=${state.query}`, {});
    esRef.current = es;

    const handleDebug = (e: MessageEvent) => {
      console.log("Debug event:", e.data);
    };

    // const handleFinal = (e: MessageEvent) => {
    //   try {
    //     const finalAns = JSON.parse(e.data);
    //     dispatch({ type: "FINISH", payload: finalAns });
    //   } catch (err) {
    //     dispatch({ type: "SET_ERROR", payload: "Failed to parse final payload" });
    //   }
    // };

    const handleError = (e: Event) => {
      // Browsers fire 'error' on transient disconnects too; the stream may auto-retry.
      // You can inspect (e as any).data if your server sends a body with errors.
      console.error("Stream error:", e);
      dispatch({ type: "SET_ERROR", payload: e instanceof Error ? e.message : "Unknown error" });
    };

    const handleOpen = () => {
      console.log("Stream opened");
      // Note: SET_OPEN is not a valid action type, so we'll just log
    };

    // const handleAgentUpdatedStreamEvent = (e: MessageEvent) => {
    //   console.log("Agent updated stream event:", e.data);
    //   dispatch({ type: "TAKE_AGENT_UPDATED_STREAM_EVENT", payload: JSON.parse(e.data) });
    // };

    // const handleRunItemStreamEvent = (e: MessageEvent) => {
    //   console.log("Run item stream event:", e.data);
    //   try {
    //     dispatch({ type: "TAKE_RUN_ITEM_STREAM_EVENT", payload: runItemSchema.parse(JSON.parse(e.data)) });
    //   } catch (err) {
    //     console.error("Failed to parse run item stream event:", err);
    //     console.warn("Event data:", JSON.parse(e.data));
    //   }
    // };

    // const handleRawResponseEvent = (e: MessageEvent) => {
    //   dispatch({ type: "TAKE_RAW_RESPONSE_EVENT", payload: e.data });
    // };

    const handleEvent = (e: MessageEvent) => {
      console.log("Generic message event:", e.data, e);
      // Attempt to parse and handle different event types
      try {
        console.log("Parsing generic event data:", e.data, e, Object.prototype.toString.call(e.data));
        const parsed = JSON.parse(e.data);
        console.log("Parsed generic event:", parsed);
        switch (parsed.type) {
          case "agent_updated_stream_event":
            console.log("Dispatching agent updated stream event");
            dispatch({ type: "TAKE_AGENT_UPDATED_STREAM_EVENT", payload: parsed });
            break;
          case "run_item_stream_event":
            console.log("Dispatching run item stream event", parsed.item);
            dispatch({ type: "TAKE_RUN_ITEM_STREAM_EVENT", payload: runItemSchema.parse(parsed.item) });
            break;
          case "raw_response_event":
            console.log("Dispatching raw response event");
            dispatch({ type: "TAKE_RAW_RESPONSE_EVENT", payload: parsed.data });
            break;
          default:
            console.warn("Unhandled event type:", parsed.type);
        }
      } catch (err) {
        console.error("Failed to parse generic event:", err);
      }
    };

    const handleDone = () => {
      es.close();
      esRef.current = null;
      console.log("Stream closed");
    };

    // es.addEventListener("agent_updated_stream_event", handleAgentUpdatedStreamEvent as EventListener);
    // es.addEventListener("run_item_stream_event", handleRunItemStreamEvent as EventListener);
    // es.addEventListener("raw_response_event", handleRawResponseEvent as EventListener);
    es.addEventListener("open", handleOpen);
    es.addEventListener("message", handleEvent as EventListener);
    // es.addEventListener("answer", (...args) => console.log("Answer event:", args));
    // es.addEventListener("step", handleStep as EventListener);
    // es.addEventListener("final", handleFinal as EventListener);
    es.addEventListener("error", handleError as EventListener);
    es.addEventListener("debug", handleDebug as EventListener);
    es.addEventListener("done", handleDone as EventListener);
  }, [dispatch, esRef, state.query]);

  useEffect(() => {
    console.log("useAgenticRetrieval effect", state.query);
    if (state.query) {
      // reset(); // reset state before starting a new query
      console.log("---->>> DO START");
      start();
    }
  }, [state.query, start, reset]);

  const partialJson = state._inprogressResponse ? parse(state._inprogressResponse, OBJ | ARR | STR) : null;
  if (partialJson) {
    console.log("partial-json", partialJson);
  }

  console.log("state", state, new Set(state._rawResponseEvent.map((e) => e.type)));

  return {
    deltas: [], // Add missing deltas property
    query: state.query,
    result: state.result,
    status: state.status,
    steps: state.steps,
    currentResponse: partialJson,
    currentStepType: state.currentStepType,
    submit,
    reset,
  };
}
