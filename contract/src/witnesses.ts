/*
 * Private state and witness implementations for the Anonymous Feedback Board contract.
 */

import { Ledger } from "./managed/feedback-board/contract/index";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type FeedbackBoardPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createFeedbackBoardPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, FeedbackBoardPrivateState>): [
    FeedbackBoardPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
