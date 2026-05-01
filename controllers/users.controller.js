import UserService from "../services/user.service.js";

export const createUser = async (req, res) => {
  try {
    const newUser = await UserService.createUser(req.body);

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserService.findUsers();

    res.json({
      code: 200,
      users,
      user: req.usuario,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const user = await UserService.loginUser(req.body);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
