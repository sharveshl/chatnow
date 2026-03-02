import express from 'express';
import multer from 'multer';
import path from 'path';
import authMiddleware from '../middlewares/authmiddleware.js';
import {
    createGroup,
    getMyGroups,
    getGroupMessages,
    updateGroup,
    uploadGroupPhoto,
    addMembers,
    removeMember,
    makeAdmin,
    deleteGroup
} from '../controllers/groupcontroller.js';

const router = express.Router();

// Multer for group photo
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `group_${req.params.groupId}_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

router.post('/', authMiddleware, createGroup);
router.get('/', authMiddleware, getMyGroups);
router.get('/:groupId/messages', authMiddleware, getGroupMessages);
router.put('/:groupId', authMiddleware, updateGroup);
router.post('/:groupId/photo', authMiddleware, upload.single('photo'), uploadGroupPhoto);
router.post('/:groupId/members', authMiddleware, addMembers);
router.delete('/:groupId/members/:username', authMiddleware, removeMember);
router.put('/:groupId/admin/:username', authMiddleware, makeAdmin);
router.delete('/:groupId', authMiddleware, deleteGroup);

export default router;
