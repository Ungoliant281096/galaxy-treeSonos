import { Router } from "express";
import { userSchema } from "../dtos/user.dto.js";
import { validationMiddleware } from "../middlewares/validation.middleware.js";
import { loginUser,createUser, getAllUsers } from "../controllers/users.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.post("/", validationMiddleware(userSchema), createUser);
userRouter.get("/", [authMiddleware], getAllUsers);
userRouter.post("/login", loginUser);

export default userRouter;
