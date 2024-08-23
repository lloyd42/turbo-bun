import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import { JWT_NAME } from "./config/constant";
import { prisma } from "./lib/prisma";
import { bearer } from "@elysiajs/bearer";
import { cookieBodySchema } from "./schema";

// 1. cookie but csrf ? 2. header bearer authentication

// const authPlugin = (app: Elysia) =>
//   app
//     .use(
//       jwt({
//         name: JWT_NAME,
//         secret: Bun.env.JWT_SECRET!,
//       })
//     )
//     .derive(async ({ jwt, cookie: { accessToken }, set }) => {
//       if (!accessToken.value) {
//         // handle error for access token is not available
//         set.status = "Unauthorized";
//         throw new Error("Access token is missing");
//       }
//       const jwtPayload = await jwt.verify(accessToken.value);
//       if (!jwtPayload) {
//         // handle error for access token is tempted or incorrect
//         set.status = "Forbidden";
//         throw new Error("Access token is invalid");
//       }

//       const userId = jwtPayload.sub;
//       const user = await prisma.user.findUnique({
//         where: {
//           id: userId,
//         },
//       });

//       if (!user) {
//         // handle error for user not found from the provided access token
//         set.status = "Forbidden";
//         throw new Error("Access token is invalid");
//       }

//       return {
//         user,
//       };
//     });

const authPlugin = (app: Elysia) =>
  app
    .use(
      jwt({
        name: JWT_NAME,
        secret: Bun.env.JWT_SECRET!,
      })
    )
    .use(bearer())
    .derive(async ({ jwt, bearer, set }) => {
      if (!bearer) {
        // handle error for access token is not available
        set.status = "Unauthorized";
        throw new Error("Access token is missing");
      }
      const jwtPayload = await jwt.verify(bearer);
      if (!jwtPayload) {
        // handle error for access token is tempted or incorrect
        set.status = "Forbidden";
        throw new Error("Access token is invalid");
      }

      const userId = jwtPayload.sub;
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        // handle error for user not found from the provided access token
        set.status = "Forbidden";
        throw new Error("Access token is invalid");
      }

      return {
        user,
      };
    });

export { authPlugin };
