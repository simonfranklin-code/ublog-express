const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    //res.render('index', { user: req.user });
    res.redirect('/blog/ublog/ublog');
});

module.exports = router;