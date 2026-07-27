import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  convertFieldToBytes,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../managed/feedback-board/contract/index.js";
import { type FeedbackBoardPrivateState, witnesses } from "../witnesses.js";

export class FeedbackBoardSimulator {
  readonly contract: Contract<FeedbackBoardPrivateState>;
  circuitContext: CircuitContext<FeedbackBoardPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<FeedbackBoardPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey }, "0".repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): FeedbackBoardPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public submitFeedback(feedback: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.submitFeedback(
      this.circuitContext,
      feedback,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public removeFeedback(): Ledger {
    this.circuitContext = this.contract.impureCircuits.removeFeedback(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public publicKey(): Uint8Array {
    const sequence = convertFieldToBytes(
      32,
      this.getLedger().sequence,
      "feedback-board-simulator.ts",
    );
    return this.contract.circuits.publicKey(
      this.circuitContext,
      this.getPrivateState().secretKey,
      sequence,
    ).result;
  }
}
