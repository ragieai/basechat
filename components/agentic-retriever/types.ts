import { z } from "zod";

const toolNames = z.enum(["plan", "search", "code", "answer", "transfer_to_citation", "transfer_to_surrender"]);

const responseCreatedSchema = z.object({
  type: z.literal("response.created"),
  sequence_number: z.number(),
});

const responseInProgressSchema = z.object({
  type: z.literal("response.in_progress"),
  sequence_number: z.number(),
});

const responseCompletedSchema = z.object({
  type: z.literal("response.completed"),
  sequence_number: z.number(),
});

const messageItemSchema = z.object({
  id: z.string(),
  content: z.array(z.string()),
  role: z.literal("assistant"),
  status: z.enum(["in_progress", "completed"]),
  type: z.literal("message"),
});

const functionCallItemSchema = z.object({
  id: z.string(),
  arguments: z.string(),
  call_id: z.string(),
  name: toolNames,
  status: z.enum(["in_progress", "completed"]),
  type: z.literal("function_call"),
});

const responseOutputItemAddedSchema = z.object({
  item: z.union([functionCallItemSchema, messageItemSchema]),
  type: z.literal("response.output_item.added"),
  output_index: z.number(),
  sequence_number: z.number(),
});

// const responseOutputItemDoneSchema = z.object({
//   item: z.object({
//     arguments: z.string(),
//   }),
//   type: z.literal("response.output_item.added"),
//   output_index: z.number(),
//   sequence_number: z.number(),
// });

const responseOutputItemDoneSchema = z.object({
  item: z.union([
    z.object({
      arguments: z.string(),
      call_id: z.string(),
      id: z.string(),
      name: toolNames,
      status: z.literal("completed"),
      type: z.literal("function_call"),
    }),
    z.object({
      id: z.string(),
      content: z.array(
        z.object({
          text: z.string(),
          type: z.union([z.literal("output_text"), z.literal("refusal")]),
        }),
      ),
      role: z.literal("assistant"),
      status: z.literal("completed"),
      type: z.literal("message"),
    }),
  ]),
  output_index: z.number(),
  sequence_number: z.number(),
  type: z.literal("response.output_item.done"),
});

const responseFunctionCallArgumentsDeltaSchema = z.object({
  delta: z.string(),
  item_id: z.string(),
  output_index: z.number(),
  sequence_number: z.number(),
  type: z.literal("response.function_call_arguments.delta"),
});

const responseFunctionCallArgumentsDoneSchema = z.object({
  arguments: z.string(),
  item_id: z.string(),
  output_index: z.number(),
  sequence_number: z.number(),
  type: z.literal("response.function_call_arguments.done"),
});

export const rawResponseEventSchema = z.union([
  responseOutputItemAddedSchema,
  responseOutputItemDoneSchema,
  responseFunctionCallArgumentsDeltaSchema,
  responseFunctionCallArgumentsDoneSchema,
  responseCreatedSchema,
  responseInProgressSchema,
  responseCompletedSchema,
]);

const stepTypeSchema = toolNames;

const searchEffortSchema = z.enum(["low", "medium", "high"]);

const baseEvidenceSchema = z.object({
  type: z.string(),
  text: z.string(),
});

const codeInterpreterEvidenceSchema = baseEvidenceSchema.extend({
  type: z.literal("code"),
  code: z.string(),
  code_issue: z.string(),
  code_result: z.string(),
});

const linkSchema = z.object({
  href: z.string().url(),
  type: z.string(),
});

const ragieEvidenceSchema = baseEvidenceSchema.extend({
  type: z.literal("ragie"),
  id: z.string(),
  document_id: z.string(),
  document_name: z.string(),
  metadata: z.record(z.any()).default({}),
  document_metadata: z.record(z.any()).default({}),
  links: z.record(z.string(), linkSchema).default({}),
  index: z.number(),
});

export const evidenceSchema = z.union([codeInterpreterEvidenceSchema, ragieEvidenceSchema]);

// const searchResultSchema = z.object({
//   text: z.string(),
//   id: z.string(),
//   index: z.number(),
//   document_name: z.string(),
//   document_id: z.string(),
//   document_metadata: z.record(z.any()),
//   links: z.record(linkSchema).default({}),
//   metadata: z.record(z.any()),
// });

const orchestratorDecisionSchema = z.object({
  type: stepTypeSchema,
  think: z.string(),
});

const stepResultBaseSchema = z.object({
  type: stepTypeSchema,
  think: z.string(),
  current_question: z.string(),
});

const answerSchema = z.object({
  text: z.string(),
  evidence: z.array(z.string()),
});

const answerStepSchema = stepResultBaseSchema.extend({
  type: z.literal("answer"),
  other_resolved_question_ids: z.array(z.string()).default([]),
  answer: answerSchema,
});

