// Re-export contract types and runtime
export { State, ledger, pureCircuits } from "./managed/feedback-board/contract/index";
export type { Ledger } from "./managed/feedback-board/contract/index";

// Re-export witness types and implementations
export type { FeedbackBoardPrivateState } from "./witnesses";
export { createFeedbackBoardPrivateState, witnesses } from "./witnesses";

import { Contract } from "./managed/feedback-board/contract/index";
import { witnesses } from "./witnesses";
import { CompiledContract } from "@midnight-ntwrk/compact-js";

export const CompiledFeedbackBoardContract = CompiledContract.withWitnesses(
  CompiledContract.make('feedback-board', Contract),
  witnesses
);
