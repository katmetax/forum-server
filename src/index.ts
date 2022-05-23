import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
import { buildSchema } from 'type-graphql';
import { COOKIE_NAME, isProd, sameSiteSetting } from './constants';
import { ForumDataSource } from './dataSource';
// import { Post } from './entities/Post';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { QueryContext } from './types';

const port = 4000;

export const Main = async () => {
  await ForumDataSource.initialize();
  // await ForumDataSource.runMigrations();
  // await Post.delete({});

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.set('trust proxy', !isProd);
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: sameSiteSetting, // More info for this setting here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7
        secure: true // cookie only works in https
      },
      saveUninitialized: false,
      secret: 'test',
      resave: false
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false
    }),
    context: ({ req, res }): QueryContext => ({ req, res, redis })
  });

  const corsOptions = {
    origin: ['https://studio.apollographql.com', 'http://localhost:3000'], // TODO: Remove apollographql origin for prod
    credentials: true
  };

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: corsOptions });

  app.listen(port, () => {
    console.log('server started at localhost:', port);
  });
};

Main().catch((error) => console.log(error));
