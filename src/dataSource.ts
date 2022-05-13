import { DataSource } from 'typeorm';
import { isProd } from './constants';
import { Post } from './entities/Post';
import { User } from './entities/User';

export const ForumDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  // port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'forum2',
  logging: true,
  synchronize: !isProd,
  // synchronize: false,
  entities: [User, Post]
});
