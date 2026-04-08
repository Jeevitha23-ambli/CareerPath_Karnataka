// public/js/app.js — CareerPath Karnataka

(function() {
        'use strict';

        const state = {
            currentPage: 'home',
            wizard: { step: 1, streamId: null, interestIds: [] },
            streams: [],
            interests: [],
            results: null,
            selectedCareer: null,
            previousPage: 'home',
            collegesReqSeq: 0
        };

        // ============================================================
        // NAVIGATE
        // ============================================================
        function navigate(page) {
            if (page !== 'career-detail') state.previousPage = state.currentPage;
            state.currentPage = page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const el = document.getElementById('page-' + page);
            if (el) el.classList.add('active');
            document.querySelectorAll('.nav-link').forEach(l => {
                l.classList.toggle('active', l.dataset.page === page);
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (page === 'colleges') loadCollegesPage();
            if (page === 'exams') loadExamsPage();
            if (page === 'guidance') initWizard();
        }

        async function api(method, path, body = null) {
            const opts = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch('/api' + path, opts);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }

        // ============================================================
        // WIZARD
        // ============================================================
        async function initWizard() {
            if (state.streams.length === 0) {
                try {
                    const data = await api('GET', '/streams');
                    state.streams = data.streams || [];
                } catch (e) { console.error('Failed streams:', e); }
            }
            state.wizard = { step: 1, streamId: null, interestIds: [] };
            renderWizardStep(1);
        }

        function renderWizardStep(step) {
            document.querySelectorAll('.p-step').forEach((el, i) => {
                el.classList.remove('active', 'done');
                if (i + 1 < step) {
                    el.classList.add('done');
                    el.textContent = '✓';
                } else if (i + 1 === step) {
                    el.classList.add('active');
                    el.textContent = i + 1;
                } else el.textContent = i + 1;
            });
            document.querySelectorAll('.p-connector').forEach((el, i) => {
                el.classList.toggle('done', i + 1 < step);
            });
            document.querySelectorAll('.progress-labels span').forEach((el, i) => {
                el.classList.toggle('active', i + 1 === step);
            });
            document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
            const stepEl = document.getElementById('wizard-step-' + step);
            if (stepEl) stepEl.classList.add('active');
            if (step === 1) renderStreams();
            if (step === 2) renderInterests();
            if (step === 3) runRecommend();
        }

        function renderStreams() {
            const grid = document.getElementById('streams-grid');
            if (!grid) return;
            grid.innerHTML = state.streams.map(s => `
            <div class="stream-card ${state.wizard.streamId === s.id ? 'selected' : ''}"
                 onclick="selectStream(${s.id})" data-id="${s.id}">
                <span class="stream-icon">${s.icon}</span>
                <h3>${s.name}</h3>
                <p>${s.description}</p>
            </div>`).join('');
        }

        window.selectStream = function(id) {
            state.wizard.streamId = id;
            state.wizard.interestIds = [];
            document.querySelectorAll('.stream-card').forEach(c => {
                c.classList.toggle('selected', parseInt(c.dataset.id) === id);
            });
            document.getElementById('btn-step1-next').disabled = false;
        };

        async function renderInterests() {
            const grid = document.getElementById('interests-grid');
            if (!grid) return;
            grid.innerHTML = '<div class="loading-container"><div class="spinner"></div><p class="loading-text">Loading interests...</p></div>';
            try {
                const data = await api('GET', `/interests?stream_id=${state.wizard.streamId}`);
                state.interests = data.interests || [];
                grid.innerHTML = state.interests.map(i => `
                <div class="interest-chip ${state.wizard.interestIds.includes(i.id) ? 'selected' : ''}"
                     onclick="toggleInterest(${i.id})" data-id="${i.id}">
                    <span class="chip-icon">${i.icon}</span>
                    <span>${i.name}</span>
                </div>`).join('');
            } catch (e) {
                grid.innerHTML = '<p style="color:var(--danger)">Failed to load interests.</p>';
            }
        }

        window.toggleInterest = function(id) {
            const idx = state.wizard.interestIds.indexOf(id);
            if (idx === -1) state.wizard.interestIds.push(id);
            else state.wizard.interestIds.splice(idx, 1);
            document.querySelectorAll('.interest-chip').forEach(c => {
                c.classList.toggle('selected', state.wizard.interestIds.includes(parseInt(c.dataset.id)));
            });
        };

        async function runRecommend() {
            const container = document.getElementById('results-container');
            if (!container) return;
            container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p class="loading-text">Generating your personalized recommendations...</p>
                <p class="loading-text" style="font-size:12px;color:var(--gray-400);margin-top:4px">Fetching live colleges from Karnataka via free APIs...</p>
            </div>`;
            try {
                const data = await api('POST', '/recommend', {
                    stream_id: state.wizard.streamId,
                    interest_ids: state.wizard.interestIds
                });
                if (!data.success && !data.careers) {
                    throw new Error(data.error || 'Recommendation failed');
                }
                state.results = data;
                renderResults(data, container);
            } catch (e) {
                container.innerHTML = `<div class="error-card">⚠️ Failed to generate recommendations.<br>
                <button onclick="runRecommend()" class="btn-next" style="margin-top:12px;">Retry</button></div>`;
            }
        }

        function renderResults(data, container) {
            const { careers = [], colleges = [], exams = [] } = data;
            container.innerHTML = `
            <div class="results-header">
                <div class="results-badge">⚡ ${careers.length} Career${careers.length !== 1 ? 's' : ''} Found</div>
                <h2>Your Career Recommendations</h2>
                <p>Based on your career path and interests, here are the best options for you</p>
            </div>
            <div id="careers-list">
                ${careers.length === 0
                    ? `<div class="empty-state"><div class="empty-icon">🔍</div><p>No careers found. Try selecting different interests.</p></div>`
                    : careers.map(c => careerCardHTML(c)).join('')}
            </div>
            ${colleges.length > 0 ? `
            <div style="margin-top:40px">
                <h3 class="section-h3"><span class="icon">🏛️</span> Recommended Colleges (${colleges.length})</h3>
                <div class="colleges-grid">${colleges.slice(0,12).map(c => collegeCardHTML(c)).join('')}</div>
            </div>` : ''}
            ${exams.length > 0 ? `
            <div style="margin-top:32px">
                <h3 class="section-h3"><span class="icon">📋</span> Entrance Exams to Prepare For</h3>
                <div class="exams-grid">${exams.slice(0,9).map(e => examCardSmallHTML(e)).join('')}</div>
            </div>` : ''}
            <div style="text-align:center;margin-top:40px">
                <button onclick="resetWizard()" class="btn-back" style="margin:0 auto;">↩ Start Over</button>
            </div>`;
    }

    window.resetWizard = function () {
        state.wizard = { step: 1, streamId: null, interestIds: [] };
        renderWizardStep(1);
    };

    // ============================================================
    // CAREER DETAIL
    // ============================================================
    window.openCareerDetail = async function (id) {
        state.previousPage = state.currentPage;
        navigate('career-detail');
        const container = document.getElementById('career-detail-content');
        if (!container) return;
        container.innerHTML = `<div class="loading-container"><div class="spinner"></div><p class="loading-text">Loading career details...</p></div>`;
        try {
            const data = await api('GET', `/careers/${id}`);
            const { career, colleges = [], exams = [] } = data;
            state.selectedCareer = career;
            container.innerHTML = `
                <button class="btn-back-arrow" onclick="navigate('${state.previousPage}')">← Back</button>
                <div class="detail-hero-card">
                    <div class="detail-icon-box">${career.icon}</div>
                    <div class="detail-info">
                        <div class="career-name-row">
                            <h1 class="detail-title">${career.name}</h1>
                            <span class="demand-badge demand-${career.demand}">${career.demand} Demand</span>
                        </div>
                        <p class="detail-desc">${career.description}</p>
                        <div class="detail-meta-grid">
                            <div class="detail-meta-item">
                                <span class="detail-meta-label">💰 Salary Range</span>
                                <span class="detail-meta-value" style="color:var(--success)">${career.salary}</span>
                            </div>
                            <div class="detail-meta-item">
                                <span class="detail-meta-label">📅 Duration</span>
                                <span class="detail-meta-value">${career.duration}</span>
                            </div>
                            <div class="detail-meta-item">
                                <span class="detail-meta-label">📂 Category</span>
                                <span class="detail-meta-value" style="text-transform:capitalize">${career.category || 'General'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${career.roadmap && career.roadmap.length > 0 ? `
                <div class="detail-card">
                    <h3>🗺️ Career Roadmap</h3>
                    <div class="roadmap-list">
                        ${career.roadmap.map((step, i) => `
                        <div class="roadmap-step">
                            <div class="roadmap-step-num">${i + 1}</div>
                            <div class="roadmap-step-content">
                                <div class="roadmap-step-year">${step.year}</div>
                                <div class="roadmap-step-title">${step.title}</div>
                                <ul class="roadmap-step-details">
                                    ${(step.details || []).map(d => `<li>${d}</li>`).join('')}
                                </ul>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>` : ''}
                ${career.skills && career.skills.length > 0 ? `
                <div class="detail-card">
                    <h3>🎯 Skills Required</h3>
                    <div class="skills-categories">
                        ${career.skills.map(s => `
                        <div class="skill-category">
                            <div class="skill-category-name">${s.category}</div>
                            <div class="skill-category-tags">
                                ${(s.items || []).map(item => `<div class="skill-category-tag">${item}</div>`).join('')}
                            </div>
                        </div>`).join('')}
                    </div>
                </div>` : ''}
                ${career.top_recruiters && career.top_recruiters.length > 0 ? `
                <div class="detail-card">
                    <h3>🏢 Top Recruiters</h3>
                    <div class="recruiters-list">
                        ${career.top_recruiters.map(r => `<span class="recruiter-badge">${r}</span>`).join('')}
                    </div>
                </div>` : ''}
                ${colleges.length > 0 ? `
                <div class="detail-card">
                    <h3>🏛️ Top Colleges (${colleges.length})</h3>
                    <div class="colleges-grid">${colleges.map(c => collegeCardHTML(c)).join('')}</div>
                </div>` : ''}
                ${exams.length > 0 ? `
                <div class="detail-card">
                    <h3>📋 Relevant Entrance Exams</h3>
                    <div class="exams-grid">${exams.map(e => examCardSmallHTML(e)).join('')}</div>
                </div>` : ''}`;
        } catch (e) {
            container.innerHTML = `<div class="error-card">⚠️ Failed to load career details.
                <button onclick="navigate('${state.previousPage}')" class="btn-back">Go Back</button></div>`;
        }
    };

    // ============================================================
    // COLLEGES PAGE
    // career + district + search filters
    // ============================================================
    async function loadCollegesPage() {
        const reqId = ++state.collegesReqSeq;
        const container = document.getElementById('colleges-content');
        const stats = document.getElementById('colleges-stats');
        if (!container) return;

        container.innerHTML = `<div class="loading-container"><div class="spinner"></div>
            <p class="loading-text">Loading colleges via Overpass + Nominatim APIs...</p></div>`;

        const career = document.getElementById('filter-career')?.value || '';
        const district = document.getElementById('filter-district')?.value || '';
        const search = document.getElementById('filter-search')?.value || '';

        const params = new URLSearchParams();
        if (career) params.append('career', career);
        if (district) params.append('district', district);
        if (search) params.append('search', search);

        try {
            const res  = await fetch(`/api/colleges?${params}`);
            const data = await res.json();
            if (reqId !== state.collegesReqSeq) return; // ignore stale responses
            const colleges = data.colleges || [];
            const apiCount = (data.sources?.overpass || 0) + (data.sources?.nominatim || 0) + (data.sources?.hipolabs || 0);

            if (stats) {
                stats.innerHTML = `
                    <span class="data-stat-item">Total: <strong>${data.total}</strong> colleges</span>
                    <span class="data-stat-item"><span class="source-badge source-db">DB</span> <strong>${data.sources?.db || 0}</strong> curated</span>
                    <span class="data-stat-item"><span class="source-badge source-api">API</span> <strong>${apiCount}</strong> from Overpass + Nominatim + Hipolabs</span>
                    <span class="data-stat-item" style="color:var(--gray-400)">Updated: ${new Date(data.lastUpdated).toLocaleTimeString()}</span>`;
            }

            if (colleges.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏛️</div><p>No colleges found for the selected career path.</p></div>`;
                return;
            }
            container.innerHTML = `<div class="colleges-grid" style="padding:32px 0">
                ${colleges.map(c => collegeCardHTML(c, true)).join('')}</div>`;
        } catch (e) {
            if (reqId !== state.collegesReqSeq) return; // ignore stale errors
            container.innerHTML = `<div class="error-card">⚠️ Failed to load colleges. Please check your connection.</div>`;
        }
    }

    // ============================================================
    // EXAMS PAGE
    // ============================================================
    async function loadExamsPage() {
        const container = document.getElementById('exams-content');
        if (!container) return;
        container.innerHTML = `<div class="loading-container"><div class="spinner"></div><p class="loading-text">Fetching live exam data...</p></div>`;

        const stream_id = document.getElementById('exams-filter-stream')?.value || '';
        const type      = document.getElementById('exams-filter-type')?.value || '';
        const search    = document.getElementById('exams-filter-search')?.value || '';

        const params = new URLSearchParams();
        if (stream_id) params.append('stream_id', stream_id);
        if (type)      params.append('type', type);
        if (search)    params.append('search', search);

        try {
            const res  = await fetch(`/api/exams-live?${params}`);
            const data = await res.json();
            const exams = data.exams || [];
            if (exams.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No exams found.</p></div>`;
                return;
            }
            container.innerHTML = `<div class="exams-full-grid">${exams.map(e => examCardFullHTML(e)).join('')}</div>`;
        } catch (e) {
            container.innerHTML = `<div class="error-card">⚠️ Failed to load exams.</div>`;
        }
    }

    // ============================================================
    // EXPLORE CAREERS — show ALL careers
    // ============================================================
    async function loadExploreCareers() {
        const grid = document.getElementById('explore-careers-grid');
        if (!grid) return;
        grid.innerHTML = `<div class="loading-container"><div class="spinner"></div><p class="loading-text">Loading careers...</p></div>`;
        try {
            const data = await api('GET', '/careers');
            const careers = data.careers || [];
            grid.innerHTML = careers.map(c => `
                <div class="career-card" onclick="openCareerDetail(${c.id})" style="cursor:pointer">
                    <div class="career-card-top">
                        <div class="career-icon-box">${c.icon}</div>
                        <div class="career-info">
                            <div class="career-name-row">
                                <span class="career-name">${c.name}</span>
                                <span class="demand-badge demand-${c.demand}">${c.demand} Demand</span>
                            </div>
                            <p class="career-desc">${c.description}</p>
                            <div class="career-meta">
                                <span class="career-meta-item salary">💰 ${(c.salary||'').split('|')[0]?.trim()}</span>
                                <span class="career-meta-item duration">📅 ${c.duration}</span>
                            </div>
                        </div>
                        <button class="career-action" onclick="event.stopPropagation();openCareerDetail(${c.id})">
                            View Details →
                        </button>
                    </div>
                    ${(c.skills||[]).flatMap(s=>s.items||[]).slice(0,6).length > 0 ? `
                    <div class="career-skills-preview">
                        <div class="skills-label">Key Skills</div>
                        <div class="skill-tags">
                            ${(c.skills||[]).flatMap(s=>s.items||[]).slice(0,6).map(s=>`<span class="skill-tag">${s}</span>`).join('')}
                        </div>
                    </div>` : ''}
                </div>`).join('');
        } catch (e) {
            grid.innerHTML = `<div class="error-card">Failed to load careers.</div>`;
        }
    }

    // ============================================================
    // HTML TEMPLATES
    // ============================================================
    function careerCardHTML(c) {
        const allSkills = (c.skills || []).flatMap(s => s.items || []).slice(0, 6);
        return `
            <div class="career-card" onclick="openCareerDetail(${c.id})">
                <div class="career-card-top">
                    <div class="career-icon-box">${c.icon}</div>
                    <div class="career-info">
                        <div class="career-name-row">
                            <span class="career-name">${c.name}</span>
                            <span class="demand-badge demand-${c.demand}">${c.demand} Demand</span>
                        </div>
                        <p class="career-desc">${c.description}</p>
                        <div class="career-meta">
                            <span class="career-meta-item salary">💰 ${(c.salary||'').split('|')[0]?.trim()}</span>
                            <span class="career-meta-item duration">📅 ${c.duration}</span>
                        </div>
                    </div>
                    <button class="career-action" onclick="event.stopPropagation();openCareerDetail(${c.id})">
                        View Details →
                    </button>
                </div>
                ${allSkills.length > 0 ? `
                <div class="career-skills-preview">
                    <div class="skills-label">Key Skills</div>
                    <div class="skill-tags">${allSkills.map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div>
                </div>` : ''}
            </div>`;
    }

    function collegeCardHTML(c, showHighlight = false) {
        const link = c.website && !c.website.includes('openstreetmap.org')
            ? c.website
            : `https://www.google.com/search?q=${encodeURIComponent((c.name||'') + ' official website Karnataka')}`;
        const sourceLabel = c.source === 'db' ? '' : `<div class="college-source">📡 OSM Live Data</div>`;
        return `
            <a class="college-card" href="${link}" target="_blank" rel="noopener noreferrer">
                <div class="college-card-header">
                    <div class="college-name">${c.name}</div>
                    <span class="college-type-badge type-${c.type||'Private'}">${c.type||'Private'}</span>
                </div>
                <div class="college-location">📍 ${c.location||''}${c.district ? ', '+c.district : ''}</div>
                <div class="college-ranking">${c.ranking||''}</div>
                ${showHighlight && c.highlight ? `<div class="college-location" style="margin-top:4px;color:var(--gray-500)">${c.highlight}</div>` : ''}
                ${c.rating ? `<div class="college-location" style="color:var(--warning)">⭐ ${c.rating}/5</div>` : ''}
                ${sourceLabel}
            </a>`;
    }

    function examCardSmallHTML(e) {
        return `
            <a class="exam-card" href="${e.website||'#'}" target="_blank" rel="noopener noreferrer">
                <div class="exam-card-header">
                    <span class="exam-name">${e.exam_name||e.name}</span>
                    <span class="exam-type-badge type-${e.exam_type}">${e.exam_type}</span>
                </div>
                <div class="exam-full-name">${e.full_name}</div>
                <div class="exam-date">📅 ${e.next_exam_date||e.exam_date}</div>
                <div class="exam-subjects">📝 ${(e.subjects||[]).slice(0,3).join(', ')}</div>
            </a>`;
    }

    function examCardFullHTML(e) {
        return `
            <div class="exam-card-full">
                <div class="exam-header">
                    <div class="exam-name">${e.exam_name||e.name}</div>
                    <div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end">
                        <span class="exam-type-badge type-${e.exam_type}">${e.exam_type}</span>
                        <span class="difficulty-badge diff-${e.difficulty}">${e.difficulty}</span>
                    </div>
                </div>
                <div class="exam-full-name-text">${e.full_name}</div>
                <div class="exam-detail-row"><span class="exam-detail-icon">📅</span> <span>${e.next_exam_date||e.exam_date}</span></div>
                <div class="exam-detail-row"><span class="exam-detail-icon">📝</span> <span>${e.eligibility}</span></div>
                ${e.subjects && e.subjects.length > 0 ? `
                <div class="exam-subjects-wrap">
                    ${e.subjects.map(s=>`<span class="exam-subject-tag">${s}</span>`).join('')}
                </div>` : ''}
                <div class="exam-action-row">
                    <a class="btn-exam-apply" href="${e.website||'#'}" target="_blank" rel="noopener noreferrer">
                        Apply / Official Site →
                    </a>
                </div>
            </div>`;
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        document.querySelectorAll('[data-page]').forEach(el => {
            el.addEventListener('click', () => navigate(el.dataset.page));
        });
        document.querySelectorAll('.nav-logo, .logo-link').forEach(el => {
            el.addEventListener('click', () => navigate('home'));
        });

        document.getElementById('btn-step1-next')?.addEventListener('click', () => {
            if (!state.wizard.streamId) return;
            state.wizard.step = 2; renderWizardStep(2);
        });
        document.getElementById('btn-step2-back')?.addEventListener('click', () => {
            state.wizard.step = 1; renderWizardStep(1);
        });
        document.getElementById('btn-step2-next')?.addEventListener('click', () => {
            state.wizard.step = 3; renderWizardStep(3);
        });
        document.getElementById('btn-step3-back')?.addEventListener('click', () => {
            state.wizard.step = 2; renderWizardStep(2);
        });

        document.getElementById('btn-apply-filters')?.addEventListener('click', loadCollegesPage);
        document.getElementById('filter-career')?.addEventListener('change', loadCollegesPage);
        document.getElementById('filter-district')?.addEventListener('change', loadCollegesPage);
        document.getElementById('filter-search')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') loadCollegesPage();
        });
        document.getElementById('btn-apply-exam-filters')?.addEventListener('click', loadExamsPage);
        document.getElementById('exams-filter-search')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') loadExamsPage();
        });

        loadExploreCareers();
        navigate('home');
    }

    window.navigate = navigate;
    document.addEventListener('DOMContentLoaded', init);
})();