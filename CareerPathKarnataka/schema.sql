-- ============================================================
-- CareerPath Karnataka - MySQL Schema + Seed Data
-- ============================================================
-- Usage: mysql -u root -p < schema.sql
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS careerpath_karnatakafreshh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE railway;

-- ===================== STREAMS =====================
DROP TABLE IF EXISTS career_interests;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS roadmap_steps;
DROP TABLE IF EXISTS careers;
DROP TABLE IF EXISTS exams_streams;
DROP TABLE IF EXISTS colleges;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS interests;
DROP TABLE IF EXISTS streams;

CREATE TABLE streams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(20),
  color VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== INTERESTS =====================
CREATE TABLE interests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(20),
  stream_ids JSON NOT NULL COMMENT 'Array of stream IDs this interest belongs to'
);

-- ===================== CAREERS =====================
CREATE TABLE careers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  stream_id INT NOT NULL,
  interest_ids JSON NOT NULL,
  description TEXT,
  salary VARCHAR(200),
  duration VARCHAR(100),
  demand ENUM('High','Medium','Low') DEFAULT 'Medium',
  icon VARCHAR(20),
  top_recruiters JSON,
  category VARCHAR(50) COMMENT 'engineering, medical, commerce, arts, emerging',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stream_id) REFERENCES streams(id)
);

-- ===================== ROADMAP STEPS =====================
CREATE TABLE roadmap_steps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  career_id INT NOT NULL,
  year_label VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  details JSON NOT NULL,
  step_order INT DEFAULT 0,
  FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE
);

-- ===================== SKILLS =====================
CREATE TABLE skills (
  id INT PRIMARY KEY AUTO_INCREMENT,
  career_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  items JSON NOT NULL,
  FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE
);

-- ===================== COLLEGES (Curated DB set) =====================
CREATE TABLE colleges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(100),
  district VARCHAR(100),
  type ENUM('Government','Private','Deemed','Autonomous') DEFAULT 'Private',
  ranking VARCHAR(200),
  stream_ids JSON NOT NULL,
  website VARCHAR(300),
  established INT,
  highlight TEXT,
  source VARCHAR(20) DEFAULT 'db',
  rating DECIMAL(3,1) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== EXAMS =====================
CREATE TABLE exams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  full_name VARCHAR(300),
  exam_date VARCHAR(200),
  eligibility TEXT,
  subjects JSON,
  exam_type ENUM('National','State','University','Professional') DEFAULT 'National',
  stream_ids JSON NOT NULL,
  website VARCHAR(300),
  difficulty ENUM('High','Medium','Moderate') DEFAULT 'Medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SEED DATA
-- =============================================

-- ---- STREAMS ----
INSERT INTO streams (name, description, icon, color) VALUES
('Science (PCM)', 'Physics, Chemistry, Mathematics - Engineering & Technology paths', '⚛️', 'from-blue-500 to-cyan-500'),
('Science (PCB)', 'Physics, Chemistry, Biology - Medical & Life Sciences paths', '🧬', 'from-green-500 to-emerald-500'),
('Commerce', 'Business, Finance, Accounting & Management paths', '📊', 'from-amber-500 to-orange-500'),
('Arts / Humanities', 'Liberal Arts, Social Sciences, Languages & Creative paths', '🎨', 'from-purple-500 to-pink-500'),
('Emerging Technologies', 'AI, Data Science, Cybersecurity & Cutting-edge Tech paths', '🚀', 'from-indigo-500 to-violet-500');

-- ---- INTERESTS ----
INSERT INTO interests (name, icon, stream_ids) VALUES
('Programming & Coding', '💻', '[1, 5]'),
('Mathematics & Logic', '🔢', '[1, 3, 5]'),
('Electronics & Hardware', '🔌', '[1]'),
('Building & Construction', '🏗️', '[1]'),
('Biology & Life Sciences', '🧪', '[2]'),
('Medicine & Healthcare', '🏥', '[2]'),
('Pharmacy & Drug Research', '💊', '[2]'),
('Environmental Science', '🌿', '[2]'),
('Finance & Banking', '🏦', '[3]'),
('Accounting & Taxation', '📋', '[3]'),
('Business & Entrepreneurship', '💼', '[3]'),
('Marketing & Sales', '📈', '[3]'),
('Writing & Literature', '✍️', '[4]'),
('Psychology & Counseling', '🧠', '[4]'),
('History & Political Science', '📜', '[4]'),
('Design & Visual Arts', '🎭', '[4]'),
('Law & Governance', '⚖️', '[3, 4]'),
('Artificial Intelligence', '🤖', '[5]'),
('Data Science & Analytics', '📊', '[5]'),
('Cybersecurity', '🔒', '[5]'),
('Robotics & Automation', '🦾', '[1, 5]'),
('Cloud Computing', '☁️', '[1, 5]');

