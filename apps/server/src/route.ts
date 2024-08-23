import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { prisma } from "./lib/prisma";
import { cookieBodySchema, loginBodySchema, signupBodySchema } from "./schema";
import { getExpTimestamp } from "./lib/util";
import {
  ACCESS_TOKEN_EXP,
  JWT_NAME,
  REFRESH_TOKEN_EXP,
} from "./config/constant";
import { authPlugin } from "./plugin";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: JWT_NAME,
      secret: Bun.env.JWT_SECRET!,
    })
  )
  .use(bearer())
  .post(
    "/sign-up",
    async ({ body }) => {
      // hash password
      const password = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 10,
      });

      const user = await prisma.user.create({
        data: {
          ...body,
          password,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      return {
        message: "Account created successfully",
        data: {
          user,
        },
      };
    },
    {
      body: signupBodySchema,
      error({ code, set, body }) {
        // handle duplicate email error throw by prisma
        // P2002 duplicate field error code
        if ((code as unknown) === "P2002") {
          set.status = "Conflict";
          return {
            name: "Error",
            message: `The email address provided ${body.email} already exists`,
          };
        }
      },
    }
  )
  .post(
    "/sign-in",
    async ({ body, jwt, set }) => {
      // match user email
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: {
          id: true,
          email: true,
          password: true,
        },
      });

      if (!user) {
        set.status = "Bad Request";
        throw new Error(
          "The email address or password you entered is incorrect"
        );
      }

      // match password
      const matchPassword = await Bun.password.verify(
        body.password,
        user.password,
        "bcrypt"
      );
      if (!matchPassword) {
        set.status = "Bad Request";
        throw new Error(
          "The email address or password you entered is incorrect"
        );
      }

      // create access token
      const accessJWTToken = await jwt.sign({
        sub: user.id,
        now: Date.now(),
        exp: getExpTimestamp(ACCESS_TOKEN_EXP),
      });
      // accessToken.set({
      //   value: accessJWTToken,
      //   httpOnly: true,
      //   maxAge: ACCESS_TOKEN_EXP,
      //   path: "/",
      // });

      // create refresh token
      const refreshJWTToken = await jwt.sign({
        sub: user.id,
        now: Date.now(),
        exp: getExpTimestamp(REFRESH_TOKEN_EXP),
      });
      // refreshToken.set({
      //   value: refreshJWTToken,
      //   httpOnly: true,
      //   maxAge: REFRESH_TOKEN_EXP,
      //   path: "/",
      // });

      // refreshToken => db or refreshToken => redis ?

      // set user profile as online
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          isOnline: true,
          refreshToken: refreshJWTToken,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return {
        message: "Sign-in successfully",
        data: {
          user: updatedUser,
          accessToken: accessJWTToken,
          refreshToken: refreshJWTToken,
        },
      };
    },
    {
      body: loginBodySchema,
      // cookie: cookieBodySchema,
      // detail: {
      //   requestBody: loginBodySchema.default,
      // },
    }
  )
  .post(
    "/refresh",
    async ({ body: { refreshToken }, jwt, set }) => {
      if (!refreshToken) {
        // handle error for refresh token is not available
        set.status = "Unauthorized";
        throw new Error("Refresh token is missing");
      }
      // get refresh token from cookie
      const jwtPayload = await jwt.verify(refreshToken);
      if (!jwtPayload) {
        // handle error for refresh token is tempted or incorrect
        set.status = "Forbidden";
        throw new Error("Refresh token is invalid");
      }

      // get user from refresh token
      const userId = jwtPayload.sub;

      // verify user exists or not
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        // handle error for user not found from the provided refresh token
        set.status = "Forbidden";
        throw new Error("Refresh token is invalid");
      }
      // create new access token
      const accessJWTToken = await jwt.sign({
        sub: user.id,
        exp: getExpTimestamp(ACCESS_TOKEN_EXP),
      });
      // accessToken.set({
      //   value: accessJWTToken,
      //   httpOnly: true,
      //   maxAge: ACCESS_TOKEN_EXP,
      //   path: "/",
      // });

      // create new refresh token
      const refreshJWTToken = await jwt.sign({
        sub: user.id,
        exp: getExpTimestamp(REFRESH_TOKEN_EXP),
      });
      // refreshToken.set({
      //   value: refreshJWTToken,
      //   httpOnly: true,
      //   maxAge: REFRESH_TOKEN_EXP,
      //   path: "/",
      // });

      // set refresh token in db
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          refreshToken: refreshJWTToken,
        },
      });

      return {
        message: "Access token generated successfully",
        data: {
          accessToken: accessJWTToken,
          refreshToken: refreshJWTToken,
        },
      };
    },
    {
      // cookie: cookieBodySchema,
      body: t.Object({
        refreshToken: t.String(),
      }),
    }
  );

export const guardRoutes = new Elysia().guard(
  {
    // cookie: cookieBodySchema,
    headers: t.Object({
      Authorization: t.Optional(t.String({ default: "Bearer " })),
    }),
  },
  (app) =>
    app
      .use(authPlugin)
      .post("/logout", async ({ user, set }) => {
        // remove refresh token and access token from cookies
        // accessToken.remove();
        // refreshToken.remove();

        // clear token need front-end's support or use redis
        // set.headers.authorization = undefined;

        // remove refresh token from db & set user online status to offline
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            isOnline: false,
            refreshToken: null,
          },
        });
        return {
          message: "Logout successfully",
        };
      })
      .get("/me", ({ user }) => {
        return {
          message: "Fetch current user",
          data: {
            user,
          },
        };
      })
);
