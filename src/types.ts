import { Request, Response } from 'express';
import { Session } from 'express-session';
import { Redis } from 'ioredis';
import { createUserLoader } from './utils/createUserLoader';
import { createVotingLoader } from './utils/createVotingLoader';

export type QueryContext = {
  req: Request & { session: Session & { userId?: number } };
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  votingLoader: ReturnType<typeof createVotingLoader>;
};