const evaluatedAnswerStepSchema = stepResultBaseSchema.extend({
  type: z.literal("evaluated_answer"),
  answer: answerSchema,
  other_resolved_question_ids: z.array(z.string()).default([]),
  eval_passed: z.boolean(),
  eval_reason: z.string(),
});

const searchSchema = z.object({
  search_requests: z.array(z.string()),
});

const queryDetailsSchema = z.object({
  query: z.string(),
  search_effort: searchEffortSchema,
  metadata_filter: z.record(z.any()),
  search_results: z.array(ragieEvidenceSchema).default([]),
});

const searchStepSchema = stepResultBaseSchema.extend({
  type: z.literal("search"),
  search: searchSchema,
  query_details: z.array(queryDetailsSchema).default([]),
  search_log: z.string().default(""),
});

const planStepSchema = stepResultBaseSchema.extend({
  type: z.literal("plan"),
  questions_to_answer: z.array(z.string()),
});

const codingStepSchema = stepResultBaseSchema.extend({
  type: z.literal("code"),
  code_issue: z.string(),
  code: z.string().default(""),
  code_result: z.string().default(""),
});

const surrenderStepSchema = stepResultBaseSchema.extend({
  type: z.literal("surrender"),
  partial_answer: answerSchema,
});

export const stepResultSchema = z.union([
  answerStepSchema,
  searchStepSchema,
  planStepSchema,
  codingStepSchema,
  surrenderStepSchema,
  evaluatedAnswerStepSchema,
]);

const usageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

const responseOutputTextSchema = z.object({
  text: z.string(),
  type: z.literal("output_text"),
});

const responseOutputRefusalSchema = z.object({
  refusal: z.string(),
  type: z.literal("refusal"),
});

const responseOutputMessageSchema = z.object({
  content: z.array(z.union([responseOutputTextSchema, responseOutputRefusalSchema])),
  role: z.string(),
  type: z.literal("message"),
});

const responseFunctionToolCallSchema = z.object({
  call_id: z.string(),
  name: z.string(),
  type: z.literal("function_call"),
  arguments: z.string(),
  id: z.string().nullable(),
  status: z.enum(["in_progress", "completed", "incomplete"]).nullable().default(null),
});

// const responseComputerToolCallSchema = z.object({
//   call_id: z.string(),
//   computer: z.object({
//     action: z.string(),
//     screenshot: z.boolean().optional(),
//   }),
//   type: z.literal("computer"),
// });

// const responseFileSearchToolCallSchema = z.object({
//   call_id: z.string(),
//   file_search: z.object({
//     query: z.string(),
//   }),
//   type: z.literal("file_search"),
// });

// const responseFunctionWebSearchSchema = z.object({
//   call_id: z.string(),
//   web_search: z.object({
//     query: z.string(),
//   }),
//   type: z.literal("web_search"),
// });

const responseCodeInterpreterToolCallSchema = z.object({
  call_id: z.string(),
  code_interpreter: z.object({
    input: z.string(),
  }),
  type: z.literal("code_interpreter"),
});

const responseReasoningItemSchema = z.object({
  content: z.string(),
  type: z.literal("reasoning"),
});

const mcpCallSchema = z.object({
  call_id: z.string(),
  mcp: z.object({
    method: z.string(),
    params: z.record(z.any()).optional(),
  }),
  type: z.literal("mcp"),
});

const mcpListToolsSchema = z.object({
  call_id: z.string(),
  mcp_list_tools: z.object({
    server_name: z.string().optional(),
  }),
  type: z.literal("mcp_list_tools"),
});

const mcpApprovalRequestSchema = z.object({
  call_id: z.string(),
  mcp_approval_request: z.object({
    message: z.string(),
    method: z.string(),
    params: z.record(z.any()).optional(),
  }),
  type: z.literal("mcp_approval_request"),
});

const mcpApprovalResponseSchema = z.object({
  call_id: z.string(),
  mcp_approval_response: z.object({
    approved: z.boolean(),
    reason: z.string().optional(),
  }),
  type: z.literal("mcp_approval_response"),
});

// Additional Tool Call Types
// const imageGenerationCallSchema = z.object({
//   call_id: z.string(),
//   image_generation: z.object({
//     prompt: z.string(),
//     size: z.string().optional(),
//     quality: z.string().optional(),
//   }),
//   type: z.literal("image_generation"),
// });

// const localShellCallSchema = z.object({
//   call_id: z.string(),
//   local_shell: z.object({
//     command: z.string(),
//     working_directory: z.string().optional(),
//   }),
//   type: z.literal("local_shell"),
// });

const functionCallOutputSchema = z.object({
  call_id: z.string(),
  output: z.string(),
  type: z.literal("function_call_output"),
});

