//fourth
// college.js — Optimized for <3s response time
// Changes: timeout wrappers, in-memory cache (1hr), parallel Nominatim,
//          partial-data returns, non-blocking Nominatim/Hipolabs.
// Logic: ALL filtering, normalizing, sorting, merging UNCHANGED.

const express = require('express');
const axios = require('axios');
const { pool } = require('../db/connection');

const router = express.Router();

// ============================================================
// IN-MEMORY CACHE  (key: `${career}::${district}`)
// ============================================================

const CACHE = new Map(); // key → { data, timestamp, sources }
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(career, district) {
    const key = `${career}::${district}`;
    const entry = CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        CACHE.delete(key);
        return null;
    }
    return entry;
}

function setCache(career, district, colleges, sources) {
    const key = `${career}::${district}`;
    CACHE.set(key, { colleges, sources, timestamp: Date.now() });
}

// ============================================================
// TIMEOUT WRAPPER  — resolves with [] after `ms` milliseconds
// ============================================================

function withTimeout(promise, ms, label) {
    const timeout = new Promise(resolve => {
        setTimeout(() => {
            console.warn(`[${label}] ⏱ Timed out after ${ms}ms — returning partial data`);
            resolve([]);
        }, ms);
    });
    return Promise.race([promise, timeout]);
}

// ============================================================
// CONSTANTS  (UNCHANGED)
// ============================================================

const KARNATAKA_DISTRICTS = [
    'bengaluru', 'bangalore', 'bangalore urban', 'bengaluru urban',
    'mysuru', 'mysore',
    'mangaluru', 'mangalore', 'dakshina kannada',
    'dharwad', 'hubli', 'hubballi',
    'belagavi', 'belgaum',
    'kalaburagi', 'gulbarga',
    'davanagere', 'davangere',
    'shivamogga', 'shimoga',
    'tumakuru', 'tumkur',
    'udupi', 'manipal',
    'hassan',
    'mandya',
    'vijayapura', 'bijapur',
    'bidar',
    'raichur',
    'koppal',
    'gadag',
    'haveri',
    'uttara kannada', 'karwar',
    'chikkamagaluru', 'chikmagalur',
    'chitradurga',
    'kolar',
    'chikballapur',
    'ramanagara',
    'chamarajanagar',
    'yadgir',
    'bagalkot',
    'ballari', 'bellary',
    'kodagu', 'madikeri', 'coorg',
    'bangalore rural', 'bengaluru rural',
    'vijayanagara', 'hosapete', 'hospet'
];

const CAREER_KEYWORDS = {
    engineering: [
        'engineering', 'technology', 'polytechnic', 'technical',
        'institute of tech', 'iit', 'nit', 'iiit', 'uvce',
        'vtu', 'visvesvaraya'
    ],
    medical: [
        'medical', 'mbbs', 'hospital', 'nursing', 'pharmacy',
        'dental', 'ayurveda', 'health science', 'medicine',
        'physiotherapy', 'paramedical'
    ],
    commerce: [
        'commerce', 'bcom', 'bba', 'business', 'management',
        'mba', 'finance', 'chartered', 'accounting'
    ],
    arts: [
        'arts', 'humanities', 'liberal', 'journalism', 'media',
        'social work', 'fine arts', 'language', 'literature'
    ],
    law: ['law', 'llb', 'legal', 'national law', 'nlsiu'],
    design: ['design', 'fashion', 'architecture'],
    cs: [
        'computer', 'information technology', 'software',
        'bca', 'mca', 'it college', 'programming'
    ],
    science: [
        'science', 'bsc', 'mathematics', 'physics',
        'chemistry', 'biology', 'research institute'
    ],
    emerging: [
        'data science', 'artificial intelligence', 'machine learning',
        'robotics', 'cyber', 'digital technology'
    ]
};

const CAREER_STREAM = {
    engineering: 1,
    medical: 2,
    commerce: 3,
    arts: 4,
    law: 4,
    design: 4,
    cs: 5,
    science: 5,
    emerging: 5
};

const DISTRICT_MAP = {
    'bangalore': 'Bengaluru Urban',
    'bengaluru': 'Bengaluru Urban',
    'bangalore urban': 'Bengaluru Urban',
    'bengaluru urban': 'Bengaluru Urban',
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
    'manipal': 'Udupi',
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
    'bengaluru rural': 'Bengaluru Rural',
    'hosapete': 'Vijayanagara',
    'hospet': 'Vijayanagara',
    'vijayanagara': 'Vijayanagara'
};

// ============================================================
// STATIC SEED DATA  (UNCHANGED)
// ============================================================

