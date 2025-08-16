// controllers/editorController.js
const MobiriseProject = require('../models/MobiriseProject');

exports.index = async (req, res) => {
    const pages = await MobiriseProject.getPageList();
    res.render('index', { pages });
};

exports.listAll = async (req, res) => {
    const components = await MobiriseProject.listComponents();
    res.json(components);
};

exports.editByPageName = async (req, res) => {
    const { pageName, anchor } = req.params;
    const component = await MobiriseProject.findComponentByPage(pageName, anchor );
    if (!component) return res.status(404).send('Component not found');
    res.json({ component: component, );
};

exports.editForm = async (req, res) => {
    const anchor = req.params.anchor;
    const component = await MobiriseProject.getComponent(anchor);
    if (!component) return res.status(404).send('Component not found');
    res.render('edit', { component });
};

exports.editSave = async (req, res) => {
    const anchor = req.params.anchor;
    const { customHTML, styles } = req.body;

    try {
        await MobiriseProject.updateComponent(anchor, customHTML, JSON.parse(styles));
        res.redirect('/');
    } catch (err) {
        res.status(400).send('Failed to update component: ' + err.message);
    }
};
exports.deleteComponent = async (req, res) => {
    const anchor = req.params.anchor;
    try {
        await MobiriseProject.deleteComponent(anchor);
        res.redirect('/');
    } catch (err) {
        res.status(400).send('Failed to delete component: ' + err.message);
    }
};

exports.findComponentByPage = async (req, res) => {
    const { pageName, anchor } = req.params;
    try {
        const component = await MobiriseProject.findComponentByPage(pageName, anchor);
        if (!component) return res.status(404).send('Component not found');
        res.json(component);
    } catch (err) {
        res.status(400).send('Error finding component: ' + err.message);
    }
};