-- ---- CAREERS ----
-- Engineering/PCM
INSERT INTO careers (name, stream_id, interest_ids, description, salary, duration, demand, icon, top_recruiters, category) VALUES
('Software Engineer', 1, '[1, 2]', 'Design, develop, and maintain software applications and systems. One of the most in-demand careers in Karnataka\'s IT hub.', '₹6-25 LPA (Entry) | ₹25-80+ LPA (Senior)', '4 years (B.Tech/B.E.)', 'High', '💻', '["Infosys","Wipro","TCS","Google","Microsoft","Amazon"]', 'engineering'),
('Electronics Engineer', 1, '[3, 2]', 'Design and develop electronic circuits, devices, and systems for communication, computing, and automation.', '₹4-15 LPA (Entry) | ₹15-40+ LPA (Senior)', '4 years (B.Tech/B.E.)', 'Medium', '🔌', '["Texas Instruments","Intel","Samsung","Bosch","Qualcomm","ISRO"]', 'engineering'),
('Civil Engineer', 1, '[4, 2]', 'Plan, design, and oversee construction of infrastructure like roads, bridges, buildings, and water systems.', '₹3-10 LPA (Entry) | ₹10-35+ LPA (Senior)', '4 years (B.Tech/B.E.)', 'Medium', '🏗️', '["L&T Construction","NHAI","PWD Karnataka","Shapoorji Pallonji"]', 'engineering'),
('Mechanical Engineer', 1, '[2, 3]', 'Design, analyze, and manufacture mechanical systems and machinery across automotive, aerospace, and energy sectors.', '₹3-12 LPA (Entry) | ₹12-40+ LPA (Senior)', '4 years (B.Tech/B.E.)', 'Medium', '⚙️', '["BHEL","HAL","Toyota","Mahindra","Bosch","ISRO"]', 'engineering');

-- Medical/PCB
INSERT INTO careers (name, stream_id, interest_ids, description, salary, duration, demand, icon, top_recruiters, category) VALUES
('MBBS Doctor', 2, '[5, 6]', 'Diagnose and treat illnesses, providing comprehensive medical care across all specializations.', '₹6-15 LPA (Junior) | ₹15-50+ LPA (Specialist)', '5.5 years (MBBS)', 'High', '🩺', '["AIIMS","Manipal Hospitals","Apollo Hospitals","Fortis","Government Hospitals"]', 'medical'),
('Pharmacist', 2, '[7, 5]', 'Dispense medications, counsel patients on drug usage, and ensure safe medication management.', '₹3-8 LPA (Entry) | ₹8-20+ LPA (Senior)', '4 years (B.Pharm)', 'High', '💊', '["Sun Pharma","Cipla","Dr Reddy\'s","Biocon","Apollo Pharmacy"]', 'medical'),
('Biotechnologist', 2, '[5, 8]', 'Apply biological and technological principles to develop new products, medicines, and environmental solutions.', '₹3-10 LPA (Entry) | ₹10-30+ LPA (Senior)', '3-4 years (B.Sc/B.Tech Biotech)', 'Medium', '🔬', '["Biocon","Strand Life Sciences","Syngene","NCBS","IISc"]', 'medical');

-- Commerce
INSERT INTO careers (name, stream_id, interest_ids, description, salary, duration, demand, icon, top_recruiters, category) VALUES
('Chartered Accountant', 3, '[9, 10]', 'Manage financial auditing, taxation, and advisory services for organizations and individuals.', '₹7-20 LPA (Entry CA) | ₹20-80+ LPA (Partner)', '4.5 years (CA Foundation to Final)', 'High', '📊', '["Deloitte","KPMG","PwC","EY","Big4 Firms","Corporate Finance Depts"]', 'commerce'),
('Investment Banker', 3, '[9, 11]', 'Facilitate mergers, acquisitions, and capital raising activities for corporations and governments.', '₹10-25 LPA (Entry) | ₹25-1Cr+ (Senior)', '3-5 years (MBA/CFA)', 'High', '💰', '["Goldman Sachs","JP Morgan","Kotak","HDFC Bank","Axis Capital"]', 'commerce'),
('Marketing Manager', 3, '[12, 11]', 'Develop and execute marketing strategies to promote brands, products, and services.', '₹4-12 LPA (Entry) | ₹12-40+ LPA (Senior)', '3-4 years (BBA/MBA)', 'Medium', '📈', '["HUL","Procter & Gamble","Asian Paints","Amazon","Flipkart"]', 'commerce');

