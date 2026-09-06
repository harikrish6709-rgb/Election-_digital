/**
 * EVM WORKING KUCCHU PUCCHU EVM — CORE JAVASCRIPT
 * Strictly an educational simulation to explain electronic voting concepts.
 * Interactive Simulation — Not for real elections.
 */

// ===================================================
// CANDIDATES DATA SPECIFICATION (8 DEMO CANDIDATES)
// No emojis. Clean vector geometric SVG symbols.
// ===================================================
const DEMO_CANDIDATES = [
  {
    id: 1,
    num: "01",
    name: "BJP",
    role: "Candidate 01",
    symbolName: "Modi Ji",
    braille: [1, 0, 1, 0, 0, 1],
    symbolSvg: `<img src="assets/bjp.webp" alt="BJP" class="cand-symbol-img" />`,
    photoSrc: "assets/cand1_photo.jpg"
  },
  {
    id: 2,
    num: "02",
    name: "Congress",
    role: "Candidate 02",
    symbolName: "Rahul Gandhi",
    braille: [1, 1, 0, 0, 1, 0],
    symbolSvg: `<img src="assets/congress.webp" alt="Congress" class="cand-symbol-img" />`,
    photoSrc: "assets/cand2_photo.jpg"
  },
  {
    id: 3,
    num: "03",
    name: "Aam Aadmi Party",
    role: "Candidate 03",
    symbolName: "Kejuu",
    braille: [1, 0, 0, 1, 1, 0],
    symbolSvg: `<img src="assets/aap.webp" alt="Aam Aadmi Party" class="cand-symbol-img" />`,
    photoSrc: "assets/cand3_photo.jpg"
  },
  {
    id: 4,
    num: "04",
    name: "Cockroach janta Party",
    role: "Candidate 04",
    symbolName: "Abhijeet",
    braille: [1, 0, 1, 1, 0, 0],
    symbolSvg: `<img src="assets/cjp.jpg" alt="Cockroach janta Party" class="cand-symbol-img" />`,
    photoSrc: "assets/cand4_photo.jpg"
  }
];

// ===================================================
// APPLICATION STATE MACHINE (FSM)
// States: 'WAITING' | 'VOTING_ENABLED' | 'VOTE_RECORDED' | 'MACHINE_LOCKED'
// ===================================================
class EvmSimulation {
  constructor() {
    this.storageKey = 'KP_EVM_STATE_V1';
    this.audioEnabled = true;
    this.audioCtx = null;
    this.xrayActive = false;
    this.activeVoteTimeout = null;

    // Candidate-specific custom ringtones { [candidateId]: { url, name, element } }
    this.candidateAudios = {
      1: null,
      2: null,
      3: null,
      4: null
    };

    // Initial state
    this.state = 'WAITING'; // 'WAITING', 'VOTING_ENABLED', 'VOTE_RECORDED', 'MACHINE_LOCKED'
    this.votes = {};
    this.totalVotes = 0;
    this.auditLog = [];

    // Initialize vote tallies for all candidates
    DEMO_CANDIDATES.forEach(c => {
      this.votes[c.id] = 0;
    });

    this.cacheDomElements();
    this.loadState();
    this.renderCandidatesList();
    this.attachEventListeners();
    this.initAudioContext();
    this.updateUI();
    this.initPcbCanvases();
  }

