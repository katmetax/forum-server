import { MikroORM } from '@mikro-orm/core';
import express from 'express';
import mikroConfig from './mikro-orm.config';

const port = 4000;

export const Main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();
  app.listen(port, () => {
    console.log('server started at localhost:', port);
  });
};

Main();
