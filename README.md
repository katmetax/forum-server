# Reddit Clone

### Tech Stack
- TypeScript
- Node.js
- Express
- GraphQL
- Apollo
- Redis
- PostgreSQL
- MikroORM/TypeORM
- Joi

### Requirements

You will need to have these installed on your machine:
- Postgresql
- Redis

Start Redis:
```redis-server```

Start PostgresQL:
```psql forum2 -U <username>```
N.B. You'll first need to create a database called `forum2`.

### Database

**Migrating the TypeOrm DB:**
```npx typeorm migration:create <path>```

### Useful links

https://www.mockaroo.com/
