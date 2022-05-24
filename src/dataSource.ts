import path from 'path';
import { DataSource } from 'typeorm';
import { isProd } from './constants';
import { Post } from './entities/Post';
import { User } from './entities/User';
import { Voting } from './entities/Voting';

export const ForumDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'forum2',
  logging: true,
  synchronize: !isProd,
  migrations: [path.join(__dirname, './migrations/*')],
  entities: [User, Post, Voting]
});
