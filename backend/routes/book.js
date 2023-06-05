const express = require('express');
const router = express.Router();

const bookCtrl = require('../controllers/book');

const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const sharp = require('../middleware/sharp');

router.get('/', bookCtrl.getAllBooks);
router.post('/', auth, multer, sharp.resizeImage, bookCtrl.createBook);
router.get('/bestrating', bookCtrl.getBestRatingBooks);
router.get('/:id', bookCtrl.getOneBook);
router.put('/:id', auth, multer, sharp.resizeImage, bookCtrl.modifyBook);
router.post('/:id/rating', auth, bookCtrl.rateBook);
router.delete('/:id', auth, bookCtrl.deleteBook);

module.exports = router;
