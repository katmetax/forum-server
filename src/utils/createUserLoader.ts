import DataLoader from 'dataloader';
import { In } from 'typeorm/find-options/operator/In';
import { User } from '../entities/User';

export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findBy({ id: In(userIds as number[]) });
    const userIdToUser: Record<number, User> = {};
    users.forEach((user) => {
      userIdToUser[user.id] = user;
    });
    const sortedUsers = userIds.map((userId) => userIdToUser[userId]);
    return sortedUsers;
  });
