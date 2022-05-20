import { isAuth } from '../middleware/isAuth';
import { QueryContext } from '../types';
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  UseMiddleware
} from 'type-graphql';
import { Post } from '../entities/Post';
import { validateInput } from '../middleware/validation';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  content: string;
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg('id') id: number): Promise<Post | null> {
    return Post.findOneBy({ id });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth, validateInput)
  async createPost(
    @Arg('options') options: PostInput,
    @Ctx() { req }: QueryContext
  ): Promise<Post> {
    return Post.create({
      ...options,
      creatorId: req.session.id
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOneBy({ id });
    if (!post) {
      return null;
    }

    if (typeof title !== 'undefined') {
      await Post.update({ id }, { title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    try {
      await Post.delete(id);
    } catch (error) {
      console.log(`Error: ${error.message}`);
      return false;
    }
    return true;
  }
}
