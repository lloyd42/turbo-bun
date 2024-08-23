import { t } from "elysia";

const signupBodySchema = t.Object({
  name: t.String({ maxLength: 18, minLength: 1, default: "test" }),
  email: t.String({ format: "email", default: "test@user.com" }),
  password: t.String({ minLength: 8, default: "12345678" }),
  isAdult: t.Boolean(),
});

const loginBodySchema = t.Object({
  email: t.String({ format: "email", default: "test@user.com" }),
  password: t.String({ minLength: 8, default: "12345678" }),
});

const cookieBodySchema = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
});

export { loginBodySchema, signupBodySchema, cookieBodySchema };
