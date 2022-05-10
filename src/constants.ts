export const isProd = process.env.NODE_ENV === 'production';
export const COOKIE_NAME = 'qid';
export const sameSiteSetting = isProd ? 'lax' : 'none';
