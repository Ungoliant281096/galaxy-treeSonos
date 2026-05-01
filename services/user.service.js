// Service que se encarga de la logica de CRUD y Login de usuarios;
import { GalaxyUser } from "../models/User.model.js";
import { userSchema } from "../dtos/user.dto.js";
import { z } from "zod";
import bcrypt from "bcrypt";
import { generateJWT } from "../helpers/jwt.js";

const createUser = async (user) => {
  const newUser = await GalaxyUser(user);

  await newUser.save();

  return newUser;
};

const loginUser = async (user) => {
  const { email, password } = user;
  const userFound = await GalaxyUser.findOne({ email });

  if (!userFound) {
    throw new Error("El usuario no existe");
  }

  const isValidPassword = await userFound.comparePassword(password);
  if (!isValidPassword) {
    throw new Error("La contraseña es incorrecta");
  }

  const token = await generateJWT(userFound._id.toString(), userFound.tenant_id, userFound.role);

  return {
    user: userFound,
    token,
  };
};

const findUsers = async () => {
  const users = await GalaxyUser.find();

  return users;
};

export default { createUser, loginUser, findUsers };