const STATIC_KARNATAKA_COLLEGES = [
    // ── Engineering ──────────────────────────────────────────────────────────
    { name: 'Indian Institute of Science', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Government' },
    { name: 'RV College of Engineering', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'MS Ramaiah Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'BMS College of Engineering', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Autonomous' },
    { name: 'Bangalore Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Government' },
    { name: 'PES University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Deemed' },
    { name: 'Dayananda Sagar College of Engineering', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'CMR Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'Visvesvaraya Technological University', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'engineering', type: 'Government' },
    { name: 'KLE Technological University', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'engineering', type: 'Deemed' },
    { name: 'BVB College of Engineering and Technology', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'engineering', type: 'Private' },
    { name: 'SDM College of Engineering and Technology', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'engineering', type: 'Private' },
    { name: 'Bapuji Institute of Engineering and Technology', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'SSS Samata College of Engineering', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Karnataka Polytechnic Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Government' },
    { name: 'Vivekananda College of Engineering and Technology Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Don Bosco Institute of Technology Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Sri Venkateshwara College of Engineering Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Government Polytechnic Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Government' },
    { name: 'Government Tool Room and Training Centre Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Government' },
    { name: 'Akshaya Institute of Technology Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Sri Taralabalu Jagadguru Institute of Technology Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Bapuji Educational Association Polytechnic Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'Anjuman Engineering College Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'engineering', type: 'Private' },
    { name: 'RNS Institute of Technology Bengaluru', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'PES College of Engineering Mandya', location: 'Mandya, Karnataka, India', district: 'Mandya', career_type: 'engineering', type: 'Government' },
    { name: 'Manipal Institute of Technology', location: 'Udupi, Karnataka, India', district: 'Udupi', career_type: 'engineering', type: 'Deemed' },
    { name: 'NMAM Institute of Technology', location: 'Udupi, Karnataka, India', district: 'Udupi', career_type: 'engineering', type: 'Private' },
    { name: 'JSS Academy of Technical Education', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'engineering', type: 'Private' },
    { name: 'Siddaganga Institute of Technology', location: 'Tumakuru, Karnataka, India', district: 'Tumakuru', career_type: 'engineering', type: 'Private' },
    { name: 'NITK Surathkal', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'engineering', type: 'Government' },
    { name: 'Sahyadri College of Engineering and Management', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'engineering', type: 'Private' },
    { name: 'Government Engineering College Hassan', location: 'Hassan, Karnataka, India', district: 'Hassan', career_type: 'engineering', type: 'Government' },
    { name: 'Ballari Institute of Technology and Management', location: 'Ballari, Karnataka, India', district: 'Ballari', career_type: 'engineering', type: 'Private' },
    { name: 'PDA College of Engineering Kalaburagi', location: 'Kalaburagi, Karnataka, India', district: 'Kalaburagi', career_type: 'engineering', type: 'Government' },
    { name: 'Government Engineering College Raichur', location: 'Raichur, Karnataka, India', district: 'Raichur', career_type: 'engineering', type: 'Government' },
    { name: 'Basaveshwar Engineering College Bagalkot', location: 'Bagalkot, Karnataka, India', district: 'Bagalkot', career_type: 'engineering', type: 'Government' },
    { name: 'Government Engineering College Haveri', location: 'Haveri, Karnataka, India', district: 'Haveri', career_type: 'engineering', type: 'Government' },
    { name: 'Government Engineering College Gangavathi', location: 'Koppal, Karnataka, India', district: 'Koppal', career_type: 'engineering', type: 'Government' },
    { name: 'BLDEA VP Dr PG Halakatti College of Engineering', location: 'Vijayapura, Karnataka, India', district: 'Vijayapura', career_type: 'engineering', type: 'Private' },
    { name: 'KLS Vishwanathrao Deshpande Institute of Technology', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'engineering', type: 'Private' },
    { name: 'Vidyavardhaka College of Engineering', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'engineering', type: 'Private' },
    { name: 'Sri Jayachamarajendra College of Engineering', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'engineering', type: 'Government' },
    { name: 'Alva Institute of Engineering and Technology', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'engineering', type: 'Private' },
    { name: 'UVCE University Visvesvaraya College of Engineering', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Government' },
    { name: 'New Horizon College of Engineering', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'Nitte Meenakshi Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'Government Engineering College Chamarajanagar', location: 'Chamarajanagar, Karnataka, India', district: 'Chamarajanagar', career_type: 'engineering', type: 'Government' },
    { name: 'Government Engineering College Kushalnagar', location: 'Kodagu, Karnataka, India', district: 'Kodagu', career_type: 'engineering', type: 'Government' },
    { name: 'Shridevi Institute of Engineering and Technology', location: 'Tumakuru, Karnataka, India', district: 'Tumakuru', career_type: 'engineering', type: 'Private' },
    { name: 'Sri Krishna Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'East West Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Private' },
    { name: 'Rajiv Gandhi Institute of Technology', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'engineering', type: 'Government' },
    { name: 'Anjuman Institute of Technology and Management Bhatkal', location: 'Uttara Kannada, Karnataka, India', district: 'Uttara Kannada', career_type: 'engineering', type: 'Private' },
    { name: 'Sree Siddaganga Polytechnic Tumkur', location: 'Tumakuru, Karnataka, India', district: 'Tumakuru', career_type: 'engineering', type: 'Private' },
    // ── Medical ────────────────────────────────────────────────────────────
    { name: 'Bangalore Medical College and Research Institute', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Government' },
    { name: 'MS Ramaiah Medical College', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Private' },
    { name: "St John's Medical College", location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Private' },
    { name: 'Kempegowda Institute of Medical Sciences', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Private' },
    { name: 'Rajiv Gandhi University of Health Sciences', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Government' },
    { name: 'JSS Medical College', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'medical', type: 'Deemed' },
    { name: 'Kasturba Medical College Manipal', location: 'Udupi, Karnataka, India', district: 'Udupi', career_type: 'medical', type: 'Deemed' },
    { name: 'Kasturba Medical College Mangalore', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'medical', type: 'Deemed' },
    { name: 'SDM College of Medical Sciences and Hospital', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'medical', type: 'Deemed' },
    { name: 'Karnataka Institute of Medical Sciences', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'medical', type: 'Government' },
    { name: 'JJM Medical College', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'medical', type: 'Government' },
    { name: 'Bapuji Dental College and Hospital', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'medical', type: 'Private' },
    { name: 'SS Institute of Medical Sciences', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'medical', type: 'Private' },
    { name: 'Shivamogga Institute of Medical Sciences', location: 'Shivamogga, Karnataka, India', district: 'Shivamogga', career_type: 'medical', type: 'Government' },
    { name: 'Raichur Institute of Medical Sciences', location: 'Raichur, Karnataka, India', district: 'Raichur', career_type: 'medical', type: 'Government' },
    { name: 'Gulbarga Institute of Medical Sciences', location: 'Kalaburagi, Karnataka, India', district: 'Kalaburagi', career_type: 'medical', type: 'Government' },
    { name: 'Hassan Institute of Medical Sciences', location: 'Hassan, Karnataka, India', district: 'Hassan', career_type: 'medical', type: 'Government' },
    { name: 'Koppal Institute of Medical Sciences', location: 'Koppal, Karnataka, India', district: 'Koppal', career_type: 'medical', type: 'Government' },
    { name: 'Belgaum Institute of Medical Sciences', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'medical', type: 'Government' },
    { name: 'Vijayanagara Institute of Medical Sciences', location: 'Ballari, Karnataka, India', district: 'Ballari', career_type: 'medical', type: 'Government' },
    { name: 'Chamarajanagar Institute of Medical Sciences', location: 'Chamarajanagar, Karnataka, India', district: 'Chamarajanagar', career_type: 'medical', type: 'Government' },
    { name: 'Mysore Medical College and Research Institute', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'medical', type: 'Government' },
    { name: 'ESIC Medical College and PGIMSR', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Government' },
    { name: 'Vydehi Institute of Medical Sciences', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Private' },
    { name: 'Akash Institute of Medical Sciences', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Private' },
    { name: 'BGS Global Institute of Medical Sciences', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'medical', type: 'Private' },
    { name: 'Adichunchanagiri Institute of Medical Sciences', location: 'Mandya, Karnataka, India', district: 'Mandya', career_type: 'medical', type: 'Private' },
    { name: 'Mandya Institute of Medical Sciences', location: 'Mandya, Karnataka, India', district: 'Mandya', career_type: 'medical', type: 'Government' },
    { name: 'Srinivasa Institute of Medical Sciences Mangalore', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'medical', type: 'Private' },
    { name: 'Father Muller Medical College', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'medical', type: 'Private' },
    { name: 'A J Institute of Medical Sciences', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'medical', type: 'Private' },
    { name: 'Yenepoya Medical College', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'medical', type: 'Deemed' },
    { name: 'KVG Medical College and Hospital', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'medical', type: 'Private' },
    // ── Commerce ──────────────────────────────────────────────────────────
    { name: "St Joseph's College of Commerce", location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'commerce', type: 'Autonomous' },
    { name: 'Christ University (Commerce)', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'commerce', type: 'Deemed' },
    { name: 'Jain University (Commerce)', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'commerce', type: 'Deemed' },
    { name: 'MS Ramaiah College of Arts Science and Commerce', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'commerce', type: 'Autonomous' },
    { name: 'Maharajas College of Commerce Mysuru', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'commerce', type: 'Government' },
    { name: 'SDM College of Business Management Mangaluru', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'commerce', type: 'Private' },
    { name: 'KLS Gogte College of Commerce Belagavi', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'commerce', type: 'Autonomous' },
    { name: 'Government First Grade College Commerce Davanagere', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'commerce', type: 'Government' },
    { name: 'Karnataka University Commerce Department', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'commerce', type: 'Government' },
    { name: 'Seshadripuram College of Commerce', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'commerce', type: 'Autonomous' },
    { name: 'Vidyavardhaka First Grade College', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'commerce', type: 'Private' },
    // ── Arts ──────────────────────────────────────────────────────────────
    { name: 'Christ University (Arts)', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'arts', type: 'Deemed' },
    { name: 'Mount Carmel College', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'arts', type: 'Autonomous' },
    { name: "St Joseph's College of Arts and Science", location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'arts', type: 'Autonomous' },
    { name: 'Maharajas College Mysuru (Arts)', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'arts', type: 'Government' },
    { name: 'Karnataka University (Arts)', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'arts', type: 'Government' },
    { name: 'Kuvempu University (Arts)', location: 'Shivamogga, Karnataka, India', district: 'Shivamogga', career_type: 'arts', type: 'Government' },
    { name: 'Government First Grade College Davanagere (Arts)', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'arts', type: 'Government' },
    { name: 'Yuvaraja College Mysuru', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'arts', type: 'Government' },
    { name: 'Gokhale Institute of Public Affairs', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'arts', type: 'Private' },
    // ── Science ───────────────────────────────────────────────────────────
    { name: "St Joseph's College of Science", location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'science', type: 'Autonomous' },
    { name: 'Government Science College Bengaluru', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'science', type: 'Government' },
    { name: 'Vijaya College Bengaluru', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'science', type: 'Private' },
    { name: 'Mangalore University (Science)', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'science', type: 'Government' },
    { name: 'Poornaprajna College Udupi', location: 'Udupi, Karnataka, India', district: 'Udupi', career_type: 'science', type: 'Private' },
    { name: 'Mysore University (Science)', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'science', type: 'Government' },
    { name: 'Maharanis Science College for Women Mysuru', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'science', type: 'Government' },
    { name: 'Government Science College Dharwad', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'science', type: 'Government' },
    // ── Law ───────────────────────────────────────────────────────────────
    { name: 'National Law School of India University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'law', type: 'Government' },
    { name: 'Karnataka State Law University', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'law', type: 'Government' },
    { name: 'JSS Law College Mysuru', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'law', type: 'Private' },
    { name: 'Bangalore Institute of Legal Studies', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'law', type: 'Private' },
    { name: 'KLE Society Law College', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'law', type: 'Private' },
    // ── CS ────────────────────────────────────────────────────────────────
    { name: 'International Institute of Information Technology Bengaluru', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'cs', type: 'Government' },
    { name: 'Dayananda Sagar University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'cs', type: 'Deemed' },
    // ── Universities ─────────────────────────────────────────────────────
    { name: 'Bangalore University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Government' },
    { name: 'Mysore University', location: 'Mysuru, Karnataka, India', district: 'Mysuru', career_type: 'all', type: 'Government' },
    { name: 'Karnataka University Dharwad', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'all', type: 'Government' },
    { name: 'Kuvempu University', location: 'Shivamogga, Karnataka, India', district: 'Shivamogga', career_type: 'all', type: 'Government' },
    { name: 'Davanagere University', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'all', type: 'Government' },
    { name: 'Tumkur University', location: 'Tumakuru, Karnataka, India', district: 'Tumakuru', career_type: 'all', type: 'Government' },
    { name: 'Gulbarga University', location: 'Kalaburagi, Karnataka, India', district: 'Kalaburagi', career_type: 'all', type: 'Government' },
    { name: 'Mangalore University', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'all', type: 'Government' },
    { name: 'Rani Channamma University Belagavi', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'all', type: 'Government' },
    { name: 'Vijayanagara Sri Krishnadevaraya University', location: 'Ballari, Karnataka, India', district: 'Ballari', career_type: 'all', type: 'Government' },
    { name: 'Davangere University', location: 'Davanagere, Karnataka, India', district: 'Davanagere', career_type: 'all', type: 'Government' },
    { name: 'Manipal Academy of Higher Education', location: 'Udupi, Karnataka, India', district: 'Udupi', career_type: 'all', type: 'Deemed' },
    { name: 'Christ University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Deemed' },
    { name: 'Jain University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Deemed' },
    { name: 'Reva University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Deemed' },
    { name: 'Alliance University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Deemed' },
    { name: 'Presidency University Bengaluru', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Private' },
    { name: 'CMR University', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Private' },
    { name: 'Yenepoya University', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'all', type: 'Deemed' },
    { name: 'Nitte University', location: 'Dakshina Kannada, Karnataka, India', district: 'Dakshina Kannada', career_type: 'all', type: 'Deemed' },
    { name: 'SDM University Dharwad', location: 'Dharwad, Karnataka, India', district: 'Dharwad', career_type: 'all', type: 'Deemed' },
    { name: 'KLE Academy of Higher Education and Research', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'all', type: 'Deemed' },
    { name: 'Rajiv Gandhi University of Health Sciences', location: 'Bengaluru, Karnataka, India', district: 'Bengaluru Urban', career_type: 'all', type: 'Government' },
    { name: 'Visvesvaraya Technological University Belagavi', location: 'Belagavi, Karnataka, India', district: 'Belagavi', career_type: 'all', type: 'Government' },
];

// ============================================================
// HELPERS  (UNCHANGED)
// ============================================================

function safeJSONParse(value) {
    try {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.trim().startsWith('[')) return JSON.parse(value);
        if (typeof value === 'string') return value.split(',').map(v => v.trim());
        return [];
    } catch (e) {
        return [];
    }
}

function normalizeForSearch(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDistrict(input) {
    const s = (input || '').toLowerCase().trim();
    for (const [k, v] of Object.entries(DISTRICT_MAP)) {
        if (s === k || s.includes(k)) return v;
    }
    return '';
}

function resolveDistrict(tags, city) {
    if (tags['addr:district']) return normalizeDistrict(tags['addr:district']) || tags['addr:district'];
    if (tags['addr:county']) return normalizeDistrict(tags['addr:county']) || tags['addr:county'];
    return normalizeDistrict(city || '') || city || '';
}

function guessType(name = '', amenity = '') {
    const n = name.toLowerCase();
    if (
        n.includes('government') || n.includes('govt') ||
        n.includes('iit') || n.includes('iim') || n.includes('iisc') ||
        n.includes('nit ') || n.includes('national institute') ||
        n.includes('central university') || n.includes('state university') ||
        n.includes('uvce') || n.includes('nlsiu')
    ) return 'Government';
    if (n.includes('deemed')) return 'Deemed';
    if (n.includes('autonomous')) return 'Autonomous';
    if (amenity === 'university') return 'Deemed';
    return 'Private';
}

function isRealCollege(name) {
    if (!name || name.length < 5) return false;
    const n = name.toLowerCase();
    const junk = ['bus stop', 'bus stand', ' road', ' street', 'layout', 'hotel', 'restaurant', 'shop', 'store'];
    if (junk.some(j => n.includes(j))) return false;
    const valid = [
        'college', 'university', 'institute', 'institution', 'polytechnic',
        'school of', 'faculty', 'academy', 'iisc', 'iit', 'nit', 'iim',
        'medical', 'engineering', 'dental', 'pharmacy', 'nursing', 'law',
        'arts', 'science', 'technology', 'management', 'commerce', 'education'
    ];
    return valid.some(v => n.includes(v));
}

// ============================================================
// KARNATAKA GUARD  (UNCHANGED)
// ============================================================

function isKarnataka(college) {
    const loc = (college.location || '').toLowerCase();
    const dist = (college.district || '').toLowerCase();
    const name = (college.name || '').toLowerCase();
    return (
        loc.includes('karnataka') ||
        dist.includes('karnataka') ||
        KARNATAKA_DISTRICTS.some(d => loc.includes(d) || dist.includes(d) || name.includes(d))
    );
}

// ============================================================
// NORMALIZE  (UNCHANGED)
// ============================================================

function normalizeDB(r) {
    return {
        id: r.id,
        name: r.name,
        location: r.location,
        district: r.district,
        type: r.type,
        ranking: r.ranking,
        streams: safeJSONParse(r.stream_ids),
        website: r.website,
        established: r.established,
        highlight: r.highlight,
        rating: r.rating,
        career_type: r.career_type || null,
        tags: [(r.name || '').toLowerCase(), (r.location || '').toLowerCase(), (r.district || '').toLowerCase()].filter(Boolean),
        source: 'db'
    };
}

function normalizeOverpass(e) {
    const t = e.tags;
    const city = t['addr:city'] || t['addr:town'] || t['addr:place'] || '';
    const dist = resolveDistrict(t, city);
    const web = t.website || t['contact:website'] || t['url'] ||
        `https://www.google.com/search?q=${encodeURIComponent(t.name + ' official website Karnataka')}`;
    return {
        id: `osm_${e.type}_${e.id}`,
        name: t.name,
        location: [city, 'Karnataka', 'India'].filter(Boolean).join(', '),
        district: dist,
        type: guessType(t.name, t.amenity),
        ranking: t['nirf:rank'] ? `NIRF Rank: ${t['nirf:rank']}` : 'OSM Verified',
        streams: [1, 2, 3, 4, 5],
        website: web,
        established: t['start_date'] ? parseInt(t['start_date']) : null,
        highlight: [city, dist].filter(Boolean).join(', ') || 'Karnataka',
        rating: null,
        career_type: null,
        tags: [t.name.toLowerCase(), city.toLowerCase(), dist.toLowerCase()].filter(Boolean),
        source: 'overpass'
    };
}

function normalizeNominatim(r, rawName) {
    const addr = r.address || {};
    const city = addr.city || addr.town || addr.village || '';
    const dist = normalizeDistrict(addr.state_district || addr.county || city || '');
    const web = (r.extratags && r.extratags.website) ||
        `https://www.google.com/search?q=${encodeURIComponent(rawName + ' official website')}`;
    return {
        id: `nom_${r.osm_type}_${r.osm_id}`,
        name: rawName,
        location: [city, 'Karnataka', 'India'].filter(Boolean).join(', '),
        district: dist,
        type: guessType(rawName, r.type || ''),
        ranking: 'OSM / Nominatim Verified',
        streams: [1, 2, 3, 4, 5],
        website: web,
        established: null,
        highlight: [city, dist].filter(Boolean).join(', ') || 'Karnataka',
        rating: null,
        career_type: null,
        tags: [rawName.toLowerCase(), city.toLowerCase(), dist.toLowerCase()].filter(Boolean),
        source: 'nominatim'
    };
}

function normalizeHipolabs(u) {
    const name = (u.name || '').trim();
    const district = normalizeDistrict(u['state-province'] || '') || 'Karnataka';
    return {
        id: `hipo_${normalizeForSearch(name).slice(0, 40)}`,
        name: name,
        location: `${district}, Karnataka, India`,
        district: district,
        type: guessType(name, ''),
        ranking: 'Hipolabs University API',
        streams: [1, 2, 3, 4, 5],
        website: (u.web_pages && u.web_pages[0]) ||
            `https://www.google.com/search?q=${encodeURIComponent(name + ' official website')}`,
        established: null,
        highlight: district,
        rating: null,
        career_type: null,
        tags: [name.toLowerCase(), district.toLowerCase()].filter(Boolean),
        source: 'hipolabs'
    };
}

function normalizeStatic(s) {
    return {
        id: `static_${normalizeForSearch(s.name).slice(0, 40)}`,
        name: s.name,
        location: s.location,
        district: s.district,
        type: s.type || 'Private',
        ranking: null,
        streams: [1, 2, 3, 4, 5],
        website: `https://www.google.com/search?q=${encodeURIComponent(s.name + ' Karnataka official website')}`,
        established: null,
        highlight: s.district,
        rating: null,
        career_type: s.career_type || null,
        tags: [s.name.toLowerCase(), s.district.toLowerCase(), (s.career_type || '')].filter(Boolean),
        source: 'static'
    };
}

// ============================================================
// SOURCE: MySQL DB  (UNCHANGED logic, timeout added)
// ============================================================

async function fetchFromDB(streamId) {
    try {
        let query = 'SELECT * FROM colleges WHERE 1=1';
        const params = [];
        if (streamId && parseInt(streamId) > 0) {
            query += ' AND JSON_CONTAINS(stream_ids, ?)';
            params.push(JSON.stringify(parseInt(streamId)));
        }
        query += ' ORDER BY FIELD(type,"Government","Autonomous","Deemed","Private"), established ASC';
        const [rows] = await pool.execute(query, params);
        const result = rows.map(normalizeDB);
        console.log(`[DB] Fetched: ${result.length}`);
        return result;
    } catch (err) {
        console.error('[DB] Error:', err.message);
        return [];
    }
}

// ============================================================
// SOURCE: Overpass API  (UNCHANGED logic, timeout added)
// ============================================================

async function fetchFromOverpass(district) {
    const districtName = (district && district !== 'all') ? district.trim() : '';
    const bboxFilter = '(11.5,74.0,18.5,78.6)';

    const buildQuery = (areaBlock, inFilter) => `
[out:json][timeout:90];
${areaBlock}
(
  node["amenity"="university"]${inFilter};
  node["amenity"="college"]${inFilter};
  node["amenity"="school"]["name"~"college|institute|polytechnic|engineering|medical|technology",i]${inFilter};
  way["amenity"="university"]${inFilter};
  way["amenity"="college"]${inFilter};
  way["amenity"="school"]["name"~"college|institute|polytechnic|engineering|medical|technology",i]${inFilter};
  relation["amenity"="university"]${inFilter};
  relation["amenity"="college"]${inFilter};
  node["building"="university"]${inFilter};
  node["building"="college"]${inFilter};
  way["building"="university"]${inFilter};
  way["building"="college"]${inFilter};
);
out tags 1000;`.trim();

    const queries = [buildQuery('', bboxFilter)];
    if (districtName) {
        const areaBlock = `area["name"~"${districtName}","i"]["boundary"="administrative"]["admin_level"~"5|6|7"]->.d;`;
        queries.push(buildQuery(areaBlock, '(area.d)'));
    }

    const seen = new Set();
    const result = [];

    for (const query of queries) {
        for (let attempt = 0; attempt <= 1; attempt++) {
            try {
                const res = await axios.post(
                    'https://overpass-api.de/api/interpreter',
                    `data=${encodeURIComponent(query)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 90000 }
                );
                const elements = (res.data.elements || []).filter(e => e.tags && e.tags.name);
                for (const e of elements) {
                    const nameLow = (e.tags.name || '').toLowerCase();
                    const amenity = (e.tags.amenity || '');
                    const isUniAmenity = amenity === 'university' || amenity === 'college';
                    if (!isRealCollege(nameLow) && !isUniAmenity) continue;
                    const key = normalizeForSearch(e.tags.name);
                    if (key.length < 3 || seen.has(key)) continue;
                    seen.add(key);
                    result.push(normalizeOverpass(e));
                }
                break;
            } catch (err) {
                console.warn(`[Overpass] Attempt ${attempt + 1} failed: ${err.message}`);
                if (attempt === 1) break;
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }

    console.log(`[Overpass] Fetched: ${result.length}`);
    return result;
}

// ============================================================
// SOURCE: Nominatim  ← KEY CHANGE: fully parallel fetches
// (no sequential loop + sleep, all terms fire at once)
// ============================================================

async function fetchFromNominatim(career, district, search) {
    const distSuffix = (district && district !== 'all') ? `${district} Karnataka` : 'Karnataka';

    const careerTermMap = {
        engineering: ['engineering college', 'polytechnic', 'technical institute', 'technology college'],
        medical: ['medical college', 'nursing college', 'dental college', 'pharmacy college', 'health sciences college'],
        commerce: ['commerce college', 'business management college', 'BBA college'],
        arts: ['arts college', 'humanities college', 'fine arts college'],
        law: ['law college', 'legal studies college'],
        design: ['design institute', 'architecture college'],
        cs: ['computer science college', 'information technology college', 'BCA college'],
        science: ['science college', 'research institute'],
        emerging: ['data science institute', 'artificial intelligence institute', 'technology college'],
    };

    const terms = new Set();
    if (search && search.trim().length > 2) terms.add(`${search.trim()} ${distSuffix}`);
    if (career && career !== 'all' && careerTermMap[career]) {
        for (const t of careerTermMap[career]) terms.add(`${t} ${distSuffix}`);
    }
    if (district && district !== 'all') {
        terms.add(`college ${district} Karnataka`);
        terms.add(`university ${district} Karnataka`);
        terms.add(`institute ${district} Karnataka`);
        terms.add(`top colleges ${district}`);
        terms.add(`best engineering colleges ${district}`);
        terms.add(`polytechnic ${district}`);
        terms.add(`degree college ${district}`);
    }
    const baseTerms = [
        'university Karnataka',
        'engineering college Karnataka',
        'medical college Karnataka',
        'polytechnic Karnataka',
        'degree college Karnataka',
    ];
    for (const t of baseTerms) terms.add(t);

    // ── OPTIMIZED: fire all requests in parallel, cap at 8 terms ──────────
    const termList = [...terms].slice(0, 8);

    const fetchOneTerm = async(term) => {
        try {
            const res = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: term,
                    format: 'json',
                    limit: 50, // reduced from 100 — faster payload
                    countrycodes: 'in',
                    addressdetails: 1,
                    namedetails: 1,
                    'accept-language': 'en'
                },
                headers: { 'User-Agent': 'CareerPathKarnataka/2.0 (education guidance)' },
                timeout: 6000 // per-request hard timeout
            });
            return res.data || [];
        } catch (e) {
            console.warn(`[Nominatim] "${term}" failed:`, e.message);
            return [];
        }
        // NOTE: sequential sleep(800) removed — parallel requests don't need it
    };

    // Fire all in parallel — if the whole batch takes >7s, withTimeout cuts it
    const allResponses = await Promise.all(termList.map(fetchOneTerm));

    const allResults = [];
    const seenIds = new Set();

    for (const data of allResponses) {
        for (const r of data) {
            if (!r.display_name || !r.display_name.toLowerCase().includes('karnataka')) continue;
            let rawName = (r.namedetails && r.namedetails.name) ?
                r.namedetails.name :
                (r.display_name || '').split(',')[0];
            rawName = rawName.trim();
            if (!rawName || rawName.length < 6) continue;
            const amenityType = (r.type || r.class || '');
            const isUniAmenity = ['university', 'college'].includes(amenityType);
            if (!isRealCollege(rawName) && !isUniAmenity) continue;
            const uid = `${r.osm_type}_${r.osm_id}`;
            if (seenIds.has(uid)) continue;
            seenIds.add(uid);
            allResults.push(normalizeNominatim(r, rawName));
        }
    }

    console.log(`[Nominatim] Fetched: ${allResults.length}`);
    return allResults;
}

// ============================================================
// SOURCE: Hipolabs  ← KEY CHANGE: fully parallel fetches
// ============================================================

async function fetchFromHipolabs(career, search) {
    const KARNATAKA_SIGNALS = [
        'karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru',
        'mangalore', 'mangaluru', 'hubli', 'dharwad', 'belgaum', 'belagavi',
        'gulbarga', 'kalaburagi', 'davangere', 'davanagere', 'shimoga', 'shivamogga',
        'tumkur', 'tumakuru', 'udupi', 'hassan', 'manipal',
        'bidar', 'raichur', 'ballari', 'bellary', 'gadag', 'haveri',
        'bijapur', 'vijayapura', 'chitradurga', 'bagalkot', 'koppal', 'yadgir',
        'chikkamagaluru', 'chikmagalur', 'mandya', 'chamarajanagar', 'kolar',
        'chikballapur', 'ramanagara', 'kodagu', 'coorg', 'madikeri',
        'hospet', 'hosapete', 'vijayanagara', 'karwar', 'sirsi'
    ];

    const queryMap = {
        engineering: ['engineering', 'technology', 'polytechnic'],
        medical: ['medical', 'health', 'pharmacy', 'dental', 'nursing'],
        commerce: ['commerce', 'business', 'management', 'finance'],
        arts: ['arts', 'humanities', 'language'],
        law: ['law', 'legal'],
        design: ['design', 'architecture', 'fashion'],
        cs: ['technology', 'computer', 'information'],
        science: ['science', 'research'],
        emerging: ['technology', 'innovation'],
    };

    const queries = new Set(['Karnataka', 'Bangalore', 'Bengaluru', 'Mysore', 'Manipal']);
    if (search && search.trim().length > 2) queries.add(search.trim());
    if (career && career !== 'all' && queryMap[career]) {
        for (const q of queryMap[career]) queries.add(q);
    }

    // ── OPTIMIZED: fire all requests in parallel ───────────────────────────
    const fetchOneQuery = async(q) => {
        try {
            const res = await axios.get('https://universities.hipolabs.com/search', {
                params: { name: q, country: 'India' },
                headers: { 'User-Agent': 'CareerPathKarnataka/2.0' },
                timeout: 5000 // per-request hard timeout
            });
            return res.data || [];
        } catch (e) {
            console.warn(`[Hipolabs] Query "${q}" failed:`, e.message);
            return [];
        }
    };

    const allResponses = await Promise.all([...queries].map(fetchOneQuery));

    const allResults = [];
    const seenNames = new Set();

    for (const data of allResponses) {
        for (const u of data) {
            const name = (u.name || '').trim();
            if (!name || name.length < 6) continue;
            const stateRaw = (u['state-province'] || '').toLowerCase();
            const nameLow = name.toLowerCase();
            const webPages = (u.web_pages || []).join(' ').toLowerCase();
            const isKarnatakaSrc =
                stateRaw === 'karnataka' ||
                KARNATAKA_SIGNALS.some(sig => stateRaw.includes(sig) || nameLow.includes(sig)) ||
                webPages.includes('.kar.nic.in') ||
                webPages.includes('karnataka');
            if (!isKarnatakaSrc) continue;
            const key = nameLow.replace(/[^a-z0-9]/g, '');
            if (seenNames.has(key)) continue;
            seenNames.add(key);
            allResults.push(normalizeHipolabs(u));
        }
    }

    console.log(`[Hipolabs] Fetched: ${allResults.length}`);
    return allResults;
}

// ============================================================
// FILTER FUNCTIONS  (UNCHANGED)
// ============================================================

function applyCareerFilter(colleges, career) {
    if (!career || career === 'all') return colleges;
    const keywords = CAREER_KEYWORDS[career.toLowerCase()] || [];
    if (keywords.length === 0) return colleges;
    const filtered = colleges.filter(c => {
        const name = (c.name || '').toLowerCase();
        const careerType = (c.career_type || '').toLowerCase();
        if (careerType === 'all') return true;
        if (careerType === career.toLowerCase()) return true;
        return keywords.some(k => name.includes(k));
    });
    return filtered.length > 0 ? filtered : colleges;
}

function applyDistrictFilter(colleges, district) {
    if (!district || district === 'all') return colleges;
    const d = district.toLowerCase();
    const canonical = normalizeDistrict(d).toLowerCase();
    const checkTerms = new Set([d]);
    if (canonical) checkTerms.add(canonical.toLowerCase());
    for (const [k, v] of Object.entries(DISTRICT_MAP)) {
        if (v.toLowerCase() === canonical) checkTerms.add(k);
    }
    const terms = [...checkTerms];
    const filtered = colleges.filter(c => {
        const loc = (c.location || '').toLowerCase();
        const dist = (c.district || '').toLowerCase();
        return terms.some(t => loc.includes(t) || dist.includes(t));
    });
    return filtered.length > 0 ? filtered : colleges;
}

function applySearchFilter(colleges, search) {
    if (!search || !search.trim()) return colleges;
    const q = search.toLowerCase().trim();
    return colleges.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q) ||
        (c.district || '').toLowerCase().includes(q)
    );
}

// ============================================================
// DEDUPLICATION  (UNCHANGED)
// ============================================================

function deduplicate(colleges) {
    const seen = new Map();
    const result = [];
    for (const c of colleges) {
        if (!c || !c.name) continue;
        const key = normalizeForSearch(c.name);
        if (key.length < 3) continue;
        if (!seen.has(key)) {
            seen.set(key, true);
            result.push(c);
        }
    }
    return result;
}

// ============================================================
// SORT  (UNCHANGED)
// ============================================================

function sortByPriority(colleges) {
    const typeOrder = { 'Government': 0, 'Autonomous': 1, 'Deemed': 2, 'Private': 3 };
    const boostWords = ['iit', 'nit', 'iisc', 'iim', 'iiit', 'nlsiu', 'university', 'institute', 'engineering', 'medical'];
    return colleges.sort((a, b) => {
        const tA = typeOrder[a.type] !== undefined ? typeOrder[a.type] : 4;
        const tB = typeOrder[b.type] !== undefined ? typeOrder[b.type] : 4;
        if (tA !== tB) return tA - tB;
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const boostA = boostWords.some(w => nameA.includes(w)) ? 0 : 1;
        const boostB = boostWords.some(w => nameB.includes(w)) ? 0 : 1;
        if (boostA !== boostB) return boostA - boostB;
        return nameA.localeCompare(nameB);
    });
}

// ============================================================
// PIPELINE HELPER — merge → filter → dedup → sort  (UNCHANGED)
// ============================================================

function runPipeline(dbData, staticData, overpassData, nominatimData, hipolabsData, career, district, search) {
    let colleges = [...dbData, ...staticData, ...overpassData, ...nominatimData, ...hipolabsData];
    colleges = colleges.filter(isKarnataka);
    colleges = applyCareerFilter(colleges, career);
    colleges = applyDistrictFilter(colleges, district);
    colleges = applySearchFilter(colleges, search);
    colleges = deduplicate(colleges);
    colleges = sortByPriority(colleges);
    return colleges;
}

// ============================================================
// MAIN ROUTE  GET /api/colleges
// ============================================================

router.get('/', async(req, res) => {
    const {
        career = 'all',
            stream_id,
            search = '',
            district = 'all'
    } = req.query;

    const resolvedStreamId = (career && career !== 'all') ?
        (CAREER_STREAM[career] || null) :
        (stream_id ? parseInt(stream_id) : null);

    console.log(`\n[Colleges] ▶ career=${career} stream=${resolvedStreamId} district="${district}" search="${search}"`);

    // ── 1. CACHE HIT — return immediately ──────────────────────────────────
    const cached = getCached(career, district);
    if (cached) {
        console.log(`[Colleges] ✅ Cache hit — returning immediately`);
        // Still apply search filter (search is not cached since it changes often)
        let colleges = applySearchFilter(cached.colleges, search);
        return res.json({
            success: true,
            colleges,
            total: colleges.length,
            filters: { career, district, search },
            sources: cached.sources,
            cached: true,
            lastUpdated: new Date(cached.timestamp).toISOString()
        });
    }

    const staticData = STATIC_KARNATAKA_COLLEGES.map(normalizeStatic);

    try {
        // ── 2. FAST SOURCES: DB + Static run without timeout (local/fast) ───
        //    SLOW SOURCES: Overpass, Nominatim, Hipolabs get hard timeouts
        //    All four race in parallel — slow ones return [] if they exceed limit

        const [dbR, ovR, nomR, hipoR] = await Promise.allSettled([
            withTimeout(fetchFromDB(resolvedStreamId), 2500, 'DB'),
            withTimeout(fetchFromOverpass(district), 8000, 'Overpass'),
            withTimeout(fetchFromNominatim(career, district, search), 7000, 'Nominatim'),
            withTimeout(fetchFromHipolabs(career, search), 6000, 'Hipolabs')
        ]);

        const dbData = dbR.status === 'fulfilled' ? dbR.value : [];
        const overpassData = ovR.status === 'fulfilled' ? ovR.value : [];
        const nominatimData = nomR.status === 'fulfilled' ? nomR.value : [];
        const hipolabsData = hipoR.status === 'fulfilled' ? hipoR.value : [];

        console.log(`[Colleges] Raw → DB:${dbData.length} Overpass:${overpassData.length} Nominatim:${nominatimData.length} Hipolabs:${hipolabsData.length} Static:${staticData.length}`);

        const sources = {
            db: dbData.length,
            overpass: overpassData.length,
            nominatim: nominatimData.length,
            hipolabs: hipolabsData.length,
            static: staticData.length
        };

        const colleges = runPipeline(dbData, staticData, overpassData, nominatimData, hipolabsData, career, district, search);

        // ── 3. CACHE the merged result (before search filter) ───────────────
        const collegesForCache = runPipeline(dbData, staticData, overpassData, nominatimData, hipolabsData, career, district, '');
        setCache(career, district, collegesForCache, sources);

        console.log(`[Colleges] ✅ Returning ${colleges.length} colleges\n`);

        return res.json({
            success: true,
            colleges,
            total: colleges.length,
            filters: { career, district, search },
            sources,
            cached: false,
            lastUpdated: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Colleges] Route error:', err);

        // ── FALLBACK: return static + DB-only data so user gets something ───
        console.warn('[Colleges] ⚠ Falling back to static data only');
        const fallback = runPipeline([], staticData, [], [], [], career, district, search);
        return res.json({
            success: true,
            colleges: fallback,
            total: fallback.length,
            filters: { career, district, search },
            sources: { db: 0, overpass: 0, nominatim: 0, hipolabs: 0, static: staticData.length },
            cached: false,
            partial: true,
            lastUpdated: new Date().toISOString()
        });
    }
});

// ============================================================
// GET /api/colleges/districts  (UNCHANGED)
// ============================================================

router.get('/districts', (req, res) => {
    const canonical = [...new Set(Object.values(DISTRICT_MAP))].sort();
    return res.json({ success: true, data: canonical });
});

// ============================================================
// GET /api/colleges/careers  (UNCHANGED)
// ============================================================

router.get('/careers', (req, res) => {
    const data = Object.keys(CAREER_KEYWORDS).map(k => ({
        value: k,
        label: k.charAt(0).toUpperCase() + k.slice(1)
    }));
    return res.json({ success: true, data });
});

// ============================================================
// GET /api/colleges/cache/clear  — admin utility
// ============================================================

router.get('/cache/clear', (req, res) => {
    const size = CACHE.size;
    CACHE.clear();
    console.log(`[Cache] Cleared ${size} entries`);
    return res.json({ success: true, cleared: size });
});

module.exports = router;