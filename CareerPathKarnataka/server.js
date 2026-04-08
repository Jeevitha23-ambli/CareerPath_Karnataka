// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- API Routes ----
const collegesRouter = require('./routes/colleges');
const examsRouter = require('./routes/exams');
const recommendRouter = require('./routes/recommend');

app.use('/api/colleges', collegesRouter);
app.use('/api/exams-live', examsRouter);
app.use('/api', recommendRouter);

// ---- Health Check ----
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CareerPath Karnataka',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// ---- Serve Frontend (SPA fallback) ----
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Start Server ----
async function start() {
    await testConnection();
    app.listen(PORT, () => {
        console.log(`\n🚀 CareerPath Karnataka Server running on http://localhost:${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   API ready at: http://localhost:${PORT}/api`);
        console.log('\n   Available endpoints:');
        console.log('   GET  /api/streams');
        console.log('   GET  /api/interests?stream_id=1');
        console.log('   GET  /api/careers?stream_id=1');
        console.log('   GET  /api/careers/:id');
        console.log('   POST /api/recommend  { stream_id, interest_ids }');
        console.log('   GET  /api/colleges?stream_id=1&district=X');
        console.log('   GET  /api/exams-live?stream_id=1&type=National\n');
    });
}

start();