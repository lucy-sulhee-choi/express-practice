const express = require('express');
const router = express.Router();

router
  //Returns a list of movie data. The list is arranged by imdbId, in ascending order.
  .get('/search', function (req, res, next) {
    const allowedParams = ['title', 'year', 'page'];
    const invalidParams = Object.keys(req.query).filter(param => !allowedParams.includes(param));

    //check if *movie title is provided.(*required)
    if (!req.query.title) {
      res.status(400).json({ message: `Required field is not provided` });
    }
    //check if the parameters are one of ['title', 'year', 'page']   
    else if (invalidParams.length > 0) {
      res.status(400).json({ error: true, message: `Invalid query parameters. Only year, title and page are permitted.` });
    }
    //check if the year format is in correct form
    else if ((isNaN(req.query.year) || (req.query.year).length !== 4) && (req.query.year)) {
      res.status(400).json({ error: true, message: 'Invalid year format. Format must be yyyy.' });
    }
    else {
      const title = req.query.title;
      const year = req.query.year;
      const page = req.query.page;
      const pageSize = 100;
      req.db
        .from("basics")
        .select("*")
        .where('primaryTitle', 'like', `%${title}%`)
        .modify(function (queryBuilder) {
          if (year) {
            queryBuilder.andWhere('startYear', year);
          } else {
            queryBuilder.orWhere('startYear', '');
          };
        })
        .then((rows) => {
          const total = rows.length;
          const totalPage = Math.ceil(total / pageSize);
          const currentPage = page || 1;
          const startItem = (currentPage - 1) * pageSize;
          const lastItem = Math.min(startItem + pageSize, total);
          const list = rows.slice(startItem, lastItem);
          res.json({
            data:
              list.map((movie) => ({
                Title: movie.primaryTitle,
                Year: movie.startYear,
                imdbID: movie.tconst,
                Type: movie.titleType
              })),
            Pagination: {
              total: total,
              lastPage: totalPage,
              perPage: pageSize,
              currentPage: currentPage,
              from: startItem,
              to: lastItem
            }
          });
        })
        .catch((err) => {
          console.error(err.message)
          res.json({ Error: true, Message: "Error in MySQL query" })
        })
    };
  })
  //Get data for a movie by imdbID
  .get('/data/:imdbID', function (req, res, next) {
    const imdbID = req.params.imdbID;
    const subquery = req.db
      .select('names.primaryName')
      .from('names')
      .leftJoin('principals', 'names.nconst', 'principals.nconst')
      .where('principals.tconst', imdbID)
      .andWhere('p.nconst', req.db.raw('principals.nconst'));

    req.db
      .select(
        subquery.as('Name'),
        'p.category',
        'm.primaryTitle as Title',
        'm.startYear as Year',
        'm.runtimeMinutes as Runtime',
        'm.genres as Genre',
        'r.averageRating as Ratings'
      )
      .from('basics as m')
      .rightJoin('ratings as r', 'm.tconst', 'r.tconst')
      .leftJoin('principals as p', 'm.tconst', 'p.tconst')
      .leftJoin('names as n', 'p.nconst', 'n.nconst')
      .where('m.tconst', imdbID)
      .then((rows) => {
        //rows return all the staff members linked to the movie
        try {
          const directors = rows.filter((data) => {
            if (data.category === 'director') {
              return data.Name
            };
          });
          const writers = rows.filter((data) => {
            if (data.category === 'writer') {
              return data.Name
            };
          });
          const actors = rows.filter((data) => {
            if (data.catergory === 'actor' || 'actress') {
              return data.Name
            };
          });
          const directorsNames = directors.map((direct) => { return direct.Name }).join(', ');
          const writersNames = writers.map((writer) => { return writer.Name }).join(', ');
          const actorsNames = actors.map((actor) => { return actor.Name }).join(', ');
          res.json({
            Title: rows[0].Title,
            Year: rows[0].Year,
            Runtime: rows[0].Runtime + ' min',
            Genre: rows[0].Genre,
            Director: directorsNames,
            Writer: writersNames,
            Actors: actorsNames,
            Ratings:
            {
              Source: "Internet Movie Database",
              Value: rows[0].Ratings + `/10`
            }
          });
        }
        catch {
          res.status(400).json({ message: `Invalid imdbID` })
        };
      })
      .catch((err) => {
        console.log(err.message);
        res.json({ Error: true, Message: 'Error in MySQL query' });
      });
  });

module.exports = router;