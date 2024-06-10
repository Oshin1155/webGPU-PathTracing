//===========================================================
// frame manager
//===========================================================
export function updateFrame(spp, max) {
	const progress   = spp / max; // [0, 1]
	const percentage = Math.floor(progress * 100);

	document.getElementById('progress-bar').value = progress;
	document.getElementById('progress-bar').innerText = percentage + '%';
}
//===========================================================