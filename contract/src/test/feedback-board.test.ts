import { FeedbackBoardSimulator } from "./feedback-board-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";
import { State } from "../managed/feedback-board/contract/index.js";

setNetworkId("undeployed");

describe("FeedbackBoard smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const key = randomBytes(32);
    const simulator0 = new FeedbackBoardSimulator(key);
    const simulator1 = new FeedbackBoardSimulator(key);
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("properly initializes ledger state and private state", () => {
    const key = randomBytes(32);
    const simulator = new FeedbackBoardSimulator(key);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.sequence).toEqual(1n);
    expect(initialLedgerState.feedback.is_some).toEqual(false);
    expect(initialLedgerState.feedback.value).toEqual("");
    expect(initialLedgerState.authorHash).toEqual(new Uint8Array(32));
    expect(initialLedgerState.totalSubmissions).toEqual(0n);
    expect(initialLedgerState.state).toEqual(State.VACANT);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ secretKey: key });
  });

  it("lets you submit feedback", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    const initialPrivateState = simulator.getPrivateState();
    const feedback = "Great teamwork on the sprint demo!";
    simulator.submitFeedback(feedback);
    expect(initialPrivateState).toEqual(simulator.getPrivateState());
    const ledgerState = simulator.getLedger();
    expect(ledgerState.sequence).toEqual(1n);
    expect(ledgerState.feedback.is_some).toEqual(true);
    expect(ledgerState.feedback.value).toEqual(feedback);
    expect(ledgerState.authorHash).toEqual(simulator.publicKey());
    expect(ledgerState.totalSubmissions).toEqual(1n);
    expect(ledgerState.state).toEqual(State.OCCUPIED);
  });

  it("lets you remove feedback", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    const initialPrivateState = simulator.getPrivateState();
    const initialPublicKey = simulator.publicKey();
    const feedback = "Consider adding more documentation to the API.";
    simulator.submitFeedback(feedback);
    simulator.removeFeedback();
    expect(initialPrivateState).toEqual(simulator.getPrivateState());
    const ledgerState = simulator.getLedger();
    expect(ledgerState.sequence).toEqual(2n);
    expect(ledgerState.feedback.is_some).toEqual(false);
    expect(ledgerState.feedback.value).toEqual("");
    expect(ledgerState.authorHash).toEqual(initialPublicKey);
    expect(ledgerState.totalSubmissions).toEqual(1n);
    expect(ledgerState.state).toEqual(State.VACANT);
  });

  it("lets you submit feedback again after removing the first", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    const initialPrivateState = simulator.getPrivateState();
    simulator.submitFeedback("First feedback.");
    simulator.removeFeedback();
    const feedback = "Second anonymous feedback.";
    simulator.submitFeedback(feedback);
    expect(initialPrivateState).toEqual(simulator.getPrivateState());
    const ledgerState = simulator.getLedger();
    expect(ledgerState.sequence).toEqual(2n);
    expect(ledgerState.feedback.is_some).toEqual(true);
    expect(ledgerState.feedback.value).toEqual(feedback);
    expect(ledgerState.authorHash).toEqual(simulator.publicKey());
    expect(ledgerState.totalSubmissions).toEqual(2n);
    expect(ledgerState.state).toEqual(State.OCCUPIED);
  });

  it("lets a different user submit feedback after removing the first", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.submitFeedback("Anonymous suggestion from user A.");
    simulator.removeFeedback();
    simulator.switchUser(randomBytes(32));
    const feedback = "Anonymous suggestion from user B.";
    simulator.submitFeedback(feedback);
    const ledgerState = simulator.getLedger();
    expect(ledgerState.sequence).toEqual(2n);
    expect(ledgerState.feedback.is_some).toEqual(true);
    expect(ledgerState.feedback.value).toEqual(feedback);
    expect(ledgerState.authorHash).toEqual(simulator.publicKey());
    expect(ledgerState.state).toEqual(State.OCCUPIED);
  });

  it("doesn't let the same user submit twice while board is occupied", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.submitFeedback("First feedback on the board.");
    expect(() =>
      simulator.submitFeedback("Second feedback while board is occupied."),
    ).toThrow("failed assert: Attempted to submit feedback while board is occupied");
  });

  it("doesn't let different users submit while board is occupied", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.submitFeedback("Feedback from user A.");
    simulator.switchUser(randomBytes(32));
    expect(() =>
      simulator.submitFeedback("Feedback from user B while occupied."),
    ).toThrow("failed assert: Attempted to submit feedback while board is occupied");
  });

  it("doesn't let users remove someone else's feedback", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.submitFeedback("Anonymous feedback from the original author.");
    simulator.switchUser(randomBytes(32));
    expect(() => simulator.removeFeedback()).toThrow(
      "failed assert: Attempted to remove feedback, but not the original author",
    );
  });
});
