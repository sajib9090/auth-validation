import "dotenv/config";

export const port = process.env.PORT;
export const mongoDB_URI = process.env.MONGODB_URI;

export const jwtSecret = process.env.JWT_SECRET;
export const jwtAccessToken = process.env.JWT_ACCESS_KEY;
export const jwtRefreshToken = process.env.JWT_REFRESH_KEY;

export const smtpUsername = process.env.SMTP_USERNAME;
export const smtpPassword = process.env.SMTP_PASSWORD;

export const clientURL = process.env.CLIENT_URL;
export const frontEndURL = process.env.FRONT_END_URL;
