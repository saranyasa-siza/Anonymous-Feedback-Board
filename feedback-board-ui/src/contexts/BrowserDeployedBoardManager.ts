// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  FeedbackBoardAPI,
  type FeedbackBoardCircuitKeys,
  type FeedbackBoardProviders,
  type DeployedFeedbackBoardAPI,
} from '../../../api/src/index';
import { type ContractAddress, fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  type Observable,
  take,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import { type Logger } from 'pino';
import { ConnectedAPI, type InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {
  Binding,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { FeedbackBoardPrivateState } from '../../../contract/src/witnesses';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

/**
 * An in-progress bulletin board deployment.
 */
export interface InProgressBoardDeployment {
  readonly status: 'in-progress';
}

/**
 * A deployed bulletin board deployment.
 */
export interface DeployedBoardDeployment {
  readonly status: 'deployed';

  /**
   * The {@link DeployedFeedbackBoardAPI} instance when connected to an on network bulletin board contract.
   */
  readonly api: DeployedFeedbackBoardAPI;
}

/**
 * A failed bulletin board deployment.
 */
export interface FailedBoardDeployment {
  readonly status: 'failed';

  /**
   * The error that caused the deployment to fail.
   */
  readonly error: Error;
}

/**
 * A bulletin board deployment.
 */
export type BoardDeployment = InProgressBoardDeployment | DeployedBoardDeployment | FailedBoardDeployment;

/**
 * Provides access to bulletin board deployments.
 */
export interface DeployedBoardAPIProvider {
  /**
   * Gets the observable set of board deployments.
   *
   * @remarks
   * This property represents an observable array of {@link BoardDeployment}, each also an
   * observable. Changes to the array will be emitted as boards are resolved (deployed or joined),
   * while changes to each underlying board can be observed via each item in the array.
   */
  readonly boardDeployments$: Observable<Array<Observable<BoardDeployment>>>;

  /**
   * Joins or deploys a bulletin board contract.
   *
   * @param contractAddress An optional contract address to use when resolving.
   * @returns An observable board deployment.
   *
   * @remarks
   * For a given `contractAddress`, the method will attempt to find and join the identified bulletin board
   * contract; otherwise it will attempt to deploy a new one.
   */
  readonly resolve: (contractAddress?: ContractAddress) => Observable<BoardDeployment>;
}

/**
 * A {@link DeployedBoardAPIProvider} that manages bulletin board deployments in a browser setting.
 *
 * @remarks
 * {@link BrowserDeployedBoardManager} configures and manages a connection to the Midnight Lace
 * wallet, along with a collection of additional providers that work in a web-browser setting.
 */
export class BrowserDeployedBoardManager implements DeployedBoardAPIProvider {
  readonly #boardDeploymentsSubject: BehaviorSubject<Array<BehaviorSubject<BoardDeployment>>>;
  #initializedProviders: Promise<FeedbackBoardProviders> | undefined;

  /**
   * Initializes a new {@link BrowserDeployedBoardManager} instance.
   *
   * @param logger The `pino` logger to for logging.
   */
  constructor(private readonly logger: Logger, private walletAPI: ConnectedAPI | null = null) {
    this.#boardDeploymentsSubject = new BehaviorSubject<Array<BehaviorSubject<BoardDeployment>>>([]);
    this.boardDeployments$ = this.#boardDeploymentsSubject;
  }

  /** @inheritdoc */
  readonly boardDeployments$: Observable<Array<Observable<BoardDeployment>>>;

  setWallet(walletAPI: ConnectedAPI): void {
    this.walletAPI = walletAPI;
    this.#initializedProviders = undefined; // reset so next deploy uses the new wallet
  }

  /** @inheritdoc */
  resolve(contractAddress?: ContractAddress): Observable<BoardDeployment> {
    const deployments = this.#boardDeploymentsSubject.value;
    let deployment = deployments.find(
      (deployment) =>
        deployment.value.status === 'deployed' && deployment.value.api.deployedContractAddress === contractAddress,
    );

    if (deployment) {
      return deployment;
    }

    deployment = new BehaviorSubject<BoardDeployment>({
      status: 'in-progress',
    });

    if (contractAddress) {
      void this.joinDeployment(deployment, contractAddress);
    } else {
      void this.deployDeployment(deployment);
    }

    this.#boardDeploymentsSubject.next([...deployments, deployment]);

    return deployment;
  }

  private getProviders(): Promise<FeedbackBoardProviders> {
    if (!this.walletAPI) throw new Error('No wallet connected. Please connect your wallet first.');
    return this.#initializedProviders ?? (this.#initializedProviders = initializeProviders(this.logger, this.walletAPI));
  }

  private async deployDeployment(deployment: BehaviorSubject<BoardDeployment>): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await FeedbackBoardAPI.deploy(providers, this.logger);

      deployment.next({
        status: 'deployed',
        api,
      });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async joinDeployment(
    deployment: BehaviorSubject<BoardDeployment>,
    contractAddress: ContractAddress,
  ): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await FeedbackBoardAPI.join(providers, contractAddress, this.logger);

      deployment.next({
        status: 'deployed',
        api,
      });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

/** @internal */
const initializeProviders = async (logger: Logger, walletAPI: ConnectedAPI): Promise<FeedbackBoardProviders> => {
  const connectedAPI = await connectToWallet(logger, walletAPI);
  const zkConfigPath = window.location.origin;
  const keyMaterialProvider = new FetchZkConfigProvider<FeedbackBoardCircuitKeys>(zkConfigPath, fetch.bind(window));
  const config = await connectedAPI.getConfiguration();
  const proofServerUrl = config.proverServerUri || (import.meta.env.VITE_PROOF_SERVER_URL as string);
  const inMemoryFeedbackBoardPrivateStateProvider = inMemoryPrivateStateProvider<string, FeedbackBoardPrivateState>();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  logger.info({ proofServerUrl, walletProverUri: config.proverServerUri }, 'Using proof server');
  return {
    privateStateProvider: inMemoryFeedbackBoardPrivateStateProvider,
    zkConfigProvider: keyMaterialProvider,
    proofProvider: httpClientProofProvider(proofServerUrl, keyMaterialProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey(): string {
        return shieldedAddresses.shieldedCoinPublicKey;
      },
      getEncryptionPublicKey(): string {
        return shieldedAddresses.shieldedEncryptionPublicKey;
      },
      balanceTx: async (tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction> => {
        const maxRetries = 2;
        let lastError: Error | undefined;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            logger.info({ tx, ttl, attempt }, 'Balancing transaction via wallet');
            const serializedTx = toHex(tx.serialize());
            const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
            logger.info({ attempt }, 'Transaction balanced successfully');
            return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
              'signature',
              'proof',
              'binding',
              fromHex(received.tx),
            );
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            logger.warn({ error: lastError, attempt, maxRetries }, `Transaction balancing failed (attempt ${attempt}/${maxRetries})`);
            
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
            }
          }
        }
        
        logger.error({ error: lastError }, 'Transaction balancing failed after all retries');
        throw lastError ?? new Error('Transaction balancing failed after all retries');
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        const maxRetries = 3;
        let lastError: Error | undefined;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            logger.info({ attempt, maxRetries }, 'Submitting transaction via wallet');
            const serializedTx = toHex(tx.serialize());
            await connectedAPI.submitTransaction(serializedTx);
            const txIdentifiers = tx.identifiers();
            const txId = txIdentifiers[0];
            logger.info({ txId, attempt }, 'Transaction submitted successfully via wallet');
            return txId;
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            logger.warn({ error: lastError, attempt, maxRetries }, `Transaction submission failed (attempt ${attempt}/${maxRetries})`);
            
            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        }
        
        logger.error({ error: lastError }, 'Transaction submission failed after all retries');
        throw lastError ?? new Error('Transaction submission failed after all retries');
      },
    },
  };
};

/** @internal */
const connectToWallet = (logger: Logger, connectedAPI: ConnectedAPI): Promise<ConnectedAPI> => {
  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => connectedAPI),
      tap((api) => {
        logger.info(api, 'Using pre-connected wallet connector API');
      }),
      filter((api): api is ConnectedAPI => !!api),
      take(1),
      concatMap(async (api) => {
        const connectionStatus = await api.getConnectionStatus();
        logger.info(connectionStatus, 'Wallet connector API enabled status');
        if (connectionStatus.status !== 'connected') {
          throw new Error('Wallet is not connected.');
        }
        return api;
      }),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => {
            logger.error('Wallet connector API has failed to respond');
            return new Error('Midnight Lace wallet has failed to respond. Extension enabled?');
          }),
      }),
      catchError((error) =>
        throwError(() => {
          logger.error({ error }, 'Unable to enable connector API');
          return error instanceof Error ? error : new Error(String(error));
        }),
      ),
    ),
  );
};