-- Arts/Humanities
INSERT INTO careers (name, stream_id, interest_ids, description, salary, duration, demand, icon, top_recruiters, category) VALUES
('Lawyer / Advocate', 4, '[17, 15]', 'Provide legal representation and advice, working in courts, law firms, or as corporate counsel.', '₹3-10 LPA (Junior) | ₹10-50+ LPA (Senior Partner)', '5 years (BA LLB)', 'High', '⚖️', '["AZB & Partners","Cyril Amarchand","Trilegal","High Courts","Supreme Court"]', 'arts'),
('Psychologist', 4, '[14, 13]', 'Assess, diagnose, and treat mental health disorders through therapy and counseling.', '₹3-8 LPA (Entry) | ₹8-25+ LPA (Senior)', '5-6 years (MA + M.Phil)', 'High', '🧠', '["NIMHANS","Apollo","Fortis","Private Practice","NGOs","Schools"]', 'arts'),
('Journalist / Media', 4, '[13, 15]', 'Report, write, and broadcast news and stories across print, digital, and broadcast media.', '₹3-8 LPA (Entry) | ₹8-25+ LPA (Senior)', '3 years (BA Journalism/Mass Comm)', 'Medium', '📰', '["Times of India","NDTV","The Hindu","Deccan Herald","ANI"]', 'arts');

-- Emerging Tech
INSERT INTO careers (name, stream_id, interest_ids, description, salary, duration, demand, icon, top_recruiters, category) VALUES
('AI/ML Engineer', 5, '[18, 1]', 'Build intelligent systems using machine learning algorithms, neural networks, and large language models.', '₹8-25 LPA (Entry) | ₹25-1Cr+ (Senior)', '4 years (B.Tech CS/AI) + specialization', 'High', '🤖', '["Google DeepMind","OpenAI","Microsoft","Flipkart AI","Samsung R&D"]', 'emerging'),
('Data Scientist', 5, '[19, 2]', 'Extract insights from complex datasets using statistical analysis, ML models, and data visualization.', '₹6-20 LPA (Entry) | ₹20-80+ LPA (Senior)', '4 years (B.Tech/B.Sc Data Science)', 'High', '📊', '["Amazon","Walmart Labs","Razorpay","PhonePe","Swiggy","Ola"]', 'emerging'),
('Cybersecurity Analyst', 5, '[20, 1]', 'Protect organizations from cyber threats by monitoring systems, identifying vulnerabilities, and implementing security measures.', '₹5-15 LPA (Entry) | ₹15-50+ LPA (Senior)', '4 years (B.Tech/B.Sc CS + certifications)', 'High', '🔒', '["Wipro CyberDefense","IBM Security","CERT-In","Infosys","DRDO"]', 'emerging'),
('Cloud Architect', 5, '[22, 1]', 'Design and manage scalable cloud infrastructure and solutions for enterprises across AWS, Azure, and GCP.', '₹8-20 LPA (Entry) | ₹20-70+ LPA (Senior)', '4 years (B.Tech) + Cloud certifications', 'High', '☁️', '["AWS India","Microsoft Azure","Google Cloud","Accenture","IBM"]', 'emerging');

-- ---- ROADMAP STEPS ----
-- Software Engineer (career_id=1)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(1, 'Year 1', 'Foundation', '["Mathematics (Calculus, Linear Algebra)","Programming basics (C, Python)","Computer fundamentals","Communication skills"]', 1),
(1, 'Year 2', 'Core Subjects', '["Data Structures & Algorithms","Object-Oriented Programming","Database Management Systems","Operating Systems"]', 2),
(1, 'Year 3', 'Specialization & Internship', '["Web Development / Mobile Dev / ML","Software Engineering practices","Summer internship (3-6 months)","Open source contributions"]', 3),
(1, 'Year 4', 'Projects & Placement', '["Major project / Capstone","Competitive programming","Campus placements","Industry certifications"]', 4);

-- Electronics Engineer (career_id=2)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(2, 'Year 1', 'Foundation', '["Mathematics & Physics","Basic Electronics","Circuit Analysis","Programming (C/C++)"]', 1),
(2, 'Year 2', 'Core Electronics', '["Analog & Digital Electronics","Signals & Systems","Microprocessors","Electromagnetic Theory"]', 2),
(2, 'Year 3', 'Specialization', '["VLSI Design / Embedded Systems","Communication Systems","Industrial internship","Lab projects"]', 3),
(2, 'Year 4', 'Advanced & Placement', '["IoT & Sensor Technology","Major project","Campus placements","GATE preparation (optional)"]', 4);

