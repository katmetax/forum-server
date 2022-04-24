import { EntityManager, IDatabaseDriver, Connection } from '@mikro-orm/core';

export type QueryContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
};
