const fs = require('fs');
const path = require('path');
const Book = require('../models/book');

function calculateAverageRating(ratings) {
  if (ratings.length === 0) {
    return 0; 
  }

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  const average = sum / ratings.length;
  return average;
}

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  console.log(bookObject);
  delete bookObject._id;
  delete bookObject._userid;
  const book = new Book({
    ...bookObject,
    _userid: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
    averageRating: req.body.rating
  });
  book.save().then(
    async () => {
      const ratings = book.ratings.map((rating) => rating.grade);
      const newAverageRating = calculateAverageRating(ratings);
      book.averageRating = newAverageRating;
      await book.save();

      res.status(201).json({
        message: 'Livre enregistré avec succès !'
      });
    }
  ).catch(
    (error) => {
      console.log(error);
      res.status(400).json({
        error: error
      });
    }
  );
};
exports.getOneBook = (req, res, next) => {
  Book.findOne({
    _id: req.params.id
  }).then(
    (book) => {
      res.status(200).json(book);
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.getBookInfos = (id) => {
  return Book.findOne({
    _id: id
  })
  .then(
    (book) => {
      if (!book) throw new Error('Livre non trouvé');
      return book;
    }
  )
  .catch(
    (error) => {
      throw error;
    }
  );
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file ? {
    ...JSON.parse(req.body.book),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete bookObject._userId;
  
  Book.findOne({_id: req.params.id})
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message : 'Non autorisé'});
      } else {
        // Supprime l'ancienne image s'il y en a une et si une nouvelle image a été téléchargée
        if (book.imageUrl && req.file) {
          const filename = book.imageUrl.split('/images/')[1];
          fs.unlink(path.join(__dirname, '..', 'images', filename), (err) => {
            if (err) {
              console.error('Erreur lors de la suppression de l\'image:', err);
              return res.status(500).json({ error: "Une erreur s'est produite lors de la suppression de l'image." });
            }

            // Mettre à jour le livre avec les nouvelles informations
            Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id})
              .then(() => res.status(200).json({message : 'Livre modifié!'}))
              .catch(error => res.status(400).json({ error }));
          });
        } else {
          // Si aucune nouvelle image n'a été téléchargée, mettre à jour le livre normalement
          Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id})
            .then(() => res.status(200).json({message : 'Livre modifié!'}))
            .catch(error => res.status(400).json({ error }));
        }
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId !== req.auth.userId) {
        return res.status(401).json({ message: 'Non autorisé' });
      }
      const filename = book.imageUrl.split('/images/')[1];

      fs.unlink(`images/${filename}`, () => {
        Book.deleteOne({ _id: req.params.id })
          .then(() => {
            res.status(200).json({ message: 'Supprimé !' });
          })
          .catch((error) => {
            res.status(400).json({ error: error });
          });
      });
    })
    .catch((error) => {
      res.status(400).json({ error: error });
    });
};


exports.getAllBooks = (req, res, next) => {
  Book.find().then(
    (books) => {
      res.status(200).json(books);
    }
  ).catch(
    (error) => {
      res.status(400).json({
        error: error
      });
    }
  );
};

exports.rateBook = (req, res, next) => {
  const bookId = req.params.id;
  const { rating } = req.body;

  Book.findOne({ _id: bookId })
    .then(async (book) => {
      if (!book) {
        return res.status(404).json({ error: 'Livre non trouvé' });
      }

      // Vérifier si l'utilisateur a déjà noté le livre
      const userRatingIndex = book.ratings.findIndex((r) => r.userId.toString() === req.auth.userId);

      if (userRatingIndex !== -1) {
        book.ratings[userRatingIndex].grade = rating;
      } else {
        book.ratings.push({ userId: req.auth.userId, grade: rating });
      }

      const totalRatings = book.ratings.length;
      const sumRatings = book.ratings.reduce((total, r) => total + r.grade, 0);
      const averageRating = sumRatings / totalRatings;

      book.averageRating = averageRating;

      await book.save();
      const updatedBook = await exports.getBookInfos(bookId);
      if (!updatedBook) {
        return res.status(404).json({ error: 'Livre non trouvé après mise à jour' });
      }
      res.status(200).json(updatedBook);    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.getBestRatingBooks = (req, res, next) => {
  Book.find()
      .sort({ averageRating: -1 })
      .limit(3)
      .then((books) => {
        res.status(200).json(books);
      })
      .catch((error) => {
        res.status(400).json({
          error: error
        });
      });
};