import { isAuth } from '../middleware/isAuth';
import { QueryContext } from '../types';
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware
} from 'type-graphql';
import { Post } from '../entities/Post';
import { validateInput } from '../middleware/validation';
import { ForumDataSource } from '../dataSource';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  content: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  contentSnippet(@Root() root: Post) {
    return root.content.slice(0, 50);
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const qb = await ForumDataSource.getRepository(Post)
      .createQueryBuilder('p')
      .orderBy('"createdAt"', 'DESC')
      .take(realLimitPlusOne);

    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) });
    }

    const posts = await qb.getMany();

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne
    };
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
      creatorId: String(req.session.id)
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
