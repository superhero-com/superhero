import { OpenAPI } from './generated/core/OpenAPI';
import { request } from './generated/core/request';

export type SocialGraphPolicy = {
  network: string;
  contract: string;
  config_version: string;
  config: { max_following: string; max_blocked: string; follow_cooldown: string };
  frozen: boolean;
  importing: boolean;
};

const integer = (value: string) => {
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Unsupported social graph integer');
  }
  return Number(value);
};

export async function getSocialGraphCounts(account: string, network: string, contract: string) {
  const counts = await request<{
    network: string; contract: string; address: string;
    followers: string; following: string; completed_height: string; generation: string;
  }>(OpenAPI, {
    method: 'GET', url: '/api/social-graph/counts', query: { account },
  });
  if (counts.network !== network || counts.contract !== contract || counts.address !== account) {
    throw new Error('Social graph identity changed');
  }
  return {
    followers: integer(counts.followers),
    following: integer(counts.following),
    stateHeight: integer(counts.completed_height),
    generation: counts.generation,
  };
}

export async function getCurrentSocialGraphConfig() {
  const policy = await request<SocialGraphPolicy>(OpenAPI, {
    method: 'GET', url: '/api/social-graph/policy',
  });
  if (!policy.network || !policy.contract?.startsWith('ct_')
    || typeof policy.frozen !== 'boolean' || typeof policy.importing !== 'boolean') {
    throw new Error('Incomplete social graph identity');
  }
  return {
    contract_address: policy.contract,
    network_id: policy.network,
    config_version: policy.config_version,
    frozen: policy.frozen,
    importing: policy.importing,
    max_following: integer(policy.config.max_following),
    max_blocked: integer(policy.config.max_blocked),
    follow_cooldown: integer(policy.config.follow_cooldown),
  };
}
