const express = require('express');
const router = express.Router();
const authorization = require('../middleware/authorization');
const multer = require('multer');
const upload = multer().single('image');

router
  //Get the user's poster for the movie with imdbID
  .get('/:imdbID', authorization, function (req, res, next) {
    const imageID = req.params.imdbID;
    const filter = { tconst: imageID };
    req.db
      .from("basics")
      .select("poster")
      .where(filter)
      .first()
      .then(row => {
        //check if there is a poster image
        if (!row || !row.poster) {
          res.status(404).json({
            error: true,
            message: "Poster not found"
          });
          return;
        };
        const posterData = row.poster;
        res.set('Content-Type', 'image/jpeg');
        res.send(posterData);
      })
      .catch(error => {
        res.status(500).json({
          error: true,
          message: "Database error - can't find the poster"
        });
        console.error(error.messgae);
      });
  })

  //Upload a poster for a movie
  .post('/add/:imdbID', authorization, function (req, res, next) {
    upload(req, res, function (err) {
      //check if there is an image file from user
      if (!req.file) {
        res.status(400).json({
          error: true,
          message: "Request body incomplete - poster image needed"
        });
        return;
      }
      const imageBuffer = req.file.buffer;
      const imageID = req.params.imdbID;
      const filter = { tconst: imageID };
      const poster = { poster: imageBuffer };
      req.db
        .from("basics")
        .where(filter)
        .update(poster)
        .then(_ => {
          res.status(201).json({
            error: false,
            message: "Poster Uploaded Successfully"
          });
        })
        .catch(error => {
          res.status(500).json({
            error: true,
            message: "Database error - not updated"
          });
          console.error(error.message);
        });
    });
  });

module.exports = router;