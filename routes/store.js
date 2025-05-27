const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/products', storeController.getProductsPage);
router.get('/product/:id', storeController.getProductDetailPage);
router.post('/buy/:productId', isLoggedIn, storeController.buyProduct);

module.exports = router;