// const computerCallOutputSchema = z.object({
//   call_id: z.string(),
//   output: z.string(),
//   type: z.literal("computer_call_output"),
// });

// const localShellCallOutputSchema = z.object({
//   call_id: z.string(),
//   output: z.string(),
//   type: z.literal("local_shell_call_output"),
// });

const responseInputItemParamSchema = z.union([
  z.object({
    content: z.string(),
    role: z.literal("user"),
  }),
  z.object({
    content: z.string(),
    role: z.literal("assistant"),
  }),
  functionCallOutputSchema,
  // computerCallOutputSchema,
  // localShellCallOutputSchema,
]);

const responseOutputItemSchema = z.union([
  responseOutputMessageSchema,
  responseFunctionToolCallSchema,
  // responseComputerToolCallSchema,
  // responseFileSearchToolCallSchema,
  // responseFunctionWebSearchSchema,
  responseCodeInterpreterToolCallSchema,
  mcpCallSchema,
  // imageGenerationCallSchema,
  // localShellCallSchema,
  responseReasoningItemSchema,
]);

const toolCallItemTypesSchema = z.union([
  responseFunctionToolCallSchema,
  // responseComputerToolCallSchema,
  // responseFileSearchToolCallSchema,
  // responseFunctionWebSearchSchema,
  mcpCallSchema,
  responseCodeInterpreterToolCallSchema,
  // imageGenerationCallSchema,
  // localShellCallSchema,
]);

const runItemBaseSchema = z.object({
  // agent: agentSchema,
  raw_item: z.any(),
});

const messageOutputItemSchema = runItemBaseSchema.extend({
  raw_item: responseOutputMessageSchema,
  type: z.literal("message_output_item"),
});

const handoffCallItemSchema = runItemBaseSchema.extend({
  raw_item: responseFunctionToolCallSchema,
  type: z.literal("handoff_call_item"),
});

const handoffOutputItemSchema = runItemBaseSchema.extend({
  raw_item: responseInputItemParamSchema,
  source_agent: z.string(),
  target_agent: z.string(),
  type: z.literal("handoff_output_item"),
});

const toolCallItemSchema = runItemBaseSchema.extend({
  raw_item: toolCallItemTypesSchema,
  type: z.literal("tool_call_item"),
});

const toolCallOutputItemSchema = runItemBaseSchema.extend({
  raw_item: functionCallOutputSchema,
  // raw_item: z.union([
  //   functionCallOutputSchema,
  //   computerCallOutputSchema,
  //   localShellCallOutputSchema,
  // ]),
  output: stepResultSchema,
  type: z.literal("tool_call_output_item"),
});

const reasoningItemSchema = runItemBaseSchema.extend({
  raw_item: responseReasoningItemSchema,
  type: z.literal("reasoning_item"),
});

const mcpListToolsItemSchema = runItemBaseSchema.extend({
  raw_item: mcpListToolsSchema,
  type: z.literal("mcp_list_tools_item"),
});

const mcpApprovalRequestItemSchema = runItemBaseSchema.extend({
  raw_item: mcpApprovalRequestSchema,
  type: z.literal("mcp_approval_request_item"),
});

const mcpApprovalResponseItemSchema = runItemBaseSchema.extend({
  raw_item: mcpApprovalResponseSchema,
  type: z.literal("mcp_approval_response_item"),
});

export const runItemSchema = z.union([
  messageOutputItemSchema,
  handoffCallItemSchema,
  handoffOutputItemSchema,
  toolCallItemSchema,
  toolCallOutputItemSchema,
  reasoningItemSchema,
  mcpListToolsItemSchema,
  mcpApprovalRequestItemSchema,
  mcpApprovalResponseItemSchema,
]);

export const orchestratorToolCallSchema = z.union([
  z.object({
    type: z.literal("plan"),
    arguments: z.object({
      plan: z.string(),
    }),
  }),
  z.object({
    type: z.literal("search"),
    arguments: z.object({
      query: z.string(),
    }),
  }),
  z.object({
    type: z.literal("code"),
    arguments: z.object({
      code_issue: z.string(),
    }),
  }),
  z.object({
    type: z.literal("answer"),
    arguments: z.object({
      answer: z.string(),
    }),
  }),
]);

const successfulResultSchema = z.object({
  type: z.literal("success"),
  data: z.object({
    text: z.string(),
    evidence: z.array(evidenceSchema).default([]),
    steps: z.array(stepResultSchema),
    diary: z.string().default(""),
  }),
});

const errorResultSchema = z.object({
  type: z.literal("error"),
  data: z.object({
    message: z.string(),
  }),
});

export const resultSchema = z.union([successfulResultSchema, errorResultSchema]);
