import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  FeedbackBoardAPI,
  type FeedbackBoardDerivedState,
  feedbackBoardPrivateStateKey,
  type FeedbackBoardProviders,
  type DeployedFeedbackBoardContract,
  type PrivateStateId,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger, State } from '../../contract/src/managed/feedback-board/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';
import { FeedbackBoardPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const getFeedbackBoardLedgerState = async (
  providers: FeedbackBoardProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new Anonymous Feedback Board contract
  2. Join an existing Anonymous Feedback Board contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (
  providers: FeedbackBoardProviders,
  rli: Interface,
  logger: Logger,
): Promise<FeedbackBoardAPI | null> => {
  let api: FeedbackBoardAPI | null = null;

  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await FeedbackBoardAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      case '2':
        api = await FeedbackBoardAPI.join(
          providers,
          await rli.question('What is the contract address (in hex)? '),
          logger,
        );
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: FeedbackBoardProviders,
  deployedFeedbackBoardContract: DeployedFeedbackBoardContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedFeedbackBoardContract.deployTxData.public.contractAddress;
  const ledgerState = await getFeedbackBoardLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no feedback board contract deployed at ${contractAddress}`);
  } else {
    const boardState = ledgerState.state === State.OCCUPIED ? 'occupied' : 'vacant';
    const latestFeedback = !ledgerState.feedback.is_some ? 'none' : ledgerState.feedback.value;
    logger.info(`Current state is: '${boardState}'`);
    logger.info(`Current feedback is: '${latestFeedback}'`);
    logger.info(`Total submissions: ${ledgerState.totalSubmissions}`);
    logger.info(`Current sequence is: ${ledgerState.sequence}`);
    logger.info(`Current author hash is: '${toHex(ledgerState.authorHash)}'`);
  }
};

const displayPrivateState = async (providers: FeedbackBoardProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(feedbackBoardPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing feedback board private state`);
  } else {
    logger.info(`Current secret key is: ${toHex(privateState.secretKey)}`);
  }
};

const displayDerivedState = (ledgerState: FeedbackBoardDerivedState | undefined, logger: Logger) => {
  if (ledgerState === undefined) {
    logger.info(`No feedback board state currently available`);
  } else {
    const boardState = ledgerState.state === State.OCCUPIED ? 'occupied' : 'vacant';
    const latestFeedback = ledgerState.state === State.OCCUPIED ? ledgerState.feedback : 'none';
    logger.info(`Current state is: '${boardState}'`);
    logger.info(`Current feedback is: '${latestFeedback}'`);
    logger.info(`Total submissions: ${ledgerState.totalSubmissions}`);
    logger.info(`Current sequence is: ${ledgerState.sequence}`);
    logger.info(`Current author is: '${ledgerState.isAuthor ? 'you' : 'anonymous (not you)'}'`);
  }
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Submit anonymous feedback
  2. Remove your feedback
  3. Display the current ledger state (known by everyone)
  4. Display the current private state (known only to this DApp instance)
  5. Display the current derived state (known only to this DApp instance)
  6. Exit
Which would you like to do? `;

const mainLoop = async (providers: FeedbackBoardProviders, rli: Interface, logger: Logger): Promise<void> => {
  const feedbackBoardApi = await deployOrJoin(providers, rli, logger);
  if (feedbackBoardApi === null) {
    return;
  }
  let currentState: FeedbackBoardDerivedState | undefined;
  const stateObserver = {
    next: (state: FeedbackBoardDerivedState) => (currentState = state),
  };
  const subscription = feedbackBoardApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const feedback = await rli.question(`What feedback would you like to submit? `);
            await feedbackBoardApi.submitFeedback(feedback);
            break;
          }
          case '2':
            await feedbackBoardApi.removeFeedback();
            break;
          case '3':
            await displayLedgerState(providers, feedbackBoardApi.deployedContract, logger);
            break;
          case '4':
            await displayPrivateState(providers, logger);
            break;
          case '5':
            displayDerivedState(currentState, logger);
            break;
          case '6':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'submitFeedback' | 'removeFeedback'>(config.zkConfigPath);
    const providers: FeedbackBoardProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, FeedbackBoardPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'FeedbackBoard-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
