// routes/editor.js
const express = require('express');
const router = express.Router();
const EditorController = require('../controllers/editorController');

// Home: Show all pages & components
router.get('/', EditorController.index);

// Edit form for a single component
router.get('/editByPageName/:pageName/:anchor', EditorController.editByPageName);

// Edit form for a single component
router.get('/edit/:anchor', EditorController.editForm);

// Save edits (HTML + styles) for a component
router.post('/edit/:anchor', EditorController.editSave);

// API: List all components (JSON)
router.get('/list', EditorController.listAll);

module.exports = router;
