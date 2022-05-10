import { User } from '../entities/User';
import { QueryContext } from '../types';
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver
} from 'type-graphql';
import argon2 from 'argon2';
import { COOKIE_NAME, sameSiteSetting } from '../constants';

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: [FieldError];
  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: QueryContext): Promise<User | null> {
    if (!req.session.userId) {
      // user not logged in
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') { username, password }: UsernamePasswordInput,
    @Ctx()
    { em, req }: QueryContext
  ): Promise<UserResponse> {
    const hashedPassword = await argon2.hash(password);
    const user = em.create(User, {
      username,
      password: hashedPassword
    });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      const { message, code, detail } = error;
      console.log(`Error: ${message}`);

      const userAlreadyExists =
        code === '23505' || detail.includes('already exists');
      if (userAlreadyExists) {
        return {
          errors: [
            {
              field: 'username',
              message:
                'Sorry! This username is already taken. Please choose a different one.'
            }
          ]
        };
      }
    }

    // store user id session in browser cookie
    // keep them logged in
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') { username, password }: UsernamePasswordInput,
    @Ctx()
    { em, req }: QueryContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username });
    if (!user) {
      return {
        errors: [
          {
            field: 'username',
            message: 'username does not exist'
          }
        ]
      };
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return {
        errors: [
          {
            field: 'password',
            message: 'password is incorrect'
          }
        ]
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: QueryContext) {
    return new Promise((resolve) => {
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME, {
          secure: true,
          sameSite: sameSiteSetting
        });
        if (err) {
          console.error(err);
          resolve(false);
          return;
        }

        resolve(true);
      });
    });
  }
}
