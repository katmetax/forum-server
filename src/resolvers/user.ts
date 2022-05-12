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
import {
  COOKIE_NAME,
  FORGOT_PASSWORD_PREFIX,
  sameSiteSetting
} from '../constants';
import sendEmail from '../lib/sendEmail';
import { v4 } from 'uuid';

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  email: string;
  @Field()
  password: string;
}

@InputType()
class EmailPasswordInput {
  @Field()
  email: string;
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
    @Arg('options') { username, email, password }: UsernamePasswordInput,
    @Ctx()
    { em, req }: QueryContext
  ): Promise<UserResponse> {
    const hashedPassword = await argon2.hash(password);
    const user = em.create(User, {
      username,
      email,
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
    @Arg('options') { email, password }: EmailPasswordInput,
    @Ctx()
    { em, req }: QueryContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { email });
    if (!user) {
      return {
        errors: [
          {
            field: 'email',
            message: 'email is not registered'
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

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { em, redis }: QueryContext
  ) {
    const user = await em.findOne(User, { email });

    if (!user) {
      // do nothing so emails in DB do not get phished through
      return true;
    }

    const token = v4();

    await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'ex', 60 * 15); // expire after 15 minutes

    await sendEmail(
      email,
      `Click <a href="http://localhost:3000/change-password/${token}">here</a> to reset your password.`
    );

    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { em, redis }: QueryContext
  ): Promise<UserResponse> {
    const key = FORGOT_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);

    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'The token is expired'
          }
        ]
      };
    }

    const user = await em.findOne(User, { id: parseInt(userId) });

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'User no longer exists'
          }
        ]
      };
    }

    user.password = await argon2.hash(newPassword);
    await em.persistAndFlush(user);

    await redis.del(key);

    return { user };
  }
}
