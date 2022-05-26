import { Voting } from '../entities/Voting';
import DataLoader from 'dataloader';

export const createVotingLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Voting | null>(
    async (keys) => {
      const votes = await Voting.findBy(keys as any);
      const voteIdsToVote: Record<string, Voting> = {};
      votes.forEach((vote) => {
        voteIdsToVote[`${vote.userId}|${vote.postId}`] = vote;
      });

      return keys.map((key) => voteIdsToVote[`${key.userId}|${key.postId}`]);
    }
  );