-- Civil Engineer (career_id=3)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(3, 'Year 1', 'Foundation', '["Engineering Mathematics","Engineering Drawing","Fluid Mechanics basics","Surveying fundamentals"]', 1),
(3, 'Year 2', 'Core Civil', '["Structural Analysis","Concrete Technology","Soil Mechanics","Hydraulics"]', 2),
(3, 'Year 3', 'Applied Engineering', '["Transportation Engineering","Environmental Engineering","Industrial internship","Site visits"]', 3),
(3, 'Year 4', 'Projects & Placement', '["Major infrastructure project","GATE exam preparation","Campus placements","Government job exams"]', 4);

-- Mechanical Engineer (career_id=4)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(4, 'Year 1', 'Engineering Basics', '["Engineering Mathematics","Engineering Drawing","Thermodynamics basics","Material Science"]', 1),
(4, 'Year 2', 'Core Mechanical', '["Fluid Mechanics","Manufacturing Processes","Machine Design","Heat Transfer"]', 2),
(4, 'Year 3', 'Specialization', '["CAD/CAM","Industrial Automation","Internship in manufacturing","Product design projects"]', 3),
(4, 'Year 4', 'Projects & Placement', '["Final year project","GATE preparation","Campus placements","Automotive/aerospace industry apply"]', 4);

-- MBBS Doctor (career_id=5) - 5.5 years
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(5, 'Year 1-1.5', 'Pre-Clinical', '["Anatomy (Human body structure)","Physiology (Body functions)","Biochemistry","NEET preparation follow-up study"]', 1),
(5, 'Year 1.5-3', 'Para-Clinical', '["Pathology","Pharmacology","Microbiology","Forensic Medicine & Community Medicine"]', 2),
(5, 'Year 3-5', 'Clinical Rotations', '["General Medicine","General Surgery","Obstetrics & Gynecology","Pediatrics & Ophthalmology","ENT & Psychiatry"]', 3),
(5, 'Year 5-5.5', 'Internship', '["Compulsory rotating internship across departments","NEET PG preparation","Specialization decision","Hospital clinical practice"]', 4);

-- Pharmacist (career_id=6)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(6, 'Year 1', 'Pharmaceutical Basics', '["Anatomy & Physiology","Pharmaceutical Chemistry","Pharmaceutics basics","Human body systems"]', 1),
(6, 'Year 2', 'Core Pharmacy', '["Pharmacology","Pharmacognosy","Pharmaceutical Analysis","Microbiology for pharmacy"]', 2),
(6, 'Year 3', 'Applied Pharmacy', '["Clinical Pharmacy","Pharmacovigilance","Drug Regulatory Affairs","Hospital training"]', 3),
(6, 'Year 4', 'Specialization & Practice', '["Industrial Pharmacy","Drug Store Management","Hospital pharmacy internship","GPAT preparation for M.Pharm"]', 4);

-- Biotechnologist (career_id=7)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(7, 'Year 1', 'Science Foundation', '["Cell Biology","Biochemistry","Genetics basics","Mathematics & Statistics"]', 1),
(7, 'Year 2', 'Core Biotechnology', '["Molecular Biology","Microbiology","Immunology","Bioinformatics intro"]', 2),
(7, 'Year 3', 'Applied Biotech', '["Genetic Engineering","Fermentation Technology","Bioprocess Engineering","Lab project"]', 3),
(7, 'Year 4', 'Research & Industry', '["Drug development basics","Bioinformatics tools","Research thesis","Biotech industry internship"]', 4);

-- Chartered Accountant (career_id=8)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(8, 'Foundation', 'CA Foundation (4-6 months)', '["Principles of Accounting","Business Laws","Business Mathematics","Economics for Finance"]', 1),
(8, 'Intermediate', 'CA Intermediate (2-3 years)', '["Corporate Laws","Advanced Accounting","Auditing","Cost & Management Accounting","Income Tax","GST"]', 2),
(8, 'Articleship', '3-Year Practical Training', '["Work under a practicing CA","Auditing real company accounts","Tax filing and compliance","Financial advisory experience"]', 3),
(8, 'Final', 'CA Final & Qualification', '["Strategic Financial Management","Direct & Indirect Tax Laws","Advanced Auditing","Corporate & Economic Laws","Pass CA Final exam"]', 4);

-- Investment Banker (career_id=9)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(9, 'Year 1-3', 'Undergraduate Foundation', '["B.Com / BBA / Economics","Financial Mathematics","Accounting principles","Excel & financial modeling basics"]', 1),
(9, 'Year 3-5', 'Professional Qualification', '["MBA (Finance) / CFA Level 1-3","Financial Modeling & Valuation","Excel, Bloomberg Terminal","Internship at bank/finance firm"]', 2),
(9, 'Phase 3', 'Analyst Role (2-3 years)', '["Deal origination and execution","Pitch book creation","Merger & acquisition modeling","Equity and debt research"]', 3),
(9, 'Phase 4', 'Senior Banker', '["Associate to VP track","Client relationship management","Lead deal teams","Sector specialization"]', 4);

