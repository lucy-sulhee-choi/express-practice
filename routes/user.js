const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

router
  //Creates a new user account. A request body containing the user to be registered must be sent.
  .post('/register', async function (req, res, next) {
    try {
      const email = req.body.email;
      const password = req.body.password;
      //check if both inputs are included in body.
      if (!email || !password) {
        res.status(400).json({
          error: true,
          message: "Request body incomplete, both email and password are required"
        });
        return;
      }
      // Check if user already exists in DB
      const users = await req.db.from("users").select("email").where("email", "=", email);
      if (users.length > 0) {
        return res.status(400).json({
          error: true,
          message: "User already exists"
        });
      }
      // Insert user into DB
      const saltRounds = 10;
      const hash = bcrypt.hashSync(password, saltRounds);
      await req.db.from("users").insert({ email, hash });

      res.status(201).json({ message: "User created" });
      console.log("Successfully inserted user");
    }
    catch (error) {
      res.status(500).json({
        error: true,
        message: "An unexpected error occurred"
      });
    }
  })

  //Log in to an existing user account. A request body containing the user credentials must be sent.
  .post('/login', async function (req, res, next) {
    const email = req.body.email;
    const password = req.body.password;

    // check if both inputs are included in body.
    if (!email || !password) {
      res.status(400).json({
        error: true,
        message: "Request body incomplete - email and password needed"
      });
      return;
    }
    try {
      //Retrieve email and password from req.body
      //check if user already exists in table
      const users = await req.db.from("users").select("*").where("email", "=", email);

      if (users.length === 0) {
        return res.status(400).json({
          error: true,
          message: "User does not exist"
        });
      }
      // Compare password hashes
      const user = users[0];
      const match = await bcrypt.compare(password, user.hash);
      if (!match) {
        return res.status(401).json({
          error: true,
          message: "Passwords do not match"
        });
      }
      // Create and return JWT token
      const expires_in = 60 * 60 * 24; // 24 hours
      const exp = Math.floor(Date.now() / 1000) + expires_in;
      const token = jwt.sign({ email, exp }, process.env.JWT_SECRET);
      res.status(200).json({
        token,
        token_type: "Bearer",
        expires_in
      });
    } catch (error) {
      res.status(500).json({
        error: true,
        message: "An unexpected error occurred"
      });
    }
  });

module.exports = router;