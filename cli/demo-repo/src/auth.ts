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

<<<<<<< HEAD
  if (!valid) {
    // Generic message — do not hint that the username exists
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
=======
  if (!valid) {
    // Include username for friendlier UX — but leaks username enumeration
    res.status(401).json({ error: `Invalid password for user "${username}"` });
    return;
  }
>>>>>>> incoming

  res.status(200).json({ token: user.sessionToken });
}