-- Marketing Manager (career_id=10)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(10, 'Year 1-3', 'BBA / B.Com', '["Marketing Management principles","Consumer Behavior","Brand Management","Digital Marketing basics"]', 1),
(10, 'Year 3-5', 'MBA Marketing', '["Advanced Marketing Strategy","Market Research methods","Product Management","Sales Strategy"]', 2),
(10, 'Phase 3', 'Brand/Digital Executive', '["Execute social media campaigns","Google Ads / Meta Ads","SEO & Content Marketing","Data analytics for marketing"]', 3),
(10, 'Phase 4', 'Manager & Above', '["P&L ownership for brands","Agency & vendor management","Marketing budget planning","Team leadership"]', 4);

-- Lawyer (career_id=11)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(11, 'Year 1-2', 'Foundation Law', '["Constitution of India","Law of Contracts","Criminal Law (IPC, CrPC)","Law of Torts"]', 1),
(11, 'Year 2-4', 'Specialization Subjects', '["Corporate Law","Family Law","Intellectual Property","Labour Laws","Administrative Law"]', 2),
(11, 'Year 4-5', 'Moot Courts & Internships', '["Moot court competitions","Internship with district court","Law firm internship","Legal research projects"]', 3),
(11, 'Post-Graduation', 'Practice & Enrolment', '["Enroll with Karnataka Bar Council","Junior advocate under senior","Specialization choice","LLM optional for academia"]', 4);

-- Psychologist (career_id=12)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(12, 'Year 1-3', 'BA Psychology', '["General Psychology","Developmental Psychology","Social Psychology","Research Methods & Statistics"]', 1),
(12, 'Year 3-5', 'MA Psychology', '["Clinical Psychology","Abnormal Psychology","Psychotherapy methods","Psychological assessment tools"]', 2),
(12, 'Year 5-6', 'M.Phil (Mandatory for RCI)', '["Supervised clinical practice","Case studies","Psychodiagnostics","Dissertation research"]', 3),
(12, 'Specialization', 'Career Path Choice', '["Clinical practice (hospitals/clinics)","Organizational psychology","School counseling","Neuropsychology research"]', 4);

-- Journalist (career_id=13)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(13, 'Year 1', 'Media Fundamentals', '["Reporting & Writing","Media Ethics & Laws","Introduction to Mass Communication","Photography & Videography basics"]', 1),
(13, 'Year 2', 'Applied Journalism', '["Print Journalism","Broadcast Journalism (TV/Radio)","Digital Media & Social Media","Press Laws"]', 2),
(13, 'Year 3', 'Specialization', '["Beat reporting (Politcs/Business/Sports)","Investigative Journalism","Documentary making","Internship at media house"]', 3),
(13, 'Post-Grad', 'Career Entry', '["Entry level reporter/correspondent","Content writer / Editor","Freelance journalism","Journalism PG for specialization"]', 4);

-- AI/ML Engineer (career_id=14)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(14, 'Year 1', 'CS & Math Foundation', '["Python programming","Linear Algebra & Calculus","Statistics & Probability","Data structures & algorithms"]', 1),
(14, 'Year 2', 'Machine Learning Core', '["Supervised & Unsupervised Learning","Neural Networks basics","Scikit-learn & Pandas","Feature Engineering"]', 2),
(14, 'Year 3', 'Deep Learning & Specialization', '["Deep Learning (CNN, RNN, Transformers)","NLP & Computer Vision","Kaggle competitions","Research paper implementation"]', 3),
(14, 'Year 4', 'Production & Placement', '["MLOps & Model deployment","LLMs & Generative AI","Industry internship / project","Campus placements at AI-first companies"]', 4);

-- Data Scientist (career_id=15)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(15, 'Phase 1', 'Foundation', '["Python & R programming","SQL & Database design","Statistics & Probability","Data wrangling with Pandas/NumPy"]', 1),
(15, 'Phase 2', 'Analytics & ML', '["Exploratory Data Analysis","Machine Learning algorithms","Data visualization (Tableau, Power BI)","Business Analytics concepts"]', 2),
(15, 'Phase 3', 'Advanced Analytics', '["Big Data tools (Spark, Hadoop)","A/B Testing & Experimentation","Time series analysis","Cloud data platforms (AWS, GCP)"]', 3),
(15, 'Phase 4', 'Industry & Specialization', '["Real-world data projects","Domain specialization (FinTech/HealthTech)","Portfolio building & GitHub","Job search & data challenges"]', 4);

