import { Request, Response } from "express";
import { verifyPassword, findUser } from "./userStore.js";

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };

  const user = await findUser(username);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);

if (!valid) {
    // Generic message — do not hint that the username exists
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.status(200).json({ token: user.sessionToken });
}
