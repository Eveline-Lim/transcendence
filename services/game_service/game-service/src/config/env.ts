
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_TEST = NODE_ENV === 'test';
export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';
export const PORT = 3001;
// export const PORT = parseInt(process.env.PORT || '3001', 10); // 10 pour la base