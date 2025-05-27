const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

router.use(isLoggedIn, isAdmin);

router.get('/dashboard', adminController.getDashboard);

router.get('/products', adminController.getProductsPage);
router.get('/products/add', adminController.getAddProductPage);
router.post('/products/add', adminController.addProduct);
router.get('/products/edit/:id', adminController.getEditProductPage);
router.post('/products/edit/:id', adminController.updateProduct);
router.post('/products/delete/:id', adminController.deleteProduct);

router.get('/users', adminController.getUsersPage);
router.get('/orders', adminController.getOrdersPage);
router.get('/deposits', adminController.getDepositsPage);
router.post('/deposits/approve/:depositId', adminController.approveDeposit);

module.exports = router;