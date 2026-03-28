#!/usr/bin/env node

import { execSync } from 'child_process';
import {
  Node,
  AeSdk,
  MemoryAccount,
  AccountMnemonicFactory,
} from '@aeternity/aepp-sdk';

// TODO: remove after merging https://github.com/aeternity/ae_mdw/issues/1758
try {
  execSync(
    'docker compose exec middleware ./bin/ae_mdw rpc ":aeplugin_dev_mode_app.start_unlink()"',
    { stdio: 'pipe' },
  );
} catch (error) {
  if (!error.message.includes('{:error, {:already_started')) throw error;
}

await (async function rollbackToFirstBlock() {
  const { status } = await fetch('http://localhost:3313/rollback?height=1');
  if (status !== 200) throw new Error(`Unexpected status code: ${status}`);
}());

const onNode = new Node('http://localhost:3013');
const aeSdk = new AeSdk({
  nodes: [{ name: 'testnet', instance: onNode }],
  accounts: [new MemoryAccount('sk_2CuofqWZHrABCrM7GY95YSQn8PyFvKQadnvFnpwhjUnDCFAWmf')],
});

const factory = new AccountMnemonicFactory(
  'cross cat upper state flame wire inner betray almost party agree endorse',
);
const account1 = await factory.initialize(0);
const account2 = await factory.initialize(1);

await aeSdk.spend(200e18, account1.address);
await aeSdk.spend(100e18, account2.address);
console.log('Wallet ready');

// TODO: deploy contracts
