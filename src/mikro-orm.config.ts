import { MikroORM } from '@mikro-orm/core';
import path from 'path';
import { isProd } from './constants';
import { Post } from './entities/Post';
import { User } from './entities/User';

export default {
  migrations: {
    path: path.join(__dirname, './migrations'),
    glob: '!(*.d).{js,ts}',
    disableForeignKeys: false
  },
  allowGlobalContext: true,
  entities: [Post, User],
  dbName: 'forum',
  type: 'postgresql',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  debug: !isProd
} as Parameters<typeof MikroORM.init>[0];
