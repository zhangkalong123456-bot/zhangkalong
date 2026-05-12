import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'debate-master-secret-key-2024';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: 'teacher' | 'student';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function teacherRequired(req: AuthRequest, res: Response, next: NextFunction) {
  authRequired(req, res, () => {
    if (req.user?.role !== 'teacher') {
      res.status(403).json({ error: '需要老师权限' });
      return;
    }
    next();
  });
}
