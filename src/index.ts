import { MikroORM } from '@mikro-orm/core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';
import mikroConfig from './mikro-orm.config';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';
import { COOKIE_NAME, isProd, sameSiteSetting } from './constants';
import { QueryContext } from './types';

const port = 4000;

export const Main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = createClient({ legacyMode: true });
  redisClient.connect().catch(console.error);

  app.set('trust proxy', !isProd);
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redisClient, disableTouch: true }),
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
    context: ({ req, res }): QueryContext => ({ em: orm.em, req, res })
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

Main();
