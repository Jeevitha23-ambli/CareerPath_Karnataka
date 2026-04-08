// routes/exams.js
const express = require('express');
const axios = require('axios');
const { pool } = require('../db/connection');

const router = express.Router();

// ================= SAFE JSON PARSE =================
function safeJSONParse(value) {
    try {
        if (!value) return [];

        if (Array.isArray(value)) return value;

        if (typeof value === 'string' && value.trim().startsWith('[')) {
            return JSON.parse(value);
        }

        if (typeof value === 'string') {
            return value.split(',').map(v => v.trim());
        }

        return [];
    } catch (e) {
        return [];
    }
}

// ============================================================
// GET /api/exams-live
// ============================================================
router.get('/', async(req, res) => {
    const { stream_id, type, search } = req.query;

    try {
        const dbExams = await fetchExamsFromDB({ stream_id, type, search });

        let enrichedExams = dbExams;
        try {
            enrichedExams = await enrichWithLiveData(dbExams);
        } catch (apiErr) {
            console.warn('⚠️ Exam enrichment API failed:', apiErr.message);
        }

        return res.json({
            success: true,
            exams: enrichedExams,
            total: enrichedExams.length,
            lastUpdated: new Date().toISOString()
        });

    } catch (err) {
        console.error('Exams route error:', err);
        return res.status(500).json({
            success: false,
            exams: [],
            total: 0
        });
    }
});

// ============================================================
// DB FETCH
// ============================================================
async function fetchExamsFromDB({ stream_id, type, search } = {}) {
    try {
        let query = 'SELECT * FROM exams WHERE 1=1';
        const params = [];

        if (stream_id && parseInt(stream_id) > 0) {
            query += ' AND JSON_CONTAINS(stream_ids, ?)';
            params.push(JSON.stringify(parseInt(stream_id)));
        }

        if (type) {
            query += ' AND exam_type = ?';
            params.push(type);
        }

        if (search) {
            query += ' AND (name LIKE ? OR full_name LIKE ?)';
            const like = `%${search}%`;
            params.push(like, like);
        }

        query += ' ORDER BY FIELD(exam_type,"National","State","Professional","University"), difficulty DESC';

        const [rows] = await pool.execute(query, params);

        return rows.map(r => ({
            id: r.id,
            exam_name: r.name,
            full_name: r.full_name,
            next_exam_date: r.exam_date,
            eligibility: r.eligibility,

            // ✅ FIXED (no JSON.parse crash)
            subjects: safeJSONParse(r.subjects),
            stream_ids: safeJSONParse(r.stream_ids),

            exam_type: r.exam_type,
            website: r.website,
            difficulty: r.difficulty,

            registration_url: r.website,
            last_date: 'Check official website'
        }));

    } catch (err) {
        console.error('DB exams fetch error:', err.message);
        return [];
    }
}

// ============================================================
// API ENRICHMENT
// ============================================================
async function enrichWithLiveData(exams) {
    const examApiKey = process.env.EXAM_API_KEY;

    if (!examApiKey || examApiKey === 'YOUR_EXAM_API_KEY_HERE') {
        return exams;
    }

    try {
        const response = await axios.get('https://api.exams.nta.ac.in/v1/upcoming', {
            headers: {
                'Authorization': `Bearer ${examApiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        const liveData = (response.data && response.data.exams) ? response.data.exams : [];

        return exams.map(exam => {
            const liveExam = liveData.find(l =>
                l.name && l.name.toLowerCase().includes(exam.exam_name.toLowerCase())
            );

            if (liveExam) {
                return {
                    ...exam,
                    next_exam_date: liveExam.date || exam.next_exam_date,
                    last_date: liveExam.registration_close || exam.last_date,
                    registration_url: liveExam.apply_url || exam.registration_url
                };
            }

            return exam;
        });

    } catch (err) {
        throw new Error(`Exam API call failed: ${err.message}`);
    }
}

module.exports = router;