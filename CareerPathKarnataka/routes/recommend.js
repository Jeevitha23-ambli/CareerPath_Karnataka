// routes/recommend.js
const express = require('express');
const axios = require('axios');
const { pool } = require('../db/connection');

const router = express.Router();

function safeJSONParse(value) {
    try {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.trim().startsWith('[')) return JSON.parse(value);
        if (typeof value === 'string') return value.split(',').map(v => v.trim());
        return [];
    } catch (e) { return []; }
}

// ============================================================
// MOCK FALLBACK DATA — used when ALL sources fail
// ============================================================
const MOCK_CAREERS = {
    1: [ // Science PCM
        { id: 'm1', name: 'Software Engineer', stream_id: 1, interest_ids: [], description: 'Design and develop software systems and applications.', salary: '₹6L – ₹25L/year', duration: '4 years (B.E/B.Tech)', demand: 5, icon: '💻', category: 'Technology', top_recruiters: ['TCS', 'Infosys', 'Wipro', 'Google', 'Microsoft'], skills: [{ category: 'Technical', items: ['C++', 'Python', 'Data Structures', 'Algorithms'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Mathematics', 'Physics', 'Programming basics'] }] },
        { id: 'm2', name: 'Data Scientist', stream_id: 1, interest_ids: [], description: 'Analyse complex data to help organisations make better decisions.', salary: '₹8L – ₹30L/year', duration: '4 years (B.Tech) + optional M.Tech', demand: 5, icon: '📊', category: 'Analytics', top_recruiters: ['Amazon', 'Flipkart', 'Mu Sigma', 'Fractal'], skills: [{ category: 'Technical', items: ['Python', 'ML', 'Statistics', 'SQL'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Statistics', 'Programming', 'Mathematics'] }] },
        { id: 'm3', name: 'Mechanical Engineer', stream_id: 1, interest_ids: [], description: 'Design, develop and manufacture mechanical systems and products.', salary: '₹4L – ₹15L/year', duration: '4 years (B.E/B.Tech)', demand: 4, icon: '⚙️', category: 'Engineering', top_recruiters: ['ISRO', 'DRDO', 'L&T', 'Bosch'], skills: [{ category: 'Technical', items: ['CAD/CAM', 'Thermodynamics', 'Manufacturing'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Engineering Drawing', 'Mathematics', 'Physics'] }] }
    ],
    2: [ // Science PCB
        { id: 'm4', name: 'MBBS Doctor', stream_id: 2, interest_ids: [], description: 'Diagnose and treat medical conditions in patients.', salary: '₹8L – ₹40L/year', duration: '5.5 years (MBBS)', demand: 5, icon: '🩺', category: 'Medical', top_recruiters: ['Government Hospitals', 'Apollo', 'Manipal Hospitals'], skills: [{ category: 'Medical', items: ['Anatomy', 'Physiology', 'Pharmacology'] }], roadmap: [{ year: 'Year 1', title: 'Pre-clinical', details: ['Anatomy', 'Biochemistry', 'Physiology'] }] },
        { id: 'm5', name: 'Pharmacist', stream_id: 2, interest_ids: [], description: 'Prepare and dispense medicines and advise on drug use.', salary: '₹3L – ₹12L/year', duration: '4 years (B.Pharm)', demand: 4, icon: '💊', category: 'Medical', top_recruiters: ['Sun Pharma', 'Cipla', 'Dr Reddy\'s', 'Biocon'], skills: [{ category: 'Technical', items: ['Pharmacology', 'Drug Chemistry', 'Clinical Practice'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Chemistry', 'Biology', 'Pharmacy basics'] }] },
        { id: 'm6', name: 'Biotechnologist', stream_id: 2, interest_ids: [], description: 'Apply biological systems to develop products and technologies.', salary: '₹4L – ₹18L/year', duration: '4 years (B.Tech Biotech)', demand: 4, icon: '🧬', category: 'Science', top_recruiters: ['Biocon', 'Strand Life Sciences', 'Serum Institute'], skills: [{ category: 'Technical', items: ['Genetics', 'Microbiology', 'Lab Techniques'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Biology', 'Chemistry', 'Biotechnology basics'] }] }
    ],
    3: [ // Commerce
        { id: 'm7', name: 'Chartered Accountant', stream_id: 3, interest_ids: [], description: 'Manage financial records, auditing and tax compliance.', salary: '₹7L – ₹30L/year', duration: '4–5 years (CA program)', demand: 5, icon: '📈', category: 'Finance', top_recruiters: ['Deloitte', 'EY', 'KPMG', 'PWC', 'Big4'], skills: [{ category: 'Finance', items: ['Accounting', 'Taxation', 'Auditing', 'Law'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Accounting', 'Business Law', 'Economics'] }] },
        { id: 'm8', name: 'MBA / Business Manager', stream_id: 3, interest_ids: [], description: 'Lead teams and manage business operations and strategy.', salary: '₹6L – ₹25L/year', duration: '3 years (BBA) + 2 years (MBA)', demand: 5, icon: '💼', category: 'Management', top_recruiters: ['Infosys', 'HUL', 'HDFC', 'TCS', 'Wipro'], skills: [{ category: 'Management', items: ['Leadership', 'Marketing', 'Finance', 'Operations'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Business Studies', 'Economics', 'Accounting'] }] },
        { id: 'm9', name: 'Banking Professional', stream_id: 3, interest_ids: [], description: 'Manage financial transactions and banking operations.', salary: '₹4L – ₹15L/year', duration: '3 years (B.Com)', demand: 4, icon: '🏦', category: 'Banking', top_recruiters: ['SBI', 'HDFC Bank', 'ICICI', 'Axis Bank'], skills: [{ category: 'Finance', items: ['Banking Operations', 'Finance', 'Communication'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Accountancy', 'Economics', 'Mathematics'] }] }
    ],
    4: [ // Arts / Humanities
        { id: 'm10', name: 'Civil Services (IAS/IPS)', stream_id: 4, interest_ids: [], description: 'Serve in administrative and police services of India.', salary: '₹8L – ₹20L/year + perks', duration: '3 years (BA) + UPSC preparation', demand: 5, icon: '🏛️', category: 'Government', top_recruiters: ['Government of India', 'State Governments'], skills: [{ category: 'Knowledge', items: ['General Studies', 'Current Affairs', 'Essay Writing'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['History', 'Geography', 'Polity'] }] },
        { id: 'm11', name: 'Journalist / Media Professional', stream_id: 4, interest_ids: [], description: 'Report, write and broadcast news and media content.', salary: '₹3L – ₹15L/year', duration: '3 years (BA Journalism / Mass Communication)', demand: 4, icon: '📰', category: 'Media', top_recruiters: ['Times of India', 'NDTV', 'The Hindu', 'Prajavani'], skills: [{ category: 'Communication', items: ['Writing', 'Reporting', 'Photography', 'Editing'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Media Studies', 'Communication', 'Language'] }] },
        { id: 'm12', name: 'Lawyer / Advocate', stream_id: 4, interest_ids: [], description: 'Provide legal advice and represent clients in courts.', salary: '₹4L – ₹25L/year', duration: '5 years (BA LLB)', demand: 4, icon: '⚖️', category: 'Law', top_recruiters: ['Law Firms', 'Courts', 'Corporate Legal Depts'], skills: [{ category: 'Legal', items: ['Constitutional Law', 'Civil Law', 'Criminal Law', 'Research'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Legal Methods', 'History', 'Political Science'] }] }
    ],
    5: [ // Emerging Tech
        { id: 'm13', name: 'AI / ML Engineer', stream_id: 5, interest_ids: [], description: 'Build artificial intelligence and machine learning systems.', salary: '₹10L – ₹50L/year', duration: '4 years (B.Tech CS/AI)', demand: 5, icon: '🤖', category: 'AI/ML', top_recruiters: ['Google', 'Microsoft', 'Amazon', 'Flipkart', 'Zomato'], skills: [{ category: 'Technical', items: ['Python', 'TensorFlow', 'Deep Learning', 'Statistics'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Mathematics', 'Programming', 'Linear Algebra'] }] },
        { id: 'm14', name: 'Cybersecurity Analyst', stream_id: 5, interest_ids: [], description: 'Protect organisations\' systems and data from cyber threats.', salary: '₹6L – ₹25L/year', duration: '4 years (B.Tech CS/IT)', demand: 5, icon: '🔐', category: 'Security', top_recruiters: ['Wipro', 'Infosys', 'IBM', 'Palo Alto Networks'], skills: [{ category: 'Technical', items: ['Network Security', 'Ethical Hacking', 'SIEM', 'Cryptography'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Networking', 'Operating Systems', 'Programming'] }] },
        { id: 'm15', name: 'Cloud Engineer', stream_id: 5, interest_ids: [], description: 'Design and manage cloud infrastructure and services.', salary: '₹7L – ₹30L/year', duration: '4 years (B.Tech) + Cloud Certifications', demand: 5, icon: '☁️', category: 'Cloud', top_recruiters: ['AWS', 'Google Cloud', 'Azure', 'TCS', 'Accenture'], skills: [{ category: 'Technical', items: ['AWS/Azure/GCP', 'DevOps', 'Linux', 'Networking'] }], roadmap: [{ year: 'Year 1', title: 'Foundation', details: ['Networking', 'Linux', 'Programming'] }] }
    ]
};

const MOCK_COLLEGES = [
    { id: 'mc1', name: 'Indian Institute of Science (IISc)', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Government', ranking: '#1 in India', streams: [1, 2, 3, 4, 5], website: 'https://www.iisc.ac.in', highlight: 'Premier research institution', rating: 5, source: 'fallback' },
    { id: 'mc2', name: 'National Institute of Technology Karnataka', location: 'Surathkal, Mangaluru', district: 'Dakshina Kannada', type: 'Government', ranking: 'Top NIT', streams: [1, 2, 3, 4, 5], website: 'https://www.nitk.ac.in', highlight: 'Top engineering college', rating: 5, source: 'fallback' },
    { id: 'mc3', name: 'Manipal Academy of Higher Education', location: 'Manipal', district: 'Udupi', type: 'Deemed', ranking: 'Top Deemed University', streams: [1, 2, 3, 4, 5], website: 'https://www.manipal.edu', highlight: 'World-class facilities', rating: 5, source: 'fallback' },
    { id: 'mc4', name: 'R.V. College of Engineering', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Private', ranking: 'Top private engineering', streams: [1, 5], website: 'https://www.rvce.edu.in', highlight: 'Excellent placements', rating: 4, source: 'fallback' },
    { id: 'mc5', name: 'M.S. Ramaiah Institute of Technology', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Private', ranking: 'Top private college', streams: [1, 5], website: 'https://www.msrit.edu', highlight: 'Strong industry connect', rating: 4, source: 'fallback' },
    { id: 'mc6', name: 'St. John\'s Medical College', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Private', ranking: 'Top Medical College', streams: [2], website: 'https://www.stjohns.in', highlight: 'Premier medical college', rating: 5, source: 'fallback' },
    { id: 'mc7', name: 'Kasturba Medical College', location: 'Mangaluru', district: 'Dakshina Kannada', type: 'Deemed', ranking: 'Top Medical', streams: [2], website: 'https://www.manipal.edu/kmc-mangalore', highlight: 'Excellent medical education', rating: 5, source: 'fallback' },
    { id: 'mc8', name: 'Christ University', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Deemed', ranking: 'Top Arts & Commerce', streams: [3, 4], website: 'https://www.christuniversity.in', highlight: 'Best arts & commerce', rating: 4, source: 'fallback' },
    { id: 'mc9', name: 'Jain University', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Deemed', ranking: 'Top Deemed', streams: [1, 3, 4, 5], website: 'https://www.jainuniversity.ac.in', highlight: 'Diverse programs', rating: 4, source: 'fallback' },
    { id: 'mc10', name: 'PES University', location: 'Bengaluru', district: 'Bengaluru Urban', type: 'Private', ranking: 'Top Tech College', streams: [1, 5], website: 'https://www.pes.edu', highlight: 'Strong CS & tech focus', rating: 4, source: 'fallback' }
];

const MOCK_EXAMS = {
    1: [{ id: 'me1', name: 'JEE Main', full_name: 'Joint Entrance Examination Main', description: 'National entrance for B.Tech admissions', stream_ids: [1], subjects: ['Physics', 'Chemistry', 'Mathematics'], website: 'https://jeemain.nta.nic.in' }, { id: 'me2', name: 'KCET', full_name: 'Karnataka Common Entrance Test', description: 'State entrance for engineering in Karnataka', stream_ids: [1], subjects: ['Physics', 'Chemistry', 'Mathematics'], website: 'https://cetonline.karnataka.gov.in' }],
    2: [{ id: 'me3', name: 'NEET UG', full_name: 'National Eligibility cum Entrance Test', description: 'Entrance for MBBS and BDS admissions', stream_ids: [2], subjects: ['Physics', 'Chemistry', 'Biology'], website: 'https://neet.nta.nic.in' }, { id: 'me4', name: 'KCET', full_name: 'Karnataka Common Entrance Test', description: 'State entrance for medical in Karnataka', stream_ids: [2], subjects: ['Physics', 'Chemistry', 'Biology'], website: 'https://cetonline.karnataka.gov.in' }],
    3: [{ id: 'me5', name: 'CA Foundation', full_name: 'Chartered Accountancy Foundation', description: 'Entry to CA program by ICAI', stream_ids: [3], subjects: ['Accounting', 'Business Law', 'Economics'], website: 'https://www.icai.org' }, { id: 'me6', name: 'IPMAT', full_name: 'Integrated Program in Management Aptitude Test', description: 'IIM entrance for 5-year BBA+MBA', stream_ids: [3], subjects: ['Quantitative Aptitude', 'Verbal Ability', 'LR'], website: 'https://www.iimindore.ac.in/ipmat' }],
    4: [{ id: 'me7', name: 'CUET', full_name: 'Common University Entrance Test', description: 'Central universities UG entrance', stream_ids: [4], subjects: ['Domain Subject', 'General Test', 'Language'], website: 'https://cuet.samarth.ac.in' }, { id: 'me8', name: 'CLAT', full_name: 'Common Law Admission Test', description: 'National entrance for law programs', stream_ids: [4], subjects: ['English', 'GK', 'Logical Reasoning', 'Legal Aptitude'], website: 'https://consortiumofnlus.ac.in' }],
    5: [{ id: 'me9', name: 'JEE Main', full_name: 'Joint Entrance Examination Main', description: 'National entrance for B.Tech including CS/IT', stream_ids: [5], subjects: ['Physics', 'Chemistry', 'Mathematics'], website: 'https://jeemain.nta.nic.in' }, { id: 'me10', name: 'KCET', full_name: 'Karnataka Common Entrance Test', description: 'State entrance for tech streams', stream_ids: [5], subjects: ['Physics', 'Chemistry', 'Mathematics'], website: 'https://cetonline.karnataka.gov.in' }]
};

// ============================================================
// POST /api/recommend
// ============================================================
router.post('/recommend', async(req, res) => {
    const { stream_id, interest_ids = [] } = req.body;
    if (!stream_id) return res.status(400).json({ success: false, error: 'stream_id is required' });

    const sid = parseInt(stream_id);

    // Step 1: Fetch DB data using Promise.allSettled — never throws
    const [careersResult, dbCollegesResult, examsResult] = await Promise.allSettled([
        fetchCareersWithDetails(stream_id, interest_ids),
        fetchCollegesForStream(stream_id),
        fetchExamsForStream(stream_id)
    ]);

    let careers = careersResult.status === 'fulfilled' ? (careersResult.value || []) : [];
    let dbColleges = dbCollegesResult.status === 'fulfilled' ? (dbCollegesResult.value || []) : [];
    let exams = examsResult.status === 'fulfilled' ? (examsResult.value || []) : [];

    console.log(`[Recommend] DB → Careers: ${careers.length}, Colleges: ${dbColleges.length}, Exams: ${exams.length}`);

    // Step 2: Try API expansion with timeout protection
    let apiColleges = [];
    try {
        const apiPromise = expandCollegesWithFreeAPIs(stream_id);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 30000));
        apiColleges = await Promise.race([apiPromise, timeoutPromise]);
        console.log(`[Recommend] API colleges: ${apiColleges.length}`);
    } catch (err) {
        console.warn('[Recommend] API expansion skipped:', err.message);
        apiColleges = [];
    }

    // Step 3: Merge colleges
    let finalColleges = mergeAndDeduplicate(dbColleges, apiColleges);
    if (!finalColleges || finalColleges.length === 0) finalColleges = dbColleges;

    // Step 4: Apply fallbacks if DB also empty
    if (!careers || careers.length === 0) {
        console.warn('[Recommend] Using mock careers fallback');
        careers = MOCK_CAREERS[sid] || MOCK_CAREERS[1];
    }
    if (!finalColleges || finalColleges.length === 0) {
        console.warn('[Recommend] Using mock colleges fallback');
        finalColleges = MOCK_COLLEGES.filter(c => c.streams.includes(sid) || c.streams.includes(0));
        if (finalColleges.length === 0) finalColleges = MOCK_COLLEGES;
    }
    if (!exams || exams.length === 0) {
        console.warn('[Recommend] Using mock exams fallback');
        exams = MOCK_EXAMS[sid] || MOCK_EXAMS[1];
    }

    console.log(`[Recommend] Final → Careers: ${careers.length}, Colleges: ${finalColleges.length}, Exams: ${exams.length}`);

    // Step 5: ALWAYS return success — never throw
    return res.json({
        success: true,
        careers,
        colleges: finalColleges,
        exams,
        totalCareers: careers.length,
        totalColleges: finalColleges.length,
        totalExams: exams.length,
        lastUpdated: new Date().toISOString()
    });
});

// ============================================================
// GET /api/careers
// ============================================================
router.get('/careers', async(req, res) => {
    const { stream_id } = req.query;
    try {
        let query = `SELECT c.*, GROUP_CONCAT(DISTINCT s.category ORDER BY s.id) as skill_categories
                     FROM careers c LEFT JOIN skills s ON c.id = s.career_id`;
        const params = [];
        if (stream_id) {
            query += ' WHERE c.stream_id = ?';
            params.push(parseInt(stream_id));
        }
        query += ' GROUP BY c.id ORDER BY c.demand DESC, c.name ASC';
        const [rows] = await pool.execute(query, params);
        const careers = await Promise.all(rows.map(r => enrichCareer(r)));
        return res.json({ success: true, careers, total: careers.length });
    } catch (err) {
        console.error('[Careers] Route error:', err);
        return res.status(500).json({ success: false, careers: [] });
    }
});

// ============================================================
// GET /api/careers/:id
// ============================================================
router.get('/careers/:id', async(req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute('SELECT * FROM careers WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false });
        const career = await enrichCareer(rows[0]);

        const [dbCollegesResult, examsResult] = await Promise.allSettled([
            fetchCollegesForStream(career.stream_id),
            fetchExamsForStream(career.stream_id)
        ]);

        const dbColleges = dbCollegesResult.status === 'fulfilled' ? (dbCollegesResult.value || []) : [];
        const exams = examsResult.status === 'fulfilled' ? (examsResult.value || []) : [];

        let apiColleges = [];
        try {
            apiColleges = await expandCollegesWithFreeAPIs(career.stream_id);
        } catch (e) {
            console.warn('[CareerDetail] API expansion skipped:', e.message);
        }

        let finalColleges = mergeAndDeduplicate(dbColleges, apiColleges);
        if (!finalColleges || finalColleges.length === 0) finalColleges = dbColleges;

        return res.json({
            success: true,
            career,
            colleges: finalColleges.slice(0, 12),
            exams: exams.slice(0, 8)
        });
    } catch (err) {
        console.error('[CareerDetail] Route error:', err);
        return res.status(500).json({ success: false });
    }
});

// ============================================================
// GET /api/streams
// ============================================================
router.get('/streams', async(req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM streams ORDER BY id');
        return res.json({ success: true, streams: rows });
    } catch (err) {
        console.error('[Streams] Route error:', err);
        return res.status(500).json({ success: false, streams: [] });
    }
});

// ============================================================
// GET /api/interests
// ============================================================
router.get('/interests', async(req, res) => {
    const { stream_id } = req.query;
    try {
        let interests;
        if (stream_id) {
            const [rows] = await pool.execute(
                'SELECT * FROM interests WHERE JSON_CONTAINS(stream_ids, ?) ORDER BY id', [JSON.stringify(parseInt(stream_id))]
            );
            interests = rows;
        } else {
            const [rows] = await pool.execute('SELECT * FROM interests ORDER BY id');
            interests = rows;
        }
        interests = interests.map(i => ({...i, stream_ids: safeJSONParse(i.stream_ids) }));
        return res.json({ success: true, interests });
    } catch (err) {
        console.error('[Interests] Route error:', err);
        return res.status(500).json({ success: false, interests: [] });
    }
});

// ============================================================
// HELPERS
// ============================================================
async function fetchCareersWithDetails(stream_id, interest_ids = []) {
    try {
        const [rows] = await pool.execute('SELECT * FROM careers WHERE stream_id = ?', [parseInt(stream_id)]);
        let filtered = rows;
        if (interest_ids.length > 0) {
            const ids = interest_ids.map(Number);
            filtered = rows.filter(r => {
                const ci = safeJSONParse(r.interest_ids);
                return ci.some(x => ids.includes(Number(x)));
            });
            if (filtered.length === 0) filtered = rows;
        }
        return Promise.all(filtered.map(r => enrichCareer(r)));
    } catch (err) {
        console.error('[fetchCareersWithDetails] error:', err.message);
        return [];
    }
}

async function enrichCareer(row) {
    try {
        const [skillRows] = await pool.execute('SELECT * FROM skills WHERE career_id = ? ORDER BY id', [row.id]);
        const [roadmapRows] = await pool.execute('SELECT * FROM roadmap_steps WHERE career_id = ? ORDER BY step_order', [row.id]);
        return {
            id: row.id,
            name: row.name,
            stream_id: row.stream_id,
            interest_ids: safeJSONParse(row.interest_ids),
            description: row.description,
            salary: row.salary,
            duration: row.duration,
            demand: row.demand,
            icon: row.icon,
            category: row.category,
            top_recruiters: safeJSONParse(row.top_recruiters),
            skills: skillRows.map(s => ({ category: s.category, items: safeJSONParse(s.items) })),
            roadmap: roadmapRows.map(r => ({ year: r.year_label, title: r.title, details: safeJSONParse(r.details) }))
        };
    } catch (err) {
        console.error('[enrichCareer] error:', err.message);
        return { id: row.id, name: row.name, stream_id: row.stream_id, description: '', skills: [], roadmap: [] };
    }
}

async function fetchCollegesForStream(stream_id) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM colleges WHERE JSON_CONTAINS(stream_ids, ?)', [JSON.stringify(parseInt(stream_id))]
        );
        return rows.map(r => ({...r, streams: safeJSONParse(r.stream_ids), source: 'db' }));
    } catch (err) {
        console.error('[fetchCollegesForStream] DB error:', err.message);
        return [];
    }
}

async function fetchExamsForStream(stream_id) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM exams WHERE JSON_CONTAINS(stream_ids, ?)', [JSON.stringify(parseInt(stream_id))]
        );
        return rows.map(r => ({...r, subjects: safeJSONParse(r.subjects) }));
    } catch (err) {
        console.error('[fetchExamsForStream] DB error:', err.message);
        return [];
    }
}

// ============================================================
// SAFE MERGE — DB + API, no duplicates
// ============================================================
function mergeAndDeduplicate(dbColleges, apiColleges) {
    const combined = [...(dbColleges || []), ...(apiColleges || [])];
    const seen = new Map();
    return combined.filter(c => {
        if (!c || !c.name) return false;
        const k = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (k.length < 3 || seen.has(k)) return false;
        seen.set(k, true);
        return true;
    });
}

// ============================================================
// FREE API EXPANSION — Overpass + Nominatim + Hipolabs
// Uses Promise.allSettled — NEVER throws, always returns array
// ============================================================
async function expandCollegesWithFreeAPIs(stream_id) {
    const results = await Promise.allSettled([
        fetchFromOverpass(),
        fetchFromNominatim(stream_id),
        fetchFromHipolabs(stream_id)
    ]);

    const overpassCols = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
    const nomCols = results[1].status === 'fulfilled' ? (results[1].value || []) : [];
    const hipolabsCols = results[2].status === 'fulfilled' ? (results[2].value || []) : [];

    if (results[0].status === 'rejected') {
        console.warn('[expandColleges] Overpass failed:', results[0].reason && results[0].reason.message);
    }

    if (results[1].status === 'rejected') {
        console.warn('[expandColleges] Nominatim failed:', results[1].reason && results[1].reason.message);
    }

    if (results[2].status === 'rejected') {
        console.warn('[expandColleges] Hipolabs failed:', results[2].reason && results[2].reason.message);
    }
    console.log(`[expandColleges] Overpass:${overpassCols.length} Nominatim:${nomCols.length} Hipolabs:${hipolabsCols.length}`);
    return [...overpassCols, ...nomCols, ...hipolabsCols];
}

// Fetch ALL Karnataka colleges from Overpass
async function fetchFromOverpass() {
    const ovQ = `
[out:json][timeout:30];
(
  node["amenity"="university"](11.5,74.0,18.5,78.6);
  node["amenity"="college"](11.5,74.0,18.5,78.6);
  way["amenity"="university"](11.5,74.0,18.5,78.6);
  way["amenity"="college"](11.5,74.0,18.5,78.6);
  relation["amenity"="university"](11.5,74.0,18.5,78.6);
  relation["amenity"="college"](11.5,74.0,18.5,78.6);
);
out tags;`;

    const ovRes = await axios.post('https://overpass-api.de/api/interpreter',
        `data=${encodeURIComponent(ovQ)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 35000 }
    );

    const elements = ((ovRes.data && ovRes.data.elements) || []).filter(e =>
        e.tags && e.tags.name && isRealCollege(e.tags.name)
    );

    const seen = new Set();
    const cols = [];
    for (const e of elements) {
        const key = e.tags.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) continue;
        seen.add(key);
        const t = e.tags;
        const city = t['addr:city'] || t['addr:town'] || t['addr:place'] || '';
        const dist = resolveDistrict(t, city);
        const web = t.website || t['contact:website'] || t['url'] ||
            `https://www.google.com/search?q=${encodeURIComponent(t.name + ' official website Karnataka')}`;
        cols.push({
            id: `osm_${e.type}_${e.id}`,
            name: t.name,
            location: city || dist || 'Karnataka',
            district: dist,
            type: guessType(t.name, t.amenity),
            ranking: 'OSM Verified',
            streams: [1, 2, 3, 4, 5],
            website: web,
            established: null,
            highlight: [city, dist].filter(Boolean).join(', ') || 'Karnataka',
            rating: null,
            source: 'api'
        });
    }
    console.log(`[Overpass] Fetched: ${cols.length} colleges`);
    return cols;
}

// Fetch from Nominatim
async function fetchFromNominatim(stream_id) {
    const termMap = {
        1: 'engineering college Karnataka',
        2: 'medical college Karnataka',
        3: 'commerce college Karnataka',
        4: 'arts college Karnataka',
        5: 'technology college Karnataka'
    };
    const terms = [
        termMap[parseInt(stream_id)] || 'college Karnataka',
        'university Karnataka'
    ];

    const cols = [];
    const seenIds = new Set();

    for (const term of terms) {
        try {
            const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: { q: term, format: 'json', limit: 50, countrycodes: 'in', addressdetails: 1, namedetails: 1, 'accept-language': 'en' },
                headers: { 'User-Agent': 'CareerPathKarnataka/2.0 (education platform)' },
                timeout: 12000
            });
            for (const r of(nomRes.data || [])) {

                if (!r.display_name || !r.display_name.toLowerCase().includes('karnataka')) continue;

                const name = (r.namedetails && r.namedetails.name) || (r.display_name ? r.display_name.split(',')[0] : '');
                const finalName = name.trim();

                if (!finalName || finalName.length < 8 || !isRealCollege(finalName)) continue;

                const uid = `${r.osm_type}_${r.osm_id}`;
                if (seenIds.has(uid)) continue;
                seenIds.add(uid);

                const city =
                    (r.address && r.address.city) ||
                    (r.address && r.address.town) ||
                    (r.address && r.address.village) ||
                    '';

                const dist = normalizeDistrict(
                    (r.address && r.address.state_district) ||
                    (r.address && r.address.county) ||
                    city ||
                    ''
                );

                if (dist === 'Karnataka' && !city) continue;

                const web =
                    (r.extratags && r.extratags.website) ||
                    `https://www.google.com/search?q=${encodeURIComponent(finalName + ' official website')}`;

                cols.push({
                    id: `nom_${r.osm_type}_${r.osm_id}`,
                    name: finalName,
                    location: city || dist || 'Karnataka',
                    district: dist,
                    type: guessType(finalName, ''),
                    ranking: 'Nominatim Verified',
                    streams: [1, 2, 3, 4, 5],
                    website: web,
                    established: null,
                    highlight: [city, dist].filter(Boolean).join(', ') || 'Karnataka',
                    rating: null,
                    source: 'api'
                });
            }

            await new Promise(r => setTimeout(r, 1200));
        } catch (e) {
            console.warn(`[Nominatim] Term "${term}" failed:`, e.message);
        }
    }
    console.log(`[Nominatim] Fetched: ${cols.length} colleges`);
    return cols;
}

// Fetch from Hipolabs
async function fetchFromHipolabs(stream_id) {
    const queryMap = { 1: 'engineering', 2: 'medical', 3: 'commerce', 4: 'arts', 5: 'technology' };
    const queries = [queryMap[parseInt(stream_id)] || 'college', 'Karnataka'];

    const KARNATAKA_IDS = [
        'karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru',
        'mangalore', 'mangaluru', 'hubli', 'dharwad', 'belgaum', 'belagavi',
        'gulbarga', 'kalaburagi', 'davangere', 'shimoga', 'shivamogga',
        'tumkur', 'tumakuru', 'udupi', 'hassan', 'manipal',
        'bidar', 'raichur', 'ballari', 'bellary', 'gadag', 'haveri'
    ];

    const cols = [];
    const seenNames = new Set();

    for (const q of queries) {
        try {
            const res = await axios.get('https://universities.hipolabs.com/search', {
                params: { name: q, country: 'India' },
                headers: { 'User-Agent': 'CareerPathKarnataka/2.0' },
                timeout: 10000
            });
            for (const u of((res.data) || [])) {
                const name = (u.name || '').trim();
                if (!name || name.length < 8 || !isRealCollege(name)) continue;
                const stateRaw = (u['state-province'] || '').toLowerCase();
                const nameLow = name.toLowerCase();
                const isKarnataka = KARNATAKA_IDS.some(id =>
                    stateRaw.includes(id) || nameLow.includes(id)
                );
                if (!isKarnataka) continue;
                const nameKey = nameLow.replace(/[^a-z0-9]/g, '');
                if (seenNames.has(nameKey)) continue;
                seenNames.add(nameKey);
                const dist = normalizeDistrict(stateRaw);
                cols.push({
                    id: `hipo_${nameKey.slice(0,40)}`,
                    name,
                    location: dist || 'Karnataka',
                    district: dist,
                    type: guessType(name, ''),
                    ranking: 'Hipolabs University API',
                    streams: [1, 2, 3, 4, 5],
                    website: (u.web_pages && u.web_pages[0]) ||
                        `https://www.google.com/search?q=${encodeURIComponent(name + ' official website')}`,
                    established: null,
                    highlight: dist || 'Karnataka',
                    rating: null,
                    source: 'api'
                });
            }
        } catch (e) {
            console.warn(`[Hipolabs] Query "${q}" failed:`, e.message);
        }
    }
    console.log(`[Hipolabs] Fetched: ${cols.length} colleges`);
    return cols;
}

// ============================================================
// HELPERS
// ============================================================
function isRealCollege(name) {
    if (!name) return false;
    const n = name.toLowerCase();
    const junk = ['stop', 'bus stand', ' road', ' street', 'layout', 'hotel', 'restaurant', 'shop', 'store', 'nagar', 'colony'];
    if (junk.some(j => n.includes(j))) return false;
    const valid = ['college', 'university', 'institute', 'polytechnic', 'school of', 'faculty', 'academy',
        'iisc', 'iit', 'nit', 'iim', 'medical', 'engineering', 'dental', 'pharmacy', 'nursing', 'law',
        'arts', 'science', 'technology', 'management', 'commerce', 'education'
    ];
    return valid.some(v => n.includes(v));
}

const DISTRICT_MAP = {
    'bangalore': 'Bengaluru Urban',
    'bengaluru': 'Bengaluru Urban',
    'mysore': 'Mysuru',
    'mysuru': 'Mysuru',
    'mangalore': 'Dakshina Kannada',
    'mangaluru': 'Dakshina Kannada',
    'dakshina kannada': 'Dakshina Kannada',
    'hubli': 'Dharwad',
    'hubballi': 'Dharwad',
    'dharwad': 'Dharwad',
    'belgaum': 'Belagavi',
    'belagavi': 'Belagavi',
    'gulbarga': 'Kalaburagi',
    'kalaburagi': 'Kalaburagi',
    'davangere': 'Davanagere',
    'davanagere': 'Davanagere',
    'shimoga': 'Shivamogga',
    'shivamogga': 'Shivamogga',
    'tumkur': 'Tumakuru',
    'tumakuru': 'Tumakuru',
    'udupi': 'Udupi',
    'hassan': 'Hassan',
    'mandya': 'Mandya',
    'bijapur': 'Vijayapura',
    'vijayapura': 'Vijayapura',
    'bidar': 'Bidar',
    'raichur': 'Raichur',
    'koppal': 'Koppal',
    'gadag': 'Gadag',
    'haveri': 'Haveri',
    'karwar': 'Uttara Kannada',
    'uttara kannada': 'Uttara Kannada',
    'chikkamagaluru': 'Chikkamagaluru',
    'chikmagalur': 'Chikkamagaluru',
    'chitradurga': 'Chitradurga',
    'kolar': 'Kolar',
    'chikballapur': 'Chikballapur',
    'ramanagara': 'Ramanagara',
    'chamarajanagar': 'Chamarajanagar',
    'yadgir': 'Yadgir',
    'bagalkot': 'Bagalkot',
    'ballari': 'Ballari',
    'bellary': 'Ballari',
    'kodagu': 'Kodagu',
    'madikeri': 'Kodagu',
    'coorg': 'Kodagu',
    'bangalore rural': 'Bengaluru Rural',
    'bengaluru rural': 'Bengaluru Rural'
};

function resolveDistrict(tags, city) {
    if (tags['addr:district']) return tags['addr:district'];
    if (tags['addr:county']) return tags['addr:county'];
    return normalizeDistrict(city || '');
}

function normalizeDistrict(input) {
    const s = (input || '').toLowerCase().trim();
    for (const [k, v] of Object.entries(DISTRICT_MAP)) {
        if (s === k || s.includes(k)) return v;
    }
    return 'Karnataka';
}

function guessType(name = '', amenity = '') {
    const n = name.toLowerCase();
    if (n.includes('government') || n.includes('govt') || n.includes('iit') ||
        n.includes('iim') || n.includes('iisc') || n.includes('nit ') ||
        n.includes('national institute') || n.includes('central university') ||
        n.includes('state university') || n.includes('uvce') || n.includes('nlsiu'))
        return 'Government';
    if (n.includes('deemed')) return 'Deemed';
    if (n.includes('autonomous')) return 'Autonomous';
    if (amenity === 'university') return 'Deemed';
    return 'Private';
}

module.exports = router;