-- Cybersecurity Analyst (career_id=16)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(16, 'Year 1', 'Networking & OS', '["Networking fundamentals (TCP/IP)","Linux & Windows administration","Python & Bash scripting","Cybersecurity concepts"]', 1),
(16, 'Year 2', 'Security Core', '["Cryptography & PKI","Web application security (OWASP)","Ethical hacking basics","Intrusion detection systems"]', 2),
(16, 'Year 3', 'Specialization', '["Penetration testing (Kali Linux, Metasploit)","Incident response","Security Operations Center (SOC)","CEH / OSCP certifications"]', 3),
(16, 'Year 4', 'Advanced & Career', '["Cloud security (AWS Security)","Malware analysis","Bug bounty programs","CISSP / Security+ certifications"]', 4);

-- Cloud Architect (career_id=17)
INSERT INTO roadmap_steps (career_id, year_label, title, details, step_order) VALUES
(17, 'Phase 1', 'CS Foundation', '["Programming (Python/Java)","Networking & Linux systems","Database & storage fundamentals","Virtualization concepts"]', 1),
(17, 'Phase 2', 'Cloud Basics', '["AWS / Azure / GCP fundamentals","Cloud storage & compute services","Identity & access management","Cloud Solutions Architect Associate cert"]', 2),
(17, 'Phase 3', 'Advanced Cloud', '["Microservices & Kubernetes","Serverless architecture","Multi-cloud & hybrid cloud","DevOps & CI/CD pipelines"]', 3),
(17, 'Phase 4', 'Architect Level', '["Cloud Solutions Architect Professional cert","Enterprise architecture design","Cost optimization & FinOps","Lead cloud migration projects"]', 4);

-- ---- SKILLS ----
INSERT INTO skills (career_id, category, items) VALUES
(1, 'Technical', '["Java/Python/JavaScript","Data Structures & Algorithms","System Design","SQL & NoSQL Databases"]'),
(1, 'Tools', '["Git & GitHub","VS Code / IntelliJ","Docker & Kubernetes","AWS / Azure / GCP"]'),
(1, 'Soft Skills', '["Problem Solving","Team Collaboration","Communication","Agile Methodology"]'),

(2, 'Technical', '["Circuit Design","VHDL/Verilog","Embedded C","PCB Design"]'),
(2, 'Tools', '["MATLAB/Simulink","Cadence","Arduino/Raspberry Pi","Oscilloscope"]'),
(2, 'Soft Skills', '["Analytical Thinking","Attention to Detail","Technical Writing","Team Work"]'),

(3, 'Technical', '["AutoCAD/Revit","Structural Analysis","Construction Management","Geotechnical Engineering"]'),
(3, 'Tools', '["STAAD Pro","SAP2000","ETABS","MS Project"]'),
(3, 'Soft Skills', '["Project Management","Site Supervision","Problem Solving","Communication"]'),

(4, 'Technical', '["CAD/CAM Design","Thermodynamics","Manufacturing Processes","FEM Analysis"]'),
(4, 'Tools', '["SolidWorks","ANSYS","CATIA","MATLAB"]'),
(4, 'Soft Skills', '["Technical Problem Solving","Team Collaboration","Design Thinking","Quality Mindset"]'),

(5, 'Medical', '["Clinical Diagnosis","Patient Management","Anatomy & Physiology","Medical Procedures"]'),
(5, 'Specializations', '["Surgery","Cardiology","Neurology","Pediatrics","Orthopedics"]'),
(5, 'Soft Skills', '["Empathy & Compassion","Communication","Critical Thinking","Stress Management"]'),

(6, 'Technical', '["Drug Dispensing","Pharmacokinetics","Drug-Drug Interactions","Clinical Pharmacy"]'),
(6, 'Tools', '["Pharmacy Management Software","Drug Interaction Checkers","Laboratory techniques"]'),
(6, 'Soft Skills', '["Attention to Detail","Patient Counseling","Regulatory Compliance","Ethics"]'),

(7, 'Technical', '["Genetic Engineering","Bioinformatics","Cell Culture Techniques","PCR & Sequencing"]'),
(7, 'Tools', '["BLAST","PyMOL","MEGA","SPSS for biostatistics"]'),
(7, 'Soft Skills', '["Scientific Writing","Research Methodology","Lab Safety","Critical Analysis"]'),

(8, 'Technical', '["Financial Accounting","Auditing & Assurance","Income Tax & GST","Corporate Law"]'),
(8, 'Tools', '["Tally ERP","SAP FICO","MS Excel (Advanced)","ZOHO Books"]'),
(8, 'Soft Skills', '["Analytical Accuracy","Ethics & Integrity","Client Communication","Deadline Management"]'),

(9, 'Technical', '["Financial Modeling","DCF & Comparable Valuation","Merger & Acquisition Analysis","Capital Markets"]'),
(9, 'Tools', '["Bloomberg Terminal","MS Excel (Advanced)","PowerPoint for pitch books","Reuters Eikon"]'),
(9, 'Soft Skills', '["Quantitative Aptitude","Deal Structuring","Negotiation","Stress Tolerance"]'),

