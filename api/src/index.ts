/**
 * Provides types and utilities for working with Anonymous Feedback Board contracts.
 *
 * @packageDocumentation
 */

import * as FeedbackBoard from '../../contract/src/managed/feedback-board/contract/index.js';

import { type ContractAddress, convertFieldToBytes } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type FeedbackBoardDerivedState,
  type FeedbackBoardContract,
  type FeedbackBoardProviders,
  type DeployedFeedbackBoardContract,
  feedbackBoardPrivateStateKey,
} from './common-types.js';
import { CompiledFeedbackBoardContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { FeedbackBoardPrivateState, createFeedbackBoardPrivateState } from '../../contract/src/witnesses.js';

export interface DeployedFeedbackBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<FeedbackBoardDerivedState>;

  submitFeedback: (feedback: string) => Promise<void>;
  removeFeedback: () => Promise<void>;
}

export class FeedbackBoardAPI implements DeployedFeedbackBoardAPI {
  private constructor(
    public readonly deployedContract: DeployedFeedbackBoardContract,
    providers: FeedbackBoardProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => FeedbackBoard.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  state: ledgerState.state === FeedbackBoard.State.OCCUPIED ? 'occupied' : 'vacant',
                  authorHash: toHex(ledgerState.authorHash),
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(feedbackBoardPrivateStateKey) as Promise<FeedbackBoardPrivateState>),
      ],
      (ledgerState, privateState) => {
        const hashedSecretKey = FeedbackBoard.pureCircuits.publicKey(
          privateState.secretKey,
          convertFieldToBytes(32, ledgerState.sequence, 'api/src/index.ts'),
        );

        return {
          state: ledgerState.state,
          feedback: ledgerState.feedback.value,
          sequence: ledgerState.sequence,
          totalSubmissions: ledgerState.totalSubmissions,
          isAuthor: toHex(ledgerState.authorHash) === toHex(hashedSecretKey),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<FeedbackBoardDerivedState>;

  async submitFeedback(feedback: string): Promise<void> {
    this.logger?.info(`submitFeedback: ${feedback}`);

    const txData = await (this.deployedContract.callTx as any).submitFeedback(feedback);

    this.logger?.trace({
      transactionAdded: {
        circuit: 'submitFeedback',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async removeFeedback(): Promise<void> {
    this.logger?.info('removeFeedback');

    const txData = await (this.deployedContract.callTx as any).removeFeedback();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'removeFeedback',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(providers: FeedbackBoardProviders, logger?: Logger): Promise<FeedbackBoardAPI> {
    logger?.info('deployContract');

    const deployedFeedbackBoardContract = await deployContract(providers, {
      compiledContract: CompiledFeedbackBoardContract as any,
      privateStateId: feedbackBoardPrivateStateKey,
      initialPrivateState: createFeedbackBoardPrivateState(utils.randomBytes(32)),
      args: []
    } as any);

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedFeedbackBoardContract.deployTxData.public,
      },
    });

    return new FeedbackBoardAPI(deployedFeedbackBoardContract, providers, logger);
  }

  static async join(
    providers: FeedbackBoardProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<FeedbackBoardAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedFeedbackBoardContract = await findDeployedContract(providers, {
      contractAddress,
      compiledContract: CompiledFeedbackBoardContract as any,
      privateStateId: feedbackBoardPrivateStateKey,
      initialPrivateState: await FeedbackBoardAPI.getPrivateState(providers, contractAddress),
      args: []
    } as any);

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedFeedbackBoardContract.deployTxData.public,
      },
    });

    return new FeedbackBoardAPI(deployedFeedbackBoardContract, providers, logger);
  }

  private static async getPrivateState(
    providers: FeedbackBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<FeedbackBoardPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(feedbackBoardPrivateStateKey);
    return existingPrivateState ?? createFeedbackBoardPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';

export * from './common-types.js';
