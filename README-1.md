# Kucchu Pucchu EVM

**Created by anuj_suryavanshii**

An interactive, realistic educational simulation of an Electronic Voting Machine (EVM) and Voter Verifiable Paper Audit Trail (VVPAT).

---

## Safety & Privacy Features
- **100% Client-Side**: Runs entirely in the browser using standard HTML5, CSS3, and vanilla JavaScript.
- **Zero External Dependencies**: No npm packages, no node_modules, no external CDN calls, and no tracking scripts.
- **Offline Capable**: Works completely offline without any internet connection.
- **Safe Local Storage**: Custom ringtones and session votes are stored safely in the browser's localStorage and never transmitted over the network.
- **Educational Purpose**: Built strictly as an educational and demonstration project.

---

## Project Structure

```text
evm-demo/
│
├── index.html        # Main application markup & structure
├── styles.css        # Physical hardware styling, animations & responsive layout
├── app.js            # EVM state machine, audio playback, VVPAT logic & ringtones
├── README.md         # Documentation & instructions
└── assets/           # Candidate symbols & verification photos
    ├── aap.webp
    ├── bjp.webp
    ├── cand1_photo.jpg
    ├── cand2_photo.jpg
    ├── cand3_photo.jpg
    ├── cand4_photo.jpg
    ├── cjp.jpg
    └── congress.webp
```

---

## How to Run

### Method 1: Direct Browser Launch (Easiest)
Simply double-click **index.html** or right-click -> **Open with** -> **Google Chrome** (or Edge/Firefox).

### Method 2: Local HTTP Server (Recommended)
Open a terminal in this folder and run:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

---

## How to Use
1. **Operator Step**: On the Control Unit (right side), click **ENABLE NEXT VOTE**. The green READY LED turns on.
2. **Voter Step**: On the Ballot Unit (left side), press the blue **VOTE** button next to your chosen candidate.
3. **Verification**:
   - The candidate's red LED lights up.
   - The candidate's custom ringtone / beep sounds.
   - The VVPAT window illuminates and displays the **candidate's photo** and name for ~4 seconds.
   - The slip drops into the audit compartment and the machine automatically locks to prevent duplicate voting.
4. **Tally Audit**: Click **SHOW RESULTS** at any time to view the vote distribution bar chart and detailed counts.
5. **Custom Ringtones**: Use the 4 columns below the simulation trigger to upload custom sound files (.mp3, .wav, .ogg, .m4a) for each party independently.

---
Made by anuj_suryavanshii
