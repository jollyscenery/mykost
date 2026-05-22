const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, setAvailability, uploadAvatar } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.put('/availability', authenticate, setAvailability);

// POST /api/users/avatar — upload/replace profile photo (all roles)
// Multer fileFilter rejects non-image MIME types before the controller runs
router.post('/avatar', authenticate, upload.single('photo'), uploadAvatar);

module.exports = router;
