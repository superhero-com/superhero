import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GovernanceApi } from '../governance';
import { Encoded } from '@aeternity/aepp-sdk';

describe('GovernanceApi Integration Tests', () => {
  // Test addresses - these should be real addresses that exist on the network
  const testAddress = 'ak_2dATvCYaYutwBwVfrq9fWfV9p2Qi7KjvQKjJ8bJ8bJ8bJ8bJ8bJ8';

  beforeAll(() => {
    // Set a reasonable timeout for network requests
    vi.setConfig({ testTimeout: 20000 });
  });

  describe('getVersion', () => {
    it('should fetch backend version', async () => {
      const result = await GovernanceApi.getVersion();
      
      expect(result).toBeDefined();
      expect(typeof result.version).toBe('string');
      expect(result.version.length).toBeGreaterThan(0);
    });
  });

  describe('getPollOrdering', () => {
    it('should fetch open polls', async () => {
      const result = await GovernanceApi.getPollOrdering(false);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('ordering');
      expect(Array.isArray(result.ordering)).toBe(true);
      
      // Validate data property structure
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      
      expect(result.data.length).toBeGreaterThan(0);
      const firstPoll = result.data[0];
      expect(firstPoll).toHaveProperty('id');
      expect(firstPoll).toHaveProperty('poll');
      expect(firstPoll).toHaveProperty('totalStake');
      expect(firstPoll).toHaveProperty('voteCount');
      expect(firstPoll).toHaveProperty('closeHeight');
      expect(firstPoll).toHaveProperty('delegationCount');
      expect(firstPoll).toHaveProperty('score');
      
      // Validate data types
      expect(typeof firstPoll.id).toBe('number');
      expect(typeof firstPoll.poll).toBe('string');
      expect(firstPoll.poll.startsWith('ct_')).toBe(true);
      expect(typeof firstPoll.totalStake).toBe('string');
      expect(typeof firstPoll.voteCount).toBe('number');
      expect(typeof firstPoll.closeHeight).toBe('number');
      expect(typeof firstPoll.delegationCount).toBe('number');
      expect(typeof firstPoll.score).toBe('number');
    });

    it('should fetch closed polls', async () => {
      const result = await GovernanceApi.getPollOrdering(true);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('ordering');
      expect(Array.isArray(result.ordering)).toBe(true);
      
      // Validate data property structure
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      
      expect(result.data.length).toBeGreaterThan(0);
      const firstPoll = result.data[0];
      expect(firstPoll).toHaveProperty('id');
      expect(firstPoll).toHaveProperty('poll');
      expect(firstPoll).toHaveProperty('totalStake');
      expect(firstPoll).toHaveProperty('voteCount');
      expect(firstPoll).toHaveProperty('closeHeight');
      expect(firstPoll).toHaveProperty('delegationCount');
      expect(firstPoll).toHaveProperty('score');
      
      // Validate data types
      expect(typeof firstPoll.id).toBe('number');
      expect(typeof firstPoll.poll).toBe('string');
      expect(firstPoll.poll.startsWith('ct_')).toBe(true);
      expect(typeof firstPoll.totalStake).toBe('string');
      expect(typeof firstPoll.voteCount).toBe('number');
      expect(typeof firstPoll.closeHeight).toBe('number');
      expect(typeof firstPoll.delegationCount).toBe('number');
      expect(typeof firstPoll.score).toBe('number');
    }, 60000);
  });

  describe('getPollOverview', () => {
    it('should fetch poll overview for a valid poll ID', async () => {
      // First get a list of polls to find a valid poll ID
      const polls = await GovernanceApi.getPollOrdering(false);
      
      let pollId: Encoded.ContractAddress;
      pollId = polls.data[0]?.poll;
      if (!pollId) {
        // Skip test if no polls available
        return;
      }
      
      const result = await GovernanceApi.getPollOverview(pollId);
      
      expect(result).toBeDefined();
      
      // Validate pollState structure
      expect(result).toHaveProperty('pollState');
      expect(result.pollState).toHaveProperty('metadata');
      expect(result.pollState).toHaveProperty('vote_options');
      expect(result.pollState).toHaveProperty('close_height');
      expect(result.pollState).toHaveProperty('create_height');
      expect(result.pollState).toHaveProperty('votes');
      expect(result.pollState).toHaveProperty('author');
      
      // Validate metadata structure
      const metadata = result.pollState.metadata;
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('link');
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
      expect(typeof metadata.link).toBe('string');
      
      // Validate vote_options structure
      const voteOptions = result.pollState.vote_options;
      expect(typeof voteOptions).toBe('object');
      Object.values(voteOptions).forEach(value => {
        expect(typeof value).toBe('string');
      });
      
      // Validate votes structure
      const votes = result.pollState.votes;
      expect(typeof votes).toBe('object');
      Object.entries(votes).forEach(([address, value]) => {
        expect(address.startsWith('ak_')).toBe(true);
        expect(typeof value).toBe('number');
      });
      
      // Validate stakesAtHeight array
      expect(result).toHaveProperty('stakesAtHeight');
      expect(Array.isArray(result.stakesAtHeight)).toBe(true);
      
      if (result.stakesAtHeight.length > 0) {
        const firstStake = result.stakesAtHeight[0];
        expect(firstStake).toHaveProperty('account');
        expect(firstStake).toHaveProperty('option');
        expect(firstStake).toHaveProperty('stake');
        expect(firstStake).toHaveProperty('balance');
        expect(firstStake).toHaveProperty('delegated');
        expect(firstStake).toHaveProperty('delegators');
        expect(firstStake).toHaveProperty('delegationTree');
        
        expect(firstStake.account.startsWith('ak_')).toBe(true);
        expect(typeof firstStake.option).toBe('number');
        expect(typeof firstStake.stake).toBe('string');
        expect(typeof firstStake.balance).toBe('string');
        expect(typeof firstStake.delegated).toBe('string');
        expect(Array.isArray(firstStake.delegators)).toBe(true);
        expect(typeof firstStake.delegationTree).toBe('object');
      }
      
      // Validate stakesForOption array
      expect(result).toHaveProperty('stakesForOption');
      expect(Array.isArray(result.stakesForOption)).toBe(true);
      
      if (result.stakesForOption.length > 0) {
        const firstOption = result.stakesForOption[0];
        expect(firstOption).toHaveProperty('option');
        expect(firstOption).toHaveProperty('optionStake');
        expect(firstOption).toHaveProperty('percentageOfTotal');
        expect(firstOption).toHaveProperty('votes');
        
        expect(typeof firstOption.option).toBe('string');
        expect(typeof firstOption.optionStake).toBe('string');
        expect(typeof firstOption.percentageOfTotal).toBe('string');
        expect(Array.isArray(firstOption.votes)).toBe(true);
      }
      
      // Validate summary properties
      expect(result).toHaveProperty('totalStake');
      expect(result).toHaveProperty('percentOfTotalSupply');
      expect(result).toHaveProperty('voteCount');
      expect(typeof result.totalStake).toBe('string');
      expect(typeof result.percentOfTotalSupply).toBe('string');
      expect(typeof result.voteCount).toBe('number');
    });

    it('should handle invalid poll ID gracefully', async () => {
      const invalidPollId = 'invalid_poll_id';
      
      try {
        await GovernanceApi.getPollOverview(invalidPollId);
        throw new Error('Invalid poll ID should throw an error');
      } catch (error) {
        // Expected behavior - invalid poll should throw an error
        expect(error).toBeDefined();
        expect(error.message).toContain('Governance request failed');
      }
    });
  });

  describe('getVotesState', () => {
    it('should fetch votes state for a valid poll ID', async () => {
      // First get a list of polls to find a valid poll ID
      const polls = await GovernanceApi.getPollOrdering(false);
      
      let pollId: Encoded.ContractAddress;
      pollId = polls.data[0]?.poll;
      if (!pollId) {
        // Skip test if no polls available
        return;
      }
      
      const result = await GovernanceApi.getVotesState(pollId);
      
      expect(result).toBeDefined();
      
      // Validate pollState structure
      expect(result).toHaveProperty('pollState');
      expect(result.pollState).toHaveProperty('metadata');
      expect(result.pollState).toHaveProperty('vote_options');
      expect(result.pollState).toHaveProperty('close_height');
      expect(result.pollState).toHaveProperty('create_height');
      expect(result.pollState).toHaveProperty('votes');
      expect(result.pollState).toHaveProperty('author');
      
      // Validate metadata structure
      const metadata = result.pollState.metadata;
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('link');
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
      expect(typeof metadata.link).toBe('string');
      
      // Validate vote_options structure
      const voteOptions = result.pollState.vote_options;
      expect(typeof voteOptions).toBe('object');
      Object.values(voteOptions).forEach(option => {
        expect(typeof option).toBe('string');
      });
      
      // Validate votes structure
      const votes = result.pollState.votes;
      expect(typeof votes).toBe('object');
      Object.entries(votes).forEach(([address, vote]) => {
        expect(address.startsWith('ak_')).toBe(true);
        expect(typeof vote).toBe('number');
      });
      
      // Validate stakesAtHeight array
      expect(result).toHaveProperty('stakesAtHeight');
      expect(Array.isArray(result.stakesAtHeight)).toBe(true);
      
      if (result.stakesAtHeight.length > 0) {
        const firstStake = result.stakesAtHeight[0];
        expect(firstStake).toHaveProperty('account');
        expect(firstStake).toHaveProperty('option');
        expect(firstStake).toHaveProperty('stake');
        expect(firstStake).toHaveProperty('balance');
        expect(firstStake).toHaveProperty('delegated');
        expect(firstStake).toHaveProperty('delegators');
        expect(firstStake).toHaveProperty('delegationTree');
        
        expect(firstStake.account.startsWith('ak_')).toBe(true);
        expect(typeof firstStake.option).toBe('number');
        expect(typeof firstStake.stake).toBe('string');
        expect(typeof firstStake.balance).toBe('string');
        expect(typeof firstStake.delegated).toBe('string');
        expect(Array.isArray(firstStake.delegators)).toBe(true);
        expect(typeof firstStake.delegationTree).toBe('object');
      }
      
      // Validate stakesForOption array
      expect(result).toHaveProperty('stakesForOption');
      expect(Array.isArray(result.stakesForOption)).toBe(true);
      
      if (result.stakesForOption.length > 0) {
        const firstOption = result.stakesForOption[0];
        expect(firstOption).toHaveProperty('option');
        expect(firstOption).toHaveProperty('optionStake');
        expect(firstOption).toHaveProperty('percentageOfTotal');
        expect(firstOption).toHaveProperty('votes');
        
        expect(typeof firstOption.option).toBe('string');
        expect(typeof firstOption.optionStake).toBe('string');
        expect(typeof firstOption.percentageOfTotal).toBe('string');
        expect(Array.isArray(firstOption.votes)).toBe(true);
      }
      
      // Validate summary properties
      expect(result).toHaveProperty('totalStake');
      expect(result).toHaveProperty('percentOfTotalSupply');
      expect(result).toHaveProperty('voteCount');
      expect(typeof result.totalStake).toBe('string');
      expect(typeof result.percentOfTotalSupply).toBe('string');
      expect(typeof result.voteCount).toBe('number');
    });
  });

  describe('getDelegatedPower', () => {
    it('should fetch delegated power for a test address', async () => {
      const result = await GovernanceApi.getDelegatedPower(testAddress);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('delegatedPower');
      expect(result).toHaveProperty('delegationTree');
      expect(result).toHaveProperty('flattenedDelegationTree');
      
      expect(typeof result.delegatedPower).toBe('string');
      expect(typeof result.delegationTree).toBe('object');
      expect(Array.isArray(result.flattenedDelegationTree)).toBe(true);
    });

    it('should fetch delegated power for a specific poll', async () => {
      const polls = await GovernanceApi.getPollOrdering(false);
      
      let pollId: Encoded.ContractAddress;
      pollId = polls.data[0]?.poll;
      if (!pollId) {
        // Skip test if no polls available
        return;
      }
      
      const result = await GovernanceApi.getDelegatedPower(testAddress, pollId);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('delegatedPower');
      expect(result).toHaveProperty('delegationTree');
      expect(result).toHaveProperty('flattenedDelegationTree');
      
      expect(typeof result.delegatedPower).toBe('string');
      expect(typeof result.delegationTree).toBe('object');
      expect(Array.isArray(result.flattenedDelegationTree)).toBe(true);
    });
  });

  describe('getAccountPollVoterAuthor', () => {
    it('should fetch account poll voter author info for a test address', async () => {
      const result = await GovernanceApi.getAccountPollVoterAuthor(testAddress);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('votedInPolls');
      expect(result).toHaveProperty('authorOfPolls');
      expect(result).toHaveProperty('delegateeVotes');
      
      expect(Array.isArray(result.votedInPolls)).toBe(true);
      expect(Array.isArray(result.authorOfPolls)).toBe(true);
      expect(Array.isArray(result.delegateeVotes)).toBe(true);
    });
  });

  describe('submitContractEvent', () => {
    it('should submit a contract event', async () => {
      const topic = 'RevokeDelegation';
      
      const result = await GovernanceApi.submitContractEvent(topic);
      expect(result).toBe(undefined);
    });

    it('should submit a contract event with poll parameter', async () => {
      const topic = 'RevokeVote';
      const polls = await GovernanceApi.getPollOrdering(false);
      
      let pollId: Encoded.ContractAddress;
      pollId = polls.data[0]?.poll;
      if (!pollId) {
        // Skip test if no polls available
        return;
      }
      
      const result = await GovernanceApi.submitContractEvent(topic, pollId);
      expect(result).toBe(undefined);
    });
  });
});
