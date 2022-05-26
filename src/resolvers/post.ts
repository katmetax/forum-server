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
import { Voting } from '../entities/Voting';
import { User } from '../entities/User';

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

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: QueryContext) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { votingLoader, req }: QueryContext
  ) {
    const { userId } = req.session;

    if (!userId) {
      return null;
    }

    const vote = await votingLoader.load({
      postId: post.id,
      userId: userId
    });

    return vote ? vote.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: QueryContext
  ) {
    const isUpvote = value !== -1;
    const vote = isUpvote ? 1 : -1;
    const { userId } = req.session;
    const previouslyVoted = await ForumDataSource.getRepository(Voting).findOne(
      { where: { postId, userId } }
    );

    if (previouslyVoted && previouslyVoted.value !== vote) {
      await ForumDataSource.createQueryBuilder()
        .update(Voting)
        .set({
          value: vote
        })
        .where({ postId, userId })
        .execute();
      await ForumDataSource.createQueryBuilder()
        .update(Post)
        .set({
          points: () => `points + ${vote * 2}`
        })
        .where({ id: postId })
        .execute();
    } else if (!previouslyVoted) {
      await ForumDataSource.createQueryBuilder()
        .insert()
        .into(Voting)
        .values({
          userId,
          postId,
          value: vote
        })
        .execute();
      await ForumDataSource.createQueryBuilder()
        .update(Post)
        .set({
          points: () => `points + ${vote}`
        })
        .where({ id: postId })
        .execute();
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await ForumDataSource.query(
      `
      select p.*
      from post p
      ${cursor ? 'where p."createdAt" < $2' : ''}
      order by p."createdAt" DESC
      limit $1
    `,
      replacements
    );

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
      creatorId: req.session.userId
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
