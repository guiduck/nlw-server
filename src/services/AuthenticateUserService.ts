import axios from 'axios';
import prismaClient from '../prisma';
import { sign } from 'jsonwebtoken';

// Receber code(strig)
// recuperar access_token no github
//recuperar info do usuario no github
// verificar se usuario existe no db
// SIM = gera token
// NAO = cria no db e gera um token
//retorna token

interface IAccessTokenResponse {
  access_token: string
}

interface IUserResponse {
  login: string,
  id: number,
  name: string,
  avatar_url: string
}

class AuthenticateUserService {
    async execute(code: string) {
      const url="https://github.com/login/oauth/access_token";
    
      const { data: accessTokenResponse } = await axios.post<IAccessTokenResponse>(url, null, {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        headers: {
          "Accept": "application/json"
        }
      }) 

      const response = await axios.get<IUserResponse>("https://api.github.com/user", {
        headers: {
          authorization: `Bearer ${accessTokenResponse.access_token}`
        }
      })


      const { login, id, avatar_url, name } = response.data;

      const user = await prismaClient.user.findFirst({
        where: {
          github_id: id
        }
      })

      if (!user) {
        await prismaClient.user.create({
          data: {
            github_id: id,
            login,
            name,
            avatar_url
          }
        })
      }

      const token = sign(
        {
          user: {
            name: user.name,
            avatar_url: user.avatar_url,
            id: user.id,
          },
        },
        process.env.JWT_SECRET,
        {
          subject: user.id,
          expiresIn: "1d",
        }
      );

      return { token, user };
    }
};

export { AuthenticateUserService };