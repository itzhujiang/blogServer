import md5 from 'md5';
import type { HandlerResult } from '../../utils/getSendResult';
import { AdminUser, AdminUserAttributes } from '../../models';
import { issueJwt } from '../../utils/jwt';

type LoginRequsetType = {
  /** 账号 */
  username: string;
  /** 密码 */
  password: string;
};

type LoginResponseType = {
  token: string;
};
/**
 * 登录
 * @param adminObj
 * @returns
 */
const login = async (adminObj: LoginRequsetType): Promise<HandlerResult<LoginResponseType>> => {
  const admin = await AdminUser.findOne({
    where: {
      username: adminObj.username,
    },
  });

  // 验证密码：MD5(密码 + 盐值)
  if (admin && admin.passwordHash === md5(adminObj.password + admin.passwordSalt)) {
    const token = issueJwt(3600 * 24 * 7, {
      id: admin.id,
      username: admin.username,
      name: admin.displayName || '翎羽',
    });
    return {
      data: {
        data: {
          token,
        },
      },
    };
  }

  return {
    code: 401,
    err: '用户名或密码错误',
  };
};

type UserInfoResponseType = Pick<
  AdminUserAttributes,
  'id' | 'email' | 'avatarUrl' | 'displayName' | 'username'
>;

const getUserInfo = async (parma: {
  id?: number;
}): Promise<HandlerResult<UserInfoResponseType>> => {
  if (!parma.id) {
    return {
      err: '当前用户不存在',
    };
  }
  const user = await AdminUser.findByPk(parma.id);
  if (!user) {
    return {
      err: '当前用户不存在',
    };
  }
  return {
    data: {
      data: {
        id: user.id,
        email: user.email,
        avatarUrl: user.avatarUrl,
        displayName: user.displayName,
        username: user.username,
      },
    },
    msg: '成功',
  };
};

export { login, getUserInfo, LoginRequsetType, LoginResponseType, UserInfoResponseType };