(10, 'Technical', '["Digital Marketing (SEO/SEM)","Market Research & Analysis","Brand Strategy","Campaign Management"]'),
(10, 'Tools', '["Google Analytics","Meta Ads Manager","HubSpot","Canva & Adobe Suite"]'),
(10, 'Soft Skills', '["Creative Thinking","Data-Driven Decision Making","Storytelling","Leadership"]'),

(11, 'Legal', '["Constitutional Law","Criminal Law","Corporate Law","Intellectual Property"]'),
(11, 'Tools', '["Legal research databases (Manupatra)","SCC Online","MS Word for drafting","Case management tools"]'),
(11, 'Soft Skills', '["Argumentation & Advocacy","Research & Analysis","Client Management","Ethical Conduct"]'),

(12, 'Clinical', '["Psychotherapy techniques","Psychological Assessment","Cognitive Behavioral Therapy","Crisis Intervention"]'),
(12, 'Tools', '["DSM-5 / ICD-11","MMPI & assessment scales","Therapy documentation tools"]'),
(12, 'Soft Skills', '["Empathy","Active Listening","Confidentiality","Emotional Resilience"]'),

(13, 'Journalism', '["Investigative Reporting","Content Writing","Video Production","Fact-checking"]'),
(13, 'Tools', '["Adobe Premiere Pro","WordPress CMS","Social Media Platforms","Video cameras/DSLR"]'),
(13, 'Soft Skills', '["Storytelling","Curiosity","Ethics in Journalism","Networking"]'),

(14, 'AI/ML Technical', '["Python (NumPy, Pandas, PyTorch)","Machine Learning algorithms","Deep Learning (CNN, Transformers)","MLOps"]'),
(14, 'Frameworks', '["TensorFlow / PyTorch","HuggingFace","LangChain","FastAPI for model serving"]'),
(14, 'Soft Skills', '["Research mindset","Mathematical intuition","Experimentation","Publications & Documentation"]'),

(15, 'Data Technical', '["Python & R","SQL & NoSQL","Tableau / Power BI","Apache Spark"]'),
(15, 'Analytics', '["Statistical Modeling","A/B Testing","Predictive Analytics","Data Storytelling"]'),
(15, 'Soft Skills', '["Business Acumen","Communicating insights to non-technical stakeholders","Curiosity","Attention to Detail"]'),

(16, 'Security Technical', '["Network Security","Penetration Testing","Malware Analysis","SIEM tools"]'),
(16, 'Certifications', '["CEH (Certified Ethical Hacker)","OSCP","CISSP","CompTIA Security+"]'),
(16, 'Soft Skills', '["Analytical Thinking","Ethical conduct","Incident Response under pressure","Continuous Learning"]'),

(17, 'Cloud Technical', '["AWS / Azure / GCP services","Kubernetes & Docker","Terraform (IaC)","CI/CD pipelines"]'),
(17, 'Certifications', '["AWS Solutions Architect","Google Cloud Professional","Azure Administrator","Kubernetes CKA"]'),
(17, 'Soft Skills', '["Systems Thinking","Cost Optimization mindset","Team Collaboration","Documentation"]');

-- ---- COLLEGES (Curated DB - 5 per major district) ----
INSERT INTO colleges (name, location, district, type, ranking, stream_ids, website, established, highlight) VALUES
('Indian Institute of Science (IISc)', 'Bengaluru', 'Bengaluru Urban', 'Government', 'NIRF #1 Overall', '[1,2,5]', 'https://iisc.ac.in', 1909, 'India\'s premier research institution for science and engineering'),
('RV College of Engineering (RVCE)', 'Bengaluru', 'Bengaluru Urban', 'Autonomous', 'NIRF Top 50 Engineering', '[1,5]', 'https://rvce.edu.in', 1963, 'Premier engineering college with strong industry ties'),
('Christ University', 'Bengaluru', 'Bengaluru Urban', 'Deemed', 'NIRF Top 30 University', '[3,4]', 'https://christuniversity.in', 1969, 'Top destination for Commerce, Arts, and Management studies'),
('National Law School of India (NLSIU)', 'Bengaluru', 'Bengaluru Urban', 'Government', 'NIRF #1 Law', '[4]', 'https://nls.ac.in', 1987, 'India\'s #1 law school'),
('IIM Bangalore (IIMB)', 'Bengaluru', 'Bengaluru Urban', 'Government', 'NIRF #1 Management', '[3]', 'https://iimb.ac.in', 1973, 'India\'s top management institution'),
('University of Mysore', 'Mysuru', 'Mysuru', 'Government', 'NAAC A++ Grade', '[1,2,3,4,5]', 'https://uni-mysore.ac.in', 1916, 'One of the oldest universities in Karnataka'),
('Mysore Medical College (MMC)', 'Mysuru', 'Mysuru', 'Government', 'NIRF Top 30 Medical', '[2]', 'https://mmcri.ac.in', 1924, 'Premier government medical institution of south Karnataka'),
('JSS Science & Technology University', 'Mysuru', 'Mysuru', 'Deemed', 'NAAC A+ Grade', '[1,2,5]', 'https://jssstuniv.in', 2013, 'Multi-disciplinary technical university of JSS Mahavidyapeetha');

