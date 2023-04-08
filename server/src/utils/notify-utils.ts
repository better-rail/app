import dayjs from "dayjs"
import jwt from "jsonwebtoken"

import { appleKeyId, appleKeyContent, appleTeamId } from "../data/config"

export const getApnToken = () => {
  return jwt.sign(
    {
      iss: appleTeamId,
      iat: dayjs().unix(),
    },
    appleKeyContent,
    {
      header: {
        alg: "ES256",
        kid: appleKeyId,
      },
    },
  )
}