  // Session persistence
  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.votes) this.votes = parsed.votes;
        if (typeof parsed.totalVotes === 'number') this.totalVotes = parsed.totalVotes;
        if (Array.isArray(parsed.auditLog)) this.auditLog = parsed.auditLog;
      }

      // Load custom ringtones for candidates 1..4 if previously saved
      for (let cid = 1; cid <= 4; cid++) {
        const savedAudio = localStorage.getItem(`KP_CUSTOM_AUDIO_${cid}_DATA`);
        const savedName = localStorage.getItem(`KP_CUSTOM_AUDIO_${cid}_NAME`);
        if (savedAudio) {
          this.setCandidateAudio(cid, savedAudio, savedName || `Custom Tone ${cid}`, false);
        }
      }

      // Backward compatibility: if previous single audio exists and Candidate 1 has no custom audio
      const legacyAudio = localStorage.getItem('KP_CUSTOM_AUDIO_DATA');
      const legacyName = localStorage.getItem('KP_CUSTOM_AUDIO_NAME');
      if (legacyAudio && !this.candidateAudios[1]) {
        this.setCandidateAudio(1, legacyAudio, legacyName || 'Custom Audio (Migrated)', true);
      }
    } catch (e) {
      console.warn("Storage read failed, using memory state", e);
    }
  }

  saveState() {
    try {
      const data = {
        votes: this.votes,
        totalVotes: this.totalVotes,
        auditLog: this.auditLog
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage save failed", e);
    }
  }

  cacheDomElements() {
    // Top Controls
    this.toggleXrayBtn = document.getElementById('toggleXrayBtn');
    this.toggleAudioBtn = document.getElementById('toggleAudioBtn');
    this.audioOnIcon = document.querySelector('.audio-on-icon');
    this.audioOffIcon = document.querySelector('.audio-off-icon');
    this.audioText = document.querySelector('.audio-text');

    // 4 Dedicated Candidate Ringtone Columns Elements
    this.ringtoneGlobalBadge = document.getElementById('ringtoneGlobalBadge');
    this.candSoundCols = {};
    for (let cid = 1; cid <= 4; cid++) {
      this.candSoundCols[cid] = {
        picker: document.getElementById(`audioPicker${cid}`),
        uploadText: document.getElementById(`uploadText${cid}`),
        badge: document.getElementById(`soundBadge${cid}`),
        metaDot: document.getElementById(`metaDot${cid}`),
        metaDesc: document.getElementById(`metaDesc${cid}`),
        btnTest: document.getElementById(`btnTestSound${cid}`),
        btnReset: document.getElementById(`btnResetSound${cid}`)
      };
    }

    // Ballot Unit Elements
    this.ballotUnit = document.getElementById('ballotUnit');
    this.candidatesList = document.getElementById('candidatesList');
    this.ballotPromptText = document.getElementById('ballotPromptText');
    this.ballotInstructionBar = document.getElementById('ballotInstructionBar');

    // Control Unit Elements
    this.controlUnit = document.getElementById('controlUnit');
    this.lcdStatusLine = document.getElementById('lcdStatusLine');
    this.lcdVotesLine = document.getElementById('lcdVotesLine');
    this.ledReady = document.getElementById('ledReady');
    this.ledVoting = document.getElementById('ledVoting');
    this.ledLocked = document.getElementById('ledLocked');
    this.ledResult = document.getElementById('ledResult');

    // Operator Buttons
    this.btnEnableVote = document.getElementById('btnEnableVote');
    this.btnShowResults = document.getElementById('btnShowResults');
    this.btnResetDemo = document.getElementById('btnResetDemo');

    // Cable & VVPAT Elements
    this.cableSignalPacket = document.getElementById('cableSignalPacket');
    this.vvpatViewportFrame = document.getElementById('vvpatViewportFrame');
    this.vvpatPaperSlip = document.getElementById('vvpatPaperSlip');
    this.slipSerialNum = document.getElementById('slipSerialNum');
    this.slipCandidateName = document.getElementById('slipCandidateName');
    this.slipCandidatePhoto = document.getElementById('slipCandidatePhoto');
    this.slipTimestamp = document.getElementById('slipTimestamp');
    this.vvpatLed = document.getElementById('vvpatLed');
    this.vvpatStatusText = document.getElementById('vvpatStatusText');
    this.vvpatIdleMsg = document.getElementById('vvpatIdleMsg');

    // X-Ray Elements
    this.xrayInspectorPanel = document.getElementById('xrayInspectorPanel');
    this.closeXrayBtn = document.getElementById('closeXrayBtn');
    this.buXrayOverlay = document.getElementById('buXrayOverlay');
    this.cuXrayOverlay = document.getElementById('cuXrayOverlay');
    this.cuMemoryChip = document.getElementById('cuMemoryChip');

    // Educational Section Elements
    this.flowStep1 = document.getElementById('flowStep1');
    this.flowStep2 = document.getElementById('flowStep2');
    this.flowStep3 = document.getElementById('flowStep3');
    this.flowStep4 = document.getElementById('flowStep4');
    this.flowStep5 = document.getElementById('flowStep5');
    this.flowStep6 = document.getElementById('flowStep6');
    this.btnSimulatePulse = document.getElementById('btnSimulatePulse');

    // Modals
    this.resultsModal = document.getElementById('resultsModal');
    this.btnCloseResults = document.getElementById('btnCloseResults');
    this.btnBackToControlUnit = document.getElementById('btnBackToControlUnit');
    this.resultTotalVotes = document.getElementById('resultTotalVotes');
    this.resultLeadingCandidate = document.getElementById('resultLeadingCandidate');
    this.chartBarsContainer = document.getElementById('chartBarsContainer');
    this.resultsTableBody = document.getElementById('resultsTableBody');
    this.auditLogContainer = document.getElementById('auditLogContainer');

    this.resetModal = document.getElementById('resetModal');
    this.btnCloseResetModal = document.getElementById('btnCloseResetModal');
    this.btnCancelReset = document.getElementById('btnCancelReset');
    this.btnConfirmReset = document.getElementById('btnConfirmReset');
  }

  // ===================================================
  // SYNTHESIZED WEB AUDIO (EVM CONFIRMATION TONE)
  // No external files needed, authentic tone synthesis
  // ===================================================
  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  resumeAudioIfNeeded() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playEvmBeep(candidateId = null) {
    if (!this.audioEnabled) return;

    // If candidateId is provided and candidate has a custom audio set, play it
    if (candidateId && this.candidateAudios[candidateId]?.element) {
      try {
        const audio = this.candidateAudios[candidateId].element;
        audio.pause();
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn(`Candidate ${candidateId} audio playback failed, falling back to synthesizer`, err);
            this.playDefaultSyntheticBeep();
          });
        }
        return;
      } catch (err) {
        console.warn(`Candidate ${candidateId} audio error, falling back`, err);
      }
    }

    // Default factory electronic EVM tone
    this.playDefaultSyntheticBeep();
  }

  playDefaultSyntheticBeep() {
    if (!this.audioEnabled || !this.audioCtx) return;
    this.resumeAudioIfNeeded();

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Classic electronic voting machine tone: ~1320 Hz pure square/sine mix
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1320, now);

      // Low pass filter to create that warm buzzer tone
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);

      // Amplitude envelope: 1.2 seconds duration
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
      gain.gain.setValueAtTime(0.24, now + 1.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.26);
    } catch (e) {
      console.warn("Audio playback error", e);
    }
  }

  // ===================================================
  // CANDIDATE-SPECIFIC CUSTOM RINGTONE HANDLERS
  // ===================================================
  handleCandidateAudioFile(e, cid) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      this.setCandidateAudio(cid, dataUrl, file.name, true);

      // Immediate test preview of the sound for that candidate
      this.playEvmBeep(cid);
    };
    reader.readAsDataURL(file);
  }

  setCandidateAudio(cid, url, name, updateStorage = false) {
    const audioEl = new Audio(url);
    this.candidateAudios[cid] = {
      url: url,
      name: name,
      element: audioEl
    };

    if (updateStorage) {
      try {
        if (url.length < 4.5 * 1024 * 1024) {
          localStorage.setItem(`KP_CUSTOM_AUDIO_${cid}_DATA`, url);
          localStorage.setItem(`KP_CUSTOM_AUDIO_${cid}_NAME`, name);
        }
      } catch (err) {
        console.warn(`Candidate ${cid} audio file too large for localStorage, retained in memory`, err);
      }
    }

    const col = this.candSoundCols ? this.candSoundCols[cid] : null;
    if (col) {
      if (col.badge) {
        col.badge.textContent = "CUSTOM";
        col.badge.classList.add('active-custom');
      }
      if (col.uploadText) {
        col.uploadText.textContent = name;
        col.uploadText.title = name;
      }
      if (col.metaDot) {
        col.metaDot.classList.remove('active-default');
        col.metaDot.classList.add('active-custom');
      }
      if (col.metaDesc) {
        col.metaDesc.textContent = name;
        col.metaDesc.title = name;
      }
      if (col.btnReset) {
        col.btnReset.classList.remove('hidden');
      }
    }

    this.updateGlobalAudioBadge();
  }

  resetCandidateAudio(cid) {
    this.playOperatorClick();
    this.candidateAudios[cid] = null;

    try {
      localStorage.removeItem(`KP_CUSTOM_AUDIO_${cid}_DATA`);
      localStorage.removeItem(`KP_CUSTOM_AUDIO_${cid}_NAME`);
    } catch (e) {}

    const col = this.candSoundCols ? this.candSoundCols[cid] : null;
    if (col) {
      if (col.picker) col.picker.value = '';
      if (col.badge) {
        col.badge.textContent = "DEFAULT";
        col.badge.classList.remove('active-custom');
      }
      if (col.uploadText) {
        col.uploadText.textContent = "Choose Sound File";
        col.uploadText.title = "Choose Sound File";
      }
      if (col.metaDot) {
        col.metaDot.classList.remove('active-custom');
        col.metaDot.classList.add('active-default');
      }
      if (col.metaDesc) {
        col.metaDesc.textContent = "Factory Beep";
        col.metaDesc.title = "Factory Beep (1320 Hz)";
      }
      if (col.btnReset) {
        col.btnReset.classList.add('hidden');
      }
    }

    this.updateGlobalAudioBadge();
    this.playDefaultSyntheticBeep();
  }

  updateGlobalAudioBadge() {
    if (!this.ringtoneGlobalBadge) return;
    const customCount = [1, 2, 3, 4].filter(id => this.candidateAudios[id] !== null).length;
    if (customCount === 0) {
      this.ringtoneGlobalBadge.textContent = "FACTORY BEEPS ACTIVE";
      this.ringtoneGlobalBadge.classList.remove('custom-active');
    } else {
      this.ringtoneGlobalBadge.textContent = `${customCount}/4 CUSTOM TONES ACTIVE`;
      this.ringtoneGlobalBadge.classList.add('custom-active');
    }
  }

  playOperatorClick() {
    if (!this.audioEnabled || !this.audioCtx) return;
    this.resumeAudioIfNeeded();

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  playEnableTone() {
    if (!this.audioEnabled || !this.audioCtx) return;
    this.resumeAudioIfNeeded();

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch (e) {}
  }

  // ===================================================
  // RENDER CANDIDATES LIST IN BALLOT UNIT
  // ===================================================
  renderCandidatesList() {
    this.candidatesList.innerHTML = '';

    DEMO_CANDIDATES.forEach(cand => {
      const row = document.createElement('div');
      row.className = 'candidate-row';
      row.id = `candRow${cand.id}`;

      // Braille dots representation
      const brailleDots = cand.braille.map(isRaised => 
        `<div class="braille-dot ${isRaised ? 'raised' : ''}"></div>`
      ).join('');

      row.innerHTML = `
        <div class="cand-num-box">${cand.num}</div>
        <div class="cand-name-wrap">
          <span class="cand-name">${cand.name}</span>
          <span class="cand-subtext">${cand.symbolName}</span>
        </div>
        <div class="cand-symbol-box">
          ${cand.symbolSvg}
        </div>
        <div class="cand-braille-box" title="Tactile Braille simulation">
          <div class="braille-grid">
            ${brailleDots}
          </div>
        </div>
        <div class="cand-led-col">
          <div class="cand-led-bezel">
            <div class="cand-led-bulb" id="candLed${cand.id}"></div>
          </div>
        </div>
        <div class="cand-vote-col">
          <button class="cand-vote-btn" id="candBtn${cand.id}" data-id="${cand.id}" disabled aria-label="Vote for ${cand.name}">
            <div class="cand-btn-surface">
              <svg class="btn-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <span class="cand-btn-text">VOTE</span>
            </div>
          </button>
        </div>
      `;

      this.candidatesList.appendChild(row);
    });
  }

  // ===================================================
  // ATTACH EVENT LISTENERS
  // ===================================================
  attachEventListeners() {
    // Header Actions
    if (this.toggleXrayBtn) {
      this.toggleXrayBtn.addEventListener('click', () => this.toggleXrayMode());
    }
    if (this.closeXrayBtn) {
      this.closeXrayBtn.addEventListener('click', () => this.toggleXrayMode(false));
    }
    if (this.toggleAudioBtn) {
      this.toggleAudioBtn.addEventListener('click', () => this.toggleAudio());
    }

    // Operator Buttons on Control Unit
    this.btnEnableVote.addEventListener('click', () => this.handleEnableVote());
    this.btnShowResults.addEventListener('click', () => this.handleShowResults());
    this.btnResetDemo.addEventListener('click', () => this.handleOpenResetModal());

    // Candidate Vote Buttons Delegation
    this.candidatesList.addEventListener('click', (e) => {
      const voteBtn = e.target.closest('.cand-vote-btn');
      if (voteBtn && !voteBtn.disabled) {
        const candId = parseInt(voteBtn.getAttribute('data-id'), 10);
        this.handleCastVote(candId);
      }
    });

    // Modals
    this.btnCloseResults.addEventListener('click', () => this.closeResultsModal());
    this.btnBackToControlUnit.addEventListener('click', () => this.closeResultsModal());

    this.btnCloseResetModal.addEventListener('click', () => this.closeResetModal());
    this.btnCancelReset.addEventListener('click', () => this.closeResetModal());
    this.btnConfirmReset.addEventListener('click', () => this.confirmReset());

    // Educational Simulation Trigger
    this.btnSimulatePulse.addEventListener('click', () => this.simulateInternalPulse());

    // Dedicated Candidate Ringtone Listeners (Candidates 1..4)
    for (let cid = 1; cid <= 4; cid++) {
      const col = this.candSoundCols ? this.candSoundCols[cid] : null;
      if (col) {
        if (col.picker) {
          col.picker.addEventListener('change', (e) => this.handleCandidateAudioFile(e, cid));
        }
        if (col.btnTest) {
          col.btnTest.addEventListener('click', () => this.playEvmBeep(cid));
        }
        if (col.btnReset) {
          col.btnReset.addEventListener('click', () => this.resetCandidateAudio(cid));
        }
      }
    }

    // Workflow Stepper Card Clicks (Educational)
    document.querySelectorAll('.step-card').forEach(card => {
      card.addEventListener('click', () => {
        const stepNum = parseInt(card.getAttribute('data-step'), 10);
        this.highlightStep(stepNum);
      });
    });

    // Keyboard Accessibility
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeResultsModal();
        this.closeResetModal();
      }
    });
  }

  // ===================================================
  // AUDIO & X-RAY TOGGLES
  // ===================================================
  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    if (this.toggleAudioBtn) {
      if (this.audioEnabled) {
        this.toggleAudioBtn.classList.add('active');
        if (this.audioOnIcon) this.audioOnIcon.classList.remove('hidden');
        if (this.audioOffIcon) this.audioOffIcon.classList.add('hidden');
        if (this.audioText) this.audioText.textContent = "SOUND ON";
      } else {
        this.toggleAudioBtn.classList.remove('active');
        if (this.audioOnIcon) this.audioOnIcon.classList.add('hidden');
        if (this.audioOffIcon) this.audioOffIcon.classList.remove('hidden');
        if (this.audioText) this.audioText.textContent = "SOUND MUTED";
      }
    }
    if (this.audioEnabled) {
      this.playOperatorClick();
    }
  }

  toggleXrayMode(forceState = null) {
    this.xrayActive = forceState !== null ? forceState : !this.xrayActive;
    if (this.xrayActive) {
      document.body.classList.add('xray-active');
      if (this.toggleXrayBtn) this.toggleXrayBtn.classList.add('active');
      if (this.xrayInspectorPanel) this.xrayInspectorPanel.classList.remove('hidden');
      this.drawPcbCanvases();
    } else {
      document.body.classList.remove('xray-active');
      if (this.toggleXrayBtn) this.toggleXrayBtn.classList.remove('active');
      if (this.xrayInspectorPanel) this.xrayInspectorPanel.classList.add('hidden');
    }
    this.playOperatorClick();
  }

  // ===================================================
  // FLOW STEP 2: OPERATOR ENABLES VOTING
  // ===================================================
  handleEnableVote() {
    if (this.state === 'VOTING_ENABLED') {
      // Already enabled, give slight tactile feedback
      this.playOperatorClick();
      return;
    }

    this.playEnableTone();
    this.state = 'VOTING_ENABLED';

    // Animate button press
    this.btnEnableVote.classList.add('btn-pressed');
    setTimeout(() => this.btnEnableVote.classList.remove('btn-pressed'), 150);

    // Animate signal packet traveling from CU to BU along interconnect cable
    this.animateCablePacket('CU_TO_BU');

    // Update UI elements
    this.updateUI();
    this.highlightStep(1);

    // If X-Ray active, trigger trace pulse
    if (this.xrayActive) {
      this.pulsePcbTrace();
    }
  }

  // ===================================================
  // FLOW STEP 3 & 4: VOTER CASTS VOTE
  // ===================================================
  handleCastVote(candidateId) {
    if (this.state !== 'VOTING_ENABLED') return;

    const candidate = DEMO_CANDIDATES.find(c => c.id === candidateId);
    if (!candidate) return;

    // Immediately latch state: single vote only!
    this.state = 'VOTE_RECORDED';

    // Immediately disable all vote buttons to guarantee single selection
    this.disableAllCandidateButtons();

    // Increment vote tallies
    this.votes[candidateId] = (this.votes[candidateId] || 0) + 1;
    this.totalVotes += 1;

    // Timestamped audit event
    const now = new Date();
    const timestampStr = now.toTimeString().split(' ')[0];
    const serialId = "KP-" + String(1000 + this.totalVotes);

    this.auditLog.unshift({
      candidateId: candidate.id,
      candidateName: candidate.name,
      serialId: serialId,
      time: timestampStr
    });

    this.saveState();

    // Tactile button press simulation
    const btn = document.getElementById(`candBtn${candidateId}`);
    if (btn) btn.classList.add('pressed-down');

    const row = document.getElementById(`candRow${candidateId}`);
    if (row) row.classList.add('active-selection');

    // Light selected candidate's RED LED
    const led = document.getElementById(`candLed${candidateId}`);
    if (led) led.classList.add('active');

    // Play EVM confirmation beep (candidate-specific ringtone)
    this.playEvmBeep(candidateId);

    // Animate signal traveling from BU to CU along interconnect cable
    this.animateCablePacket('BU_TO_CU');

    // Update Control Unit display & LEDs
    this.updateUI();

    // Highlight educational steps
    this.highlightStep(2);
    setTimeout(() => this.highlightStep(3), 600);
    setTimeout(() => this.highlightStep(4), 1200);

    // Trigger internal pipeline pulse
    this.simulateInternalPipelineFromVote(candidate.name);

    // VVPAT Visual Verification Sequence
    this.triggerVvpatDisplay(candidate, serialId, timestampStr, () => {
      // Step 4 completion callback (after ~3 seconds):
      // Hide VVPAT panel, lock machine
      if (btn) btn.classList.remove('pressed-down');
      if (row) row.classList.remove('active-selection');
      if (led) led.classList.remove('active');

      this.state = 'MACHINE_LOCKED';
      this.updateUI();
      this.highlightStep(5);
    });
  }

  // ===================================================
  // VVPAT DISPLAY SEQUENCE
  // Displays verification slip for ~3 seconds, then drops
  // ===================================================
  triggerVvpatDisplay(candidate, serialId, timestamp, onComplete) {
    // Fill slip data with candidate photo and name
    this.slipSerialNum.textContent = serialId;
    this.slipCandidateName.textContent = candidate.name + (candidate.symbolName ? ` (${candidate.symbolName})` : '');
    if (this.slipCandidatePhoto) {
      this.slipCandidatePhoto.src = candidate.photoSrc || '';
      this.slipCandidatePhoto.alt = `${candidate.name} Photo`;
    }
    this.slipTimestamp.textContent = `TIME: ${timestamp}`;

    // Hide idle message, illuminate window
    this.vvpatIdleMsg.classList.add('hidden');
    this.vvpatViewportFrame.classList.add('illuminated');
    this.vvpatStatusText.textContent = "PRINTING SLIP";
    this.vvpatLed.style.background = "#ffb700";
    this.vvpatLed.style.boxShadow = "0 0 8px #ffb700";

    // Feed slip down
    this.vvpatPaperSlip.classList.remove('slip-drop');
    this.vvpatPaperSlip.classList.add('slip-visible');

    // Keep visible for ~3.8 seconds (within 3 to 5 seconds requirement)
    if (this.activeVoteTimeout) clearTimeout(this.activeVoteTimeout);

    this.activeVoteTimeout = setTimeout(() => {
      // Animate slip dropping into sealed box
      this.vvpatPaperSlip.classList.remove('slip-visible');
      this.vvpatPaperSlip.classList.add('slip-drop');
      this.vvpatStatusText.textContent = "SLIP VERIFIED";

      setTimeout(() => {
        // Dim interior lamp and return to idle state
        this.vvpatViewportFrame.classList.remove('illuminated');
        this.vvpatIdleMsg.classList.remove('hidden');
        this.vvpatStatusText.textContent = "PRINTER IDLE";
        this.vvpatLed.style.background = "#00ff55";
        this.vvpatLed.style.boxShadow = "0 0 6px #00ff55";
        if (this.slipCandidatePhoto) {
          this.slipCandidatePhoto.src = '';
        }

        if (typeof onComplete === 'function') {
          onComplete();
        }
      }, 700);
    }, 3800);
  }

  // ===================================================
  // CABLE ANIMATION
  // ===================================================
  animateCablePacket(direction) {
    this.cableSignalPacket.classList.remove('animate-bu-to-cu', 'animate-cu-to-bu');
    // Force reflow
    void this.cableSignalPacket.offsetWidth;

    if (direction === 'BU_TO_CU') {
      this.cableSignalPacket.classList.add('animate-bu-to-cu');
    } else {
      this.cableSignalPacket.classList.add('animate-cu-to-bu');
    }
  }

  // ===================================================
  // UI & LED UPDATES
  // ===================================================
  updateUI() {
    // 1. Digital LCD Display
    this.lcdVotesLine.textContent = `TOTAL VOTES: ${this.totalVotes}`;

    // 2. Status LEDs & Text
    this.ledReady.classList.remove('active');
    this.ledVoting.classList.remove('active');
    this.ledLocked.classList.remove('active');
    this.ledResult.classList.remove('active');

    const allVoteButtons = document.querySelectorAll('.cand-vote-btn');

    switch (this.state) {
      case 'WAITING':
        this.lcdStatusLine.textContent = 'STATUS: WAITING';
        this.ledLocked.classList.add('active');
        this.ballotPromptText.textContent = "Waiting for the polling officer to enable voting";
        this.ballotInstructionBar.classList.remove('voting-ready');
        allVoteButtons.forEach(btn => btn.disabled = true);
        break;

      case 'VOTING_ENABLED':
        this.lcdStatusLine.textContent = 'STATUS: VOTING ENABLED';
        this.ledReady.classList.add('active');
        this.ballotPromptText.textContent = "VOTING ACTIVE — Press ONE candidate button to cast vote";
        this.ballotInstructionBar.classList.add('voting-ready');
        allVoteButtons.forEach(btn => btn.disabled = false);
        break;

      case 'VOTE_RECORDED':
        this.lcdStatusLine.textContent = 'STATUS: VOTE RECORDED';
        this.ledVoting.classList.add('active');
        this.ballotPromptText.textContent = "Vote successfully registered. Verifying slip...";
        this.ballotInstructionBar.classList.remove('voting-ready');
        allVoteButtons.forEach(btn => btn.disabled = true);
        break;

      case 'MACHINE_LOCKED':
        this.lcdStatusLine.textContent = 'STATUS: MACHINE LOCKED';
        this.ledLocked.classList.add('active');
        this.ballotPromptText.textContent = "Voting completed. Waiting for officer to enable next vote";
        this.ballotInstructionBar.classList.remove('voting-ready');
        allVoteButtons.forEach(btn => btn.disabled = true);
        break;
    }
  }

  disableAllCandidateButtons() {
    const allButtons = document.querySelectorAll('.cand-vote-btn');
    allButtons.forEach(b => b.disabled = true);
  }

  // ===================================================
  // RESULT MODE
  // ===================================================
  handleShowResults() {
    this.playOperatorClick();
    this.ledResult.classList.add('active');

    // Update Result Metrics
    this.resultTotalVotes.textContent = this.totalVotes;

    // Find leading candidate
    let maxVotes = -1;
    let leaders = [];
    DEMO_CANDIDATES.forEach(cand => {
      const v = this.votes[cand.id] || 0;
      if (v > maxVotes) {
        maxVotes = v;
        leaders = [cand.name];
      } else if (v === maxVotes && v > 0) {
        leaders.push(cand.name);
      }
    });

    if (this.totalVotes === 0) {
      this.resultLeadingCandidate.textContent = "No votes cast";
    } else if (leaders.length === 1) {
      this.resultLeadingCandidate.textContent = `${leaders[0]} (${maxVotes} votes)`;
    } else {
      this.resultLeadingCandidate.textContent = `Tied: ${leaders.join(', ')}`;
    }

    // Render Bar Chart
    this.renderResultChart();

    // Render Results Table
    this.renderResultsTable();

    // Render Audit Log
    this.renderAuditLog();

    // Open Modal
    this.resultsModal.classList.remove('hidden');
  }

  renderResultChart() {
    this.chartBarsContainer.innerHTML = '';

    DEMO_CANDIDATES.forEach(cand => {
      const voteCount = this.votes[cand.id] || 0;
      const pct = this.totalVotes > 0 ? ((voteCount / this.totalVotes) * 100).toFixed(1) : "0.0";

      const row = document.createElement('div');
      row.className = 'chart-row';
      row.innerHTML = `
        <div class="chart-cand-name">${cand.num}. ${cand.name}</div>
        <div class="chart-track">
          <div class="chart-fill-bar" style="width: 0%" data-pct="${pct}"></div>
        </div>
        <div class="chart-cand-votes">${voteCount} (${pct}%)</div>
      `;
      this.chartBarsContainer.appendChild(row);
    });

    // Animate bar fills after opening
    setTimeout(() => {
      document.querySelectorAll('.chart-fill-bar').forEach(bar => {
        const p = bar.getAttribute('data-pct');
        bar.style.width = `${p}%`;
      });
    }, 100);
  }

  renderResultsTable() {
    this.resultsTableBody.innerHTML = '';

    DEMO_CANDIDATES.forEach(cand => {
      const voteCount = this.votes[cand.id] || 0;
      const pct = this.totalVotes > 0 ? ((voteCount / this.totalVotes) * 100).toFixed(1) : "0.0";

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${cand.num}</strong></td>
        <td>${cand.name}</td>
        <td>
          <div class="table-symbol-box">${cand.symbolSvg}</div>
        </td>
        <td><strong>${voteCount}</strong></td>
        <td>${pct}%</td>
      `;
      this.resultsTableBody.appendChild(tr);
    });
  }

  renderAuditLog() {
    if (this.auditLog.length === 0) {
      this.auditLogContainer.innerHTML = '<div class="empty-audit">No votes have been cast yet in this session.</div>';
      return;
    }

    this.auditLogContainer.innerHTML = this.auditLog.map(item => `
      <div class="audit-item">
        <span style="color:#77aaff;">[${item.time}]</span>
        <span style="color:#00ff55;">${item.serialId}</span> &rarr;
        <strong>${item.candidateName}</strong> (Vote Recorded)
      </div>
    `).join('');
  }

  closeResultsModal() {
    this.playOperatorClick();
    this.resultsModal.classList.add('hidden');
    this.updateUI();
  }

  // ===================================================
  // RESET SYSTEM
  // ===================================================
  handleOpenResetModal() {
    this.playOperatorClick();
    this.resetModal.classList.remove('hidden');
  }

  closeResetModal() {
    this.playOperatorClick();
    this.resetModal.classList.add('hidden');
  }

  confirmReset() {
    this.playOperatorClick();
    // Clear tallies
    DEMO_CANDIDATES.forEach(cand => {
      this.votes[cand.id] = 0;
    });
    this.totalVotes = 0;
    this.auditLog = [];

    localStorage.removeItem(this.storageKey);

    // Return to WAITING state
    this.state = 'WAITING';
    this.closeResetModal();
    this.updateUI();
    this.highlightStep(1);

    // Beep reset confirmation
    if (this.audioEnabled && this.audioCtx) {
      this.resumeAudioIfNeeded();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(450, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    }
  }

  // ===================================================
  // EDUCATIONAL WORKFLOW STEPPER SYNC
  // ===================================================
  highlightStep(stepNum) {
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active-step'));
    const activeCard = document.getElementById(`flowStep${stepNum}`);
    if (activeCard) {
      activeCard.classList.add('active-step');
    }
  }

  // ===================================================
  // WHAT HAPPENS INSIDE? SIGNAL PIPELINE SIMULATION
  // ===================================================
  simulateInternalPulse() {
    this.playOperatorClick();
    this.runSignalPipelineAnimation();
  }

  simulateInternalPipelineFromVote(candidateName) {
    this.runSignalPipelineAnimation();
  }

  runSignalPipelineAnimation() {
    const nodes = [
      'pipeNodeBtn',
      'pipeNodeSignal',
      'pipeNodeLogic',
      'pipeNodeStorage',
      'pipeNodeConfirm',
      'pipeNodeLock'
    ];

    const arrows = [
      'pulseDot1',
      'pulseDot2',
      'pulseDot3',
      'pulseDot4',
      'pulseDot5'
    ];

    // Reset all
    nodes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('highlight');
    });
    arrows.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentElement) el.parentElement.classList.remove('pulsing');
    });

    // Sequence through nodes
    nodes.forEach((nodeId, idx) => {
      setTimeout(() => {
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) nodeEl.classList.add('highlight');

        if (idx > 0 && arrows[idx - 1]) {
          const arrowEl = document.getElementById(arrows[idx - 1]);
          if (arrowEl && arrowEl.parentElement) {
            arrowEl.parentElement.classList.add('pulsing');
          }
        }

        setTimeout(() => {
          if (nodeEl) nodeEl.classList.remove('highlight');
          if (idx > 0 && arrows[idx - 1]) {
            const arrowEl = document.getElementById(arrows[idx - 1]);
            if (arrowEl && arrowEl.parentElement) {
              arrowEl.parentElement.classList.remove('pulsing');
            }
          }
        }, 500);
      }, idx * 450);
    });
  }

  // ===================================================
  // PCB CIRCUIT CANVASES (X-RAY VISUALIZATION)
  // ===================================================
  initPcbCanvases() {
    window.addEventListener('resize', () => {
      if (this.xrayActive) this.drawPcbCanvases();
    });
  }

  drawPcbCanvases() {
    this.drawBuCanvas();
    this.drawCuCanvas();
  }

  drawBuCanvas() {
    const canvas = document.getElementById('buPcbCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw copper tracks from candidate buttons to BU MCU
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 4;

    const rowCount = DEMO_CANDIDATES.length;
    const spacing = canvas.height / (rowCount + 1);

    for (let i = 1; i <= rowCount; i++) {
      const y = i * spacing;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(canvas.width * 0.4, y);
      ctx.lineTo(canvas.width * 0.7, canvas.height / 2 + (i - (rowCount + 1) / 2) * 14);
      ctx.lineTo(canvas.width - 15, canvas.height / 2 + (i - (rowCount + 1) / 2) * 14);
      ctx.stroke();

      // Solder pads
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(10, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCuCanvas() {
    const canvas = document.getElementById('cuPcbCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bus connections between CU MCU, Memory, and Buzzer
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 4;

    // Bus track 1: Input to MCU
    ctx.beginPath();
    ctx.moveTo(10, 40);
    ctx.lineTo(canvas.width * 0.5, 40);
    ctx.lineTo(canvas.width * 0.5, canvas.height * 0.35);
    ctx.stroke();

    // Bus track 2: MCU to Memory
    ctx.strokeStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.5, canvas.height * 0.45);
    ctx.lineTo(canvas.width * 0.5, canvas.height * 0.7);
    ctx.stroke();

    // Bus track 3: MCU to Buzzer
    ctx.strokeStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.5, canvas.height * 0.4);
    ctx.lineTo(canvas.width * 0.85, canvas.height * 0.4);
    ctx.lineTo(canvas.width * 0.85, canvas.height * 0.8);
    ctx.stroke();

    // Test points
    ctx.fillStyle = '#ffffff';
    [
      [10, 40],
      [canvas.width * 0.5, canvas.height * 0.35],
      [canvas.width * 0.5, canvas.height * 0.7],
      [canvas.width * 0.85, canvas.height * 0.8]
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  pulsePcbTrace() {
    if (this.cuMemoryChip) {
      this.cuMemoryChip.classList.add('pulse-active');
      setTimeout(() => this.cuMemoryChip.classList.remove('pulse-active'), 600);
    }
  }
}

// ===================================================
// APP INITIALIZATION
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  window.evmDemoApp = new EvmSimulation();
});
