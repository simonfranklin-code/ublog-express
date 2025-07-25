const db = require('../models/db');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const BlogPost = require('../models/BlogPost');
const Blog = require('../models/Blog');
db.serialize(() => {
    db.run(`

        CREATE TABLE IF NOT EXISTS "HtmlSections" (
	        "HtmlSectionID"	INTEGER NOT NULL UNIQUE,
	        "Html"	TEXT,
	        "BlogPostId"	INTEGER NOT NULL,
	        "DateCreated"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	        "DateUpdated"	DATETIME,
	        "ViewIndex"	INTEGER,
	        "Anchor"	TEXT NOT NULL,
	        "Slug"	TEXT,
	        "UserId"	INTEGER,
	        "Page"	TEXT,
	        "Header"	TEXT,
	        "Body"	TEXT,
	        PRIMARY KEY("HtmlSectionID" AUTOINCREMENT),
	        CONSTRAINT "FK_HtmlSections_BlogPosts_BlogPostId" FOREIGN KEY("BlogPostId") REFERENCES "BlogPosts"("BlogPostId") ON DELETE CASCADE
        );
    `);
});

class HtmlSection {

    static add(html, blogPostId, viewIndex, anchor, slug, page, header, body) {
        const dateCreated = new Date().toLocaleString();
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO HtmlSections (Html, BlogPostId, ViewIndex, Anchor, Slug, Page, Header, Body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [html, blogPostId, viewIndex, anchor, slug, page, header, body], function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                });
        });
    }

    static edit(htmlSectionId, html, viewIndex, anchor, slug, page, header, body) {
        const dateUpdated = new Date().toISOString();
        return new Promise((resolve, reject) => {
            db.run(`UPDATE HtmlSections SET Html = ?, ViewIndex = ?, Anchor = ?, Slug = ?, Page = ?, Header = ?, Body = ?, DateUpdated = ? WHERE HtmlSectionID = ?`,
                [html, viewIndex, anchor, slug, page, header, body, dateUpdated, htmlSectionId], function (err) {
                    if (err) return reject(err);
                    resolve(this.changes);
                });
        });
    }

    static deleteBySlug(slug) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM HtmlSections WHERE Slug = ?`,
                [slug], function (err) {
                    if (err) return reject(err);
                    resolve(this.changes);
                });
        });
    }

    static delete(htmlSectionId) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM HtmlSections WHERE HtmlSectionID = ?`, [htmlSectionId], function (err) {
                if (err) return reject(err);
                resolve(this.changes);
            });
        });
    }

    static get(htmlSectionId) {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM HtmlSections WHERE HtmlSectionID = ?`, [htmlSectionId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    static async getAll(page = 1, limit = 5, sortField = 'ViewIndex', sortOrder = 'DESC', filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = '';
        let params = [];
        if (filters.anchor) {
            whereClause += ' AND Anchor LIKE ?';
            params.push(`%${filters.anchor}%`);
        }
        if (filters.blogPostId) {
            whereClause += ' AND BlogPostId = ?';
            params.push(filters.blogPostId);
        }
        const query = `SELECT * FROM HtmlSections WHERE 1=1${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
        return new Promise((resolve, reject) => {
            db.all(query, [...params, limit, offset], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static async getWitsecSearchDb() {

        const query = `SELECT Page AS page, Anchor AS anchor, Header AS header, Body AS body FROM HtmlSections`;
        return new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static async getAllInternal(blogPostId) {

        const query = `SELECT * FROM HtmlSections WHERE BlogPostId = ? ORDER BY ViewIndex ASC`;
        return new Promise((resolve, reject) => {
            db.all(query, [blogPostId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static getHtmlSectionsCount(filter = {}) {
        let query = 'SELECT COUNT(*) AS count FROM HtmlSections WHERE 1=1';
        const params = [];

        if (filter.name) {
            query += ' AND name LIKE ?';
            params.push(`%${filter.name}%`);
        }

        if (filter.blogPostId) {
            query += ' AND BlogPostId = ?';
            params.push(`${filter.blogPostId}`);
        }

        return new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) {
                    this.logError(err);
                    return reject(err);
                }
                resolve(row.count);
            });
        });
    }

    // Fetch HTML content from the given URL
    static async fetchHTML(htmlFilePath) {
        try {
            // Read the file content
            const html = await fs.readFile(htmlFilePath, 'utf-8');
            //console.log('HTML Content:', html);
            return html;
        } catch (error) {
            console.error(`Error fetching the file: ${htmlFilePath}:`, error);
            throw error;
        }

    }

    // Extract a single HTML section based on its id attribute using cheerio
    static extractHtmlSectionById(html, id) {
        const $ = cheerio.load(html);
        const section = $(`section#${id}`);

        if (section.length > 0) {
            return [$.html(section), section.attr('id')];
        }

        return null;
    }

    // Extract HTML section using cheerio
    static extractHtmlSections(html) {
        const $ = cheerio.load(html);
        const sections = [];

        $('section').each((index, element) => {
            sections.push([$.html(element), $(element).attr('id')]);
        });

        return sections;
    }

    // Update HTML sections in the database
    static async insertHtmlSections(blogPostId, htmlSections, blogSlug, slug) {

        await HtmlSection.deleteBySlug(slug);
        let data = [];
        if (htmlSections !== 'undefined' && htmlSections.length > 0) {
            data = JSON.parse(await fs.readFile(`./public/${blogSlug.Slug}/assets/witsec-search/search.json`, 'utf-8'));
            let i = 0;
            for (const section of htmlSections) {
                i += 1;
                const [htmlContent, anchor] = section; // Destructure the outer HTML and id (anchor) from each sub-array

                
                for (const item of data) {

                    if (item.page.toLowerCase() === slug + '.html' && item.anchor === anchor) {

                        try {
                            await HtmlSection.add(htmlContent, blogPostId, i, item.anchor, slug, item.page, item.header, item.body);
                            console.log(`HtmlSection ${slug} inserted successfully.`);
                            ;
                            break;
                        } catch (error) {
                            console.error(`Error updating HtmlSection ${item.anchor}`, error);
                        }
                    }
                }

            }

        }

    }

    // Main function to execute the steps
    static async importHtml(url, blogPostId, blogSlug, slug) {
        try {
            const html = await HtmlSection.fetchHTML(url);
            const htmlSections = await HtmlSection.extractHtmlSections(html);
            await HtmlSection.insertHtmlSections(blogPostId, htmlSections, blogSlug, slug);
            return new Promise((resolve, reject) => {
                if (htmlSections === 'undefined') {
                    reject(new Error('htmlSections is undefined'));
                } else if (htmlSections.length <= 0) {
                    reject(new Error('htmlSections is <= 0'));
                } else {

                    resolve(htmlSections);
                }
            });

        } catch (error) {
            console.error('Error in main function', error);
        }
    }

    // Main function to execute the steps
    static async importSingleHtmlSection(url, id) {
        try {
            const html = await HtmlSection.fetchHTML(url);
            const htmlSections = await HtmlSection.extractHtmlSectionById(html, id);
            //await HtmlSection.updateHtmlSections(blogPostId, htmlSections);
            return new Promise((resolve, reject) => {
                if (htmlSections === 'undefined') {
                    reject(new Error('htmlSections is undefined'));
                } else if (htmlSections.length <= 0) {
                    reject(new Error('htmlSections is <= 0'));
                } else {

                    resolve(htmlSections);
                }
            });

        } catch (error) {
            console.error('Error in main function', error);
        }
    }

    static logError(err) {
        const errorMessage = `${new Date().toISOString()} - Error: ${err.message}\n`;
        fs.appendFile('error.log', errorMessage, (fsErr) => {
            if (fsErr) {
                console.error('Failed to write to log file:', fsErr);
            }
        });
    }

}
module.exports = HtmlSection;

