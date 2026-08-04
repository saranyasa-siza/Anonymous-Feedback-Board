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

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import {
  EnvironmentConfiguration,
  FaucetClient,
  getTestEnvironment,
  ProofServerClient,
  RemoteTestEnvironment,
  TestEnvironment,
} from '@midnight-ntwrk/testkit-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Logger } from 'pino';

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  getEnvironment(logger: Logger): TestEnvironment;
  readonly generateDust: boolean;
}

export const currentDir = path.resolve(fileURLToPath(import.meta.url), '..');

export class StandaloneConfig implements Config {
  getEnvironment(logger: Logger): TestEnvironment {
    return getTestEnvironment(logger) as TestEnvironment;
  }
  privateStateStoreName = 'feedback-board-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString().replace(/:/g, '-')}.log`);
  zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'feedback-board');
  generateDust = false;
}

export class PreviewRemoteConfig implements Config {
  getEnvironment(logger: Logger): TestEnvironment {
    setNetworkId('preview');
    return new PreviewTestEnvironment(logger);
  }
  privateStateStoreName = 'feedback-board-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'preview-remote', `${new Date().toISOString().replace(/:/g, '-')}.log`);
  zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'feedback-board');
  generateDust = true;
}

export class PreprodRemoteConfig implements Config {
  getEnvironment(logger: Logger): TestEnvironment {
    setNetworkId('preprod');
    return new PreprodTestEnvironment(logger);
  }
  privateStateStoreName = 'feedback-board-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'preprod-remote', `${new Date().toISOString().replace(/:/g, '-')}.log`);
  zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'feedback-board');
  generateDust = true;
}

export class PreviewTestEnvironment extends RemoteTestEnvironment {
  constructor(private readonly log: Logger) {
    super(log);
  }

  // The base healthCheck uses a hardcoded 1000ms axios timeout for node/indexer/faucet checks.
  // The preview indexer and faucet are frequently slow or unhealthy, so we:
  //   - use a 10s timeout for node and indexer checks
  //   - downgrade faucet failures to warnings (faucet is out of NIGHT; CLI never calls it)
  healthCheck = async (): Promise<void> => {
    this.log.info('Performing env health check');
    const env = this.getEnvironmentConfiguration();

    const nodeRes = await axios.get(`${env.node}/health`, { timeout: 10_000 });
    this.log.info(`Connected to node ${env.node}/health: ${JSON.stringify(nodeRes.data)}`);

    const indexerRes = await axios.get(`${env.indexer.replace('/api/v4/graphql', '')}/ready`, { timeout: 10_000 });
    this.log.info(`Connected to indexer ${env.indexer}: ${JSON.stringify(indexerRes.data)}`);

    await new ProofServerClient(env.proofServer, this.log).health();

    if (env.faucet) {
      try {
        await new FaucetClient(env.faucet, this.log).health();
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'unknown error';
        this.log.warn(`Faucet ${env.faucet} is not healthy (${reason}); continuing without it.`);
        this.log.warn('Fund your wallet address manually - faucet requests are likely to fail.');
      }
    }
  };

  private getProofServerUrl(): string {
    const container = this.proofServerContainer as { getUrl(): string } | undefined;
    if (!container) {
      throw new Error('Proof server container is not available.');
    }
    return container.getUrl();
  }

  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      walletNetworkId: 'preview',
      networkId: 'preview',
      indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      node: 'https://rpc.preview.midnight.network',
      nodeWS: 'wss://rpc.preview.midnight.network',
      faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
      proofServer: this.getProofServerUrl(),
    };
  }
}

export class PreprodTestEnvironment extends RemoteTestEnvironment {
  constructor(logger: Logger) {
    super(logger);
  }

  private getProofServerUrl(): string {
    const container = this.proofServerContainer as { getUrl(): string } | undefined;
    if (!container) {
      throw new Error('Proof server container is not available.');
    }
    return container.getUrl();
  }

  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      walletNetworkId: 'preprod',
      networkId: 'preprod',
      indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
      indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
      node: 'https://rpc.preprod.midnight.network',
      nodeWS: 'wss://rpc.preprod.midnight.network',
      faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
      proofServer: this.getProofServerUrl(),
    };
  }
}
