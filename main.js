let currentLang = 'ja';
const langSelect = document.getElementById('langSelect');
langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    updateUILabels();
    renderList(searchInput.value.trim());
});

const uiText = {
    'autoPlayClear': {
        ja: '送信後クリア',
        zh: '送出後清空',
        en: 'Clear On Send'
    },
    'strictMatch': {
        ja: '完全一致のみ',
        zh: '精確比對',
        en: 'Strict Match'
    },
    volume: {
        ja: 'ボリューム',
        zh: '音量',
        en: 'Volume'
    },
    searchPlaceholder: {
        ja: 'キーやキーワードで検索... Enterで再生',
        zh: '以關鍵字或 key 搜尋... Enter 播放',
        en: 'Search by key or keyword... Press Enter to play'
    },
    mainTitle: {
        ja: 'まめくろ・Saysoundボード',
        zh: 'MameKuro Saysound 面板',
        en: 'Mamekuro Saysound Soundboard'
    },
    disclaimer: {
        ja: '音声の著作権は保有しておらず、二次創作支援を目的としています。',
        zh: '不擁有音效版權，僅為二次創作提供服務。',
        en: 'We do not own the sound copyrights. This is a fan-made project.'
    }
};
function updateUILabels() {
    document.getElementById('labelAutoPlayClear').textContent = uiText.autoPlayClear[currentLang];
    document.getElementById('labelStrictMatch').textContent = uiText.strictMatch[currentLang];
    document.getElementById('labelVolume').childNodes[0].textContent = uiText.volume[currentLang] + ': ';
    document.getElementById('searchInput').placeholder = uiText.searchPlaceholder[currentLang];
    document.getElementById('mainTitle').textContent = uiText.mainTitle[currentLang];
    document.getElementById('disclaimerText').textContent = uiText.disclaimer[currentLang];
}


const searchInput = document.getElementById('searchInput');
const soundList = document.getElementById('soundList');
const autoPlayClear = document.getElementById('autoPlayClear');
const notifications = document.getElementById('notifications');

let soundData = {};
let lastRenderedResults = [];

let globalVolumeMultiplier = 1.0;
const volumeBoostSlider = document.getElementById('volumeBoostSlider');
globalVolumeMultiplier = parseInt(volumeBoostSlider.value) / 100.0; // 初始值為 50%
const volumeBoostLabel = document.getElementById('volumeBoostLabel');

volumeBoostSlider.addEventListener('input', () => {
    const val = parseInt(volumeBoostSlider.value);
    globalVolumeMultiplier = val / 100.0;
    volumeBoostLabel.textContent = `${val}%`;
});

const strictMatch = document.getElementById('strictMatch');



fetch('saysound_data.json')
    .then(res => res.json())
    .then(data => {
        soundData = data;
        updateUILabels();
        renderList();
    });

function resolveEntry(key) {
    const visited = new Set();
    while (soundData[key]?.referTo) {
        if (visited.has(key)) return null;
        visited.add(key);
        key = soundData[key].referTo;
    }
    return soundData[key] ? { key, ...soundData[key] } : null;
}

function renderList(filter = '') {
    soundList.innerHTML = '';
    const keyword = filter.trim();

    lastRenderedResults = Object.entries(soundData)
        .filter(([k, v]) => !v.referTo)
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => {
            const aExact = a.key === keyword ? -1 : 0;
            const bExact = b.key === keyword ? -1 : 0;
            return aExact - bExact;
        })
        .filter(entry =>
            entry.key.includes(keyword) ||
            Object.values(entry).some(val => typeof val === 'string' && val.includes(keyword))
        );

    lastRenderedResults.forEach(({ key, ja, zh, en }) => {
        const card = document.createElement('div');
        card.className = 'col-md-4 sound-card';
        const label = { zh, ja, en }[currentLang] || ja || zh || en || '';
        card.innerHTML = `<strong>${key}</strong><br><span>${label}</span>`;

        card.onclick = () => playSound(key);
        soundList.appendChild(card);
    });
}


function playSound(key) {
    const entry = resolveEntry(key);
    if (!entry) return;

    const actualVolume = Math.min(entry.volume * globalVolumeMultiplier, 1.0);

    const wrapper = document.createElement('div');
    wrapper.className = 'audio-popup';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close btn-close-white float-end';
    closeBtn.style.marginLeft = '8px';

    const label = document.createElement('div');
    label.innerHTML = `<strong>${key}</strong>`;
    label.appendChild(closeBtn);

    const control = document.createElement('audio');
    control.controls = true;
    control.src = `sounds/${entry.path}.vsnd_c`;
    control.volume = actualVolume;

    wrapper.appendChild(label);
    wrapper.appendChild(control);
    notifications.appendChild(wrapper);

    // ✅ 播放主體改為 control（用它的 API 播）
    control.play();

    closeBtn.onclick = () => {
        control.pause();
        control.currentTime = 0;
        wrapper.remove();
    };

    control.addEventListener('error', () => {
        wrapper.remove();
        console.warn(`Audio load failed: sounds/${entry.path}.vsnd_c`);
        label.innerHTML += `<div class="text-danger">*Error*</div>`;
    });

    control.addEventListener('ended', () => wrapper.remove());
}



searchInput.addEventListener('input', () => renderList(searchInput.value.trim()));
searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const filter = searchInput.value.trim();
        let match;

        if (strictMatch.checked) {
            match = Object.entries(soundData)
                .filter(([k, v]) => !v.referTo)
                .find(([k]) => k === filter);
        } else {
            match = lastRenderedResults.length > 0 ? [lastRenderedResults[0].key] : null;
        }

        if (match) playSound(match[0]);
        if (autoPlayClear.checked) searchInput.value = '';
    }
});