-- ---- EXAMS ----
INSERT INTO exams (name, full_name, exam_date, eligibility, subjects, exam_type, stream_ids, website, difficulty) VALUES
('JEE Main', 'Joint Entrance Examination Main', 'January & April (Annually)', '12th pass with PCM, minimum 75% (General)', '["Physics","Chemistry","Mathematics"]', 'National', '[1,5]', 'https://jeemain.nta.nic.in', 'High'),
('JEE Advanced', 'Joint Entrance Examination Advanced', 'June (Annually)', 'Top 2.5 lakh JEE Main qualifiers', '["Physics","Chemistry","Mathematics"]', 'National', '[1,5]', 'https://jeeadv.ac.in', 'High'),
('KCET', 'Karnataka Common Entrance Test', 'April-May (Annually)', '12th pass with PCM/PCB, Karnataka domicile', '["Physics","Chemistry","Mathematics/Biology"]', 'State', '[1,2,5]', 'https://kea.kar.nic.in', 'Moderate'),
('NEET UG', 'National Eligibility cum Entrance Test (UG)', 'May (Annually)', '12th pass with PCB, min 50% (General)', '["Physics","Chemistry","Biology"]', 'National', '[2]', 'https://neet.nta.nic.in', 'High'),
('CLAT', 'Common Law Admission Test', 'December (for next year)', '12th pass, min 45% (General)', '["English","Current Affairs","Legal Reasoning","Logical Reasoning","Quantitative Techniques"]', 'National', '[4]', 'https://consortiumofnlus.ac.in', 'High'),
('CA Foundation', 'Chartered Accountancy Foundation Exam', 'May & November (Annually)', '12th pass (any stream)', '["Business Mathematics","Business Laws","Principles of Accounting","Economics"]', 'Professional', '[3]', 'https://icai.org', 'Moderate'),
('CUET', 'Common University Entrance Test', 'May-June (Annually)', '12th pass (any stream)', '["Domain specific subjects","General Test","Languages"]', 'National', '[1,2,3,4,5]', 'https://cuet.samarth.ac.in', 'Moderate'),
('GATE', 'Graduate Aptitude Test in Engineering', 'February (Annually)', 'B.Tech/B.E. or final year students', '["Engineering Mathematics","Subject-specific paper"]', 'National', '[1,5]', 'https://gate.iitb.ac.in', 'High'),
('PGCET', 'Karnataka Postgraduate Common Entrance Test', 'July-August (Annually)', 'Bachelor degree in relevant field, Karnataka domicile', '["Core engineering/science subjects"]', 'State', '[1,2,5]', 'https://kea.kar.nic.in/pgcet', 'Moderate'),
('CAT', 'Common Admission Test (IIMs)', 'November (Annually)', 'Bachelor degree (any stream) with min 50%', '["Verbal Ability & Reading Comprehension","Data Interpretation & Logical Reasoning","Quantitative Aptitude"]', 'National', '[3]', 'https://iimcat.ac.in', 'High');

-- =============================================
-- VERIFICATION QUERIES (uncomment to check)
-- =============================================
-- SELECT COUNT(*) as streams_count FROM streams;
-- SELECT COUNT(*) as careers_count FROM careers;
-- SELECT COUNT(*) as colleges_count FROM colleges;
-- SELECT COUNT(*) as exams_count FROM exams;
-- SELECT COUNT(*) as roadmap_steps_count FROM roadmap_steps;
-- SELECT COUNT(*) as skills_count FROM skills;

SELECT 'Schema & Seed Data loaded successfully!' as status;
SELECT CONCAT('Streams: ', COUNT(*)) as info FROM streams
UNION ALL SELECT CONCAT('Careers: ', COUNT(*)) FROM careers
UNION ALL SELECT CONCAT('Colleges: ', COUNT(*)) FROM colleges
UNION ALL SELECT CONCAT('Exams: ', COUNT(*)) FROM exams
UNION ALL SELECT CONCAT('Skills: ', COUNT(*)) FROM skills
UNION ALL SELECT CONCAT('Roadmap Steps: ', COUNT(*)) FROM roadmap_steps;