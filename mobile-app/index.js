// index.js
import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import circuit from "./circuit/zkp_noir.json";

// Initialise WASM modules (required)
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);

const show = (id, content) => {
  const container = document.getElementById(id);
  const line = document.createElement("div");
  line.textContent = content;
  line.className = "leading-relaxed text-slate-200";
  container.appendChild(line);
};

const showSection = (id, title) => {
  const container = document.getElementById(id);
  const section = document.createElement("div");
  section.textContent = title;
  section.className = "text-yellow-400 font-bold text-lg mt-4 mb-2 border-b border-slate-600 pb-1";
  container.appendChild(section);
};

const showDivider = (id) => {
  const container = document.getElementById(id);
  const divider = document.createElement("div");
  divider.className = "h-px bg-slate-700 my-3";
  container.appendChild(divider);
};

const showResult = (id, message, isValid) => {
  const container = document.getElementById(id);
  const result = document.createElement("div");
  result.textContent = `🎯 RESULT: ${message}`;
  result.className = `text-xl font-bold p-4 rounded-lg ${isValid ? 'bg-green-900/30 text-green-300 border border-green-600' : 'bg-red-900/30 text-red-300 border border-red-600'}`;
  container.appendChild(result);
};

const showJson = (id, label, obj) => {
  const container = document.getElementById(id);
  const wrapper = document.createElement("div");
  wrapper.className = "my-3";
  
  const labelDiv = document.createElement("div");
  labelDiv.textContent = label + ":";
  labelDiv.className = "text-cyan-400 font-semibold mb-1";
  wrapper.appendChild(labelDiv);
  
  const pre = document.createElement("pre");
  pre.className = "bg-slate-950 border border-slate-600 rounded-lg p-3 overflow-auto max-h-48 text-xs text-green-300";
  pre.textContent = JSON.stringify(obj, null, 2);
  wrapper.appendChild(pre);
  
  container.appendChild(wrapper);
};

const clearLogs = () => {
  document.getElementById("logs").innerHTML = '<p class="text-slate-400 italic">Logs will appear here...</p>';
  document.getElementById("results").innerHTML = '<p class="text-slate-400 italic">Proof data will appear here...</p>';
};

document.getElementById("submit").addEventListener("click", async () => {
  const submitBtn = document.getElementById("submit");
  const originalText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Processing...";
    submitBtn.className = submitBtn.className.replace("from-purple-600 to-pink-600", "from-gray-600 to-gray-600");
    
    clearLogs();
    
    // Hard-coded hospital reference for proto
    const latRef = 1000;
    const lonRef = 2000;

    const latDonorStr = document.getElementById("lat_donor").value;
    const lonDonorStr = document.getElementById("lon_donor").value;
    const radiusStr = document.getElementById("radius").value;

    if (!latDonorStr || !lonDonorStr || !radiusStr) {
      show("logs", "Please fill all fields");
      return;
    }

    const lat_donor = Number(latDonorStr);
    const lon_donor = Number(lonDonorStr);
    const radius = Number(radiusStr);

    // Calculate intermediate values
    const dx = Math.abs(lat_donor - latRef);
    const dy = Math.abs(lon_donor - lonRef);
    const dx_sq = dx * dx;
    const dy_sq = dy * dy;
    const dist_sq = dx_sq + dy_sq;
    const max_distance_sq = BigInt(radius) * BigInt(radius);

    showSection("logs", "📥 INPUT VALUES");
    show("logs", `🏥 Hospital (public): lat_ref=${latRef}, lon_ref=${lonRef}`);
    show("logs", `👤 Donor (private): lat_donor=${lat_donor}, lon_donor=${lon_donor}`);
    show("logs", `📏 Radius (public): ${radius}`);
    show("logs", `📐 Max distance² (public): ${max_distance_sq.toString()}`);
    showDivider("logs");
    
    showSection("logs", "🧮 CALCULATED VALUES");
    show("logs", `dx = |${lat_donor} - ${latRef}| = ${dx}`);
    show("logs", `dy = |${lon_donor} - ${lonRef}| = ${dy}`);
    show("logs", `dx² = ${dx} × ${dx} = ${dx_sq}`);
    show("logs", `dy² = ${dy} × ${dy} = ${dy_sq}`);
    show("logs", `dist² = ${dx_sq} + ${dy_sq} = ${dist_sq}`);
    show("logs", `Check: ${dist_sq} <= ${max_distance_sq.toString()} ? ${dist_sq <= Number(max_distance_sq) ? "✅ YES" : "❌ NO"}`);
    showDivider("logs");

    showSection("logs", "⚙️ CIRCUIT INFO");
    showJson("logs", "Circuit ABI", circuit.abi);
    show("logs", `📦 Circuit bytecode length: ${circuit.bytecode.length} bytes`);
    show("logs", `🔧 Noir version: ${circuit.noir_version}`);
    showDivider("logs");

    const noir = new Noir(circuit);
    const backend = new UltraHonkBackend(circuit.bytecode);

    showSection("logs", "🔄 WITNESS GENERATION");
    show("logs", "Generating witness... ⏳");

    // Inputs must match Noir fn main signature:
    const inputs = {
      lat_ref: latRef,
      lon_ref: lonRef,
      max_distance_sq: max_distance_sq.toString(),
      lat_donor,
      lon_donor,
    };
    
    showJson("logs", "Circuit inputs", inputs);

    const { witness } = await noir.execute(inputs);

    show("logs", `✅ Generated witness (${witness.length} elements)`);
    showJson("logs", "Witness (first 10 elements)", Array.from(witness).slice(0, 10));
    showDivider("logs");

    showSection("logs", "🔐 PROOF GENERATION");
    show("logs", "Generating proof... ⏳");
    const startProof = Date.now();
    const proof = await backend.generateProof(witness);
    const proofTime = Date.now() - startProof;
    show("logs", `✅ Generated proof (${proofTime}ms)`);
    show("logs", `📦 Proof size: ${proof.proof.length} bytes`);
    showJson("results", "Proof object", {
      proofLength: proof.proof.length,
      proofHex: Array.from(proof.proof.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('') + '...',
      publicInputs: proof.publicInputs || "N/A"
    });
    showDivider("logs");

    showSection("logs", "✓ PROOF VERIFICATION");
    show("logs", "Verifying proof... ⌛");
    const startVerify = Date.now();
    const isValid = await backend.verifyProof(proof);
    const verifyTime = Date.now() - startVerify;
    show("logs", `✅ Verification complete (${verifyTime}ms)`);
    showDivider("logs");
    
    showResult("logs", isValid ? "VALID ✅ (inside radius)" : "INVALID ❌ (outside radius)", isValid);
    
    showJson("results", "Verification result", {
      isValid,
      proofTime: `${proofTime}ms`,
      verifyTime: `${verifyTime}ms`,
      totalTime: `${proofTime + verifyTime}ms`
    });
  } catch (err) {
    console.error(err);
    showDivider("logs");
    showSection("logs", "❌ ERROR");
    show("logs", "Error 💔 " + (err?.message || String(err)));
    if (err.stack) {
      showJson("logs", "Stack trace", err.stack);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    submitBtn.className = submitBtn.className.replace("from-gray-600 to-gray-600", "from-purple-600 to-pink-600");
  }
});
