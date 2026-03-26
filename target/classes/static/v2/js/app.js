document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Screens
    const startScreen = document.getElementById('start-screen');
    const boothScreen = document.getElementById('booth-screen');
    const templateScreen = document.getElementById('template-screen');

    // Buttons
    const btnStartProcess = document.getElementById('btn-start-process');
    const btnDownloadStrip = document.getElementById('btn-download-strip');
    const btnRetake = document.getElementById('btn-retake');
    const snap8 = document.getElementById('snap-8');
    const btnConfirmRetake = document.getElementById('btn-confirm-retake');
    const btnSkipRetake = document.getElementById('btn-skip-retake');
    const selectionGrid = document.getElementById('selection-grid');

    // Booth Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const snap = document.getElementById('snap');
    const multiSnap = document.getElementById('multi-snap');
    const flash = document.getElementById('flash');
    const countdown = document.getElementById('countdown');
    const galleryGrid = document.getElementById('gallery-grid');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const filterRadios = document.getElementsByName('filter');
    const context = canvas.getContext('2d');

    // Studio Elements
    const templateCanvas = document.getElementById('template-canvas');
    const tCtx = templateCanvas.getContext('2d');
    const frameColorBtns = document.querySelectorAll('.color-btn');

    // State
    let currentFilter = 'none';
    let currentPhotos = [];
    let currentFrameColor = '#ffffff';
    let isCapturing = false;
    let selectedIndices = [];

    // Camera Support Logic
    const videoSelect = document.getElementById('videoSource');
    const refreshBtn = document.getElementById('refresh-cameras');
    const miniLog = document.getElementById('mini-log');

    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');

        // Hide gallery on template/selection screens to focus
        const gallery = document.getElementById('gallery-container');
        const isFocusScreen = (id === 'template-screen' || id === 'selection-screen');
        if (gallery) gallery.style.display = isFocusScreen ? 'none' : 'block';
    }

    function logToUI(msg) {
        if (!miniLog) return;
        const time = new Date().toLocaleTimeString().split(' ')[0];
        miniLog.innerHTML += `<div>[${time}] ${msg}</div>`;
        miniLog.scrollTop = miniLog.scrollHeight;
    }

    // --- SCREEN NAVIGATION ---
    btnStartProcess.onclick = () => {
        showScreen('booth-screen');
    };

    btnRetake.onclick = () => {
        currentPhotos = [];
        showScreen('booth-screen');
    };

    // --- CAMERA LOGIC ---
    async function getDevices() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    }

    async function populateCameraList() {
        const videoDevices = await getDevices();
        videoSelect.innerHTML = '';
        if (videoDevices.length === 0) {
            logToUI("<span style='color:#ff4d00'>Không tìm thấy Camera! Hãy kiểm tra kết nối USB.</span>");
        }
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            let label = device.label || `Camera ${index + 1}`;
            option.text = label;

            logToUI(`Phát hiện: ${label}`);

            // Auto-select Canon if detected
            if (label.toLowerCase().includes('eos') || label.toLowerCase().includes('canon')) {
                logToUI("<span style='color:#00ff00'>Đã tìm thấy máy Canon!</span>");
                option.selected = true;
            }

            videoSelect.appendChild(option);
        });
        return videoSelect.value;
    }

    async function initCamera(selectedDeviceId, retryCount = 0) {
        if (!navigator.mediaDevices?.getUserMedia) return;

        logToUI(`Đang kiểm tra kết nối Camera (Lần ${retryCount + 1})...`);

        if (!selectedDeviceId) {
            selectedDeviceId = videoSelect.value;
        }

        if (!selectedDeviceId) {
            logToUI("Đang chờ bạn chọn Camera từ danh sách...");
            return;
        }

        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { width: 1280, height: 720 }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            document.getElementById('camera-error').style.display = 'none';
            video.play();

            const dslrOverlay = document.getElementById('dslr-status-overlay');
            if (dslrOverlay) dslrOverlay.style.display = 'none';
            logToUI("<span style='color:#00ff00'>Kết nối Camera thành công!</span>");

            // Update Start Screen status
            const loadStatus = document.getElementById('camera-load-status');
            if (loadStatus) {
                loadStatus.innerHTML = "<span style='color:#00ff00; font-weight:bold;'>✓ Camera đã sẵn sàng!</span>";
            }
        } catch (err) {
            console.error("Connection error:", err);
            let errorMsg = `<span style='color:red'>Lỗi: ${err.name} - ${err.message}</span>`;

            if (err.name === 'NotReadableError') {
                errorMsg = `<span style='color:red'>Lỗi: Máy ảnh đang bị ứng dụng khác chiếm (VD: Canon EOS Utility). Hãy tắt cửa sổ Remote Live View và thử lại.</span>`;
            }
            logToUI(errorMsg);

            if (retryCount < 5) {
                logToUI("Thử lại trong 2 giây...");
                const loadStatus = document.getElementById('camera-load-status');
                if (loadStatus) loadStatus.innerText = `Đang kết nối Camera (Lần ${retryCount + 1})...`;
                setTimeout(() => initCamera(selectedDeviceId, retryCount + 1), 2000);
            } else {
                console.warn("Webcam failed after retries, showing DSLR mode", err);
                document.getElementById('dslr-status-overlay').style.display = 'flex';
                logToUI("<span style='color:#ffcc00'>Không thấy Webcam. Chuyển sang chế độ DSLR (Manual).</span>");
                const loadStatus = document.getElementById('camera-load-status');
                if (loadStatus) loadStatus.innerHTML = "<span style='color:#ffcc00;'>! Chuyển sang chế độ DSLR (Manual)</span>";
            }
        }
    }

    videoSelect.onchange = () => initCamera(videoSelect.value);
    refreshBtn.onclick = () => populateCameraList().then(id => initCamera(id));

    // --- CAPTURE LOGIC ---
    filterRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            video.style.filter = currentFilter === 'none' ? '' : currentFilter;
        });
    });

    async function runCountdown(seconds = 3) {
        return new Promise(resolve => {
            let count = seconds;
            countdown.style.display = 'block';
            countdown.innerText = count;
            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    countdown.innerText = count;
                } else {
                    clearInterval(timer);
                    countdown.style.display = 'none';
                    resolve();
                }
            }, 1000);
        });
    }

    async function captureOne() {
        flash.style.opacity = '1';
        setTimeout(() => { flash.style.opacity = '0'; }, 100);

        const dslrOverlay = document.getElementById('dslr-status-overlay');
        const isDslrMode = dslrOverlay && dslrOverlay.style.display !== 'none';

        if (isDslrMode) {
            logToUI("Triggering DSLR...");
            await fetch('/api/photo/trigger-dslr', { method: 'POST' });
            // For DSLR, we wait for the polling to catch the file
            // In a multi-snap flow, this is trickier. Let's assume webcam for now for full logic.
            return null;
        } else {
            context.filter = currentFilter === 'none' ? 'none' : currentFilter;
            context.drawImage(video, 0, 0, 640, 480);
            return canvas.toDataURL("image/png");
        }
    }

    snap.onclick = async () => {
        await runCountdown();
        const img = await captureOne();
        if (img) {
            addToGallery(img);
            saveToServer(img);
        }
    };

    async function handleMultiSnap(total) {
        if (isCapturing) return;
        isCapturing = true;
        currentPhotos = [];
        progressContainer.style.display = 'block';
        multiSnap.disabled = true;
        if (snap8) snap8.disabled = true;

        for (let i = 0; i < total; i++) {
            progressFill.style.width = `${(i / total) * 100}%`;
            progressText.innerText = `Chuẩn bị chụp ảnh ${i + 1}/${total}...`;
            await runCountdown(total === 8 ? 10 : 3);
            const img = await captureOne();
            if (img) currentPhotos.push(img);
            else {
                // Mock for DSLR
                currentPhotos.push("https://placehold.co/640x480?text=DSLR+Photo+" + (i + 1));
                logToUI(`Chụp DSLR tấm ${i + 1}. Đang chờ file...`);
            }
        }

        progressContainer.style.display = 'none';
        multiSnap.disabled = false;
        if (snap8) snap8.disabled = false;
        isCapturing = false;

        if (total === 8) {
            showSelectionScreen();
        } else {
            renderStripe();
            showScreen('template-screen');
        }
    }

    multiSnap.onclick = () => handleMultiSnap(4);
    if (snap8) snap8.onclick = () => handleMultiSnap(8);

    // --- SELECTION & RETAKE ---
    function showSelectionScreen() {
        selectionGrid.innerHTML = '';
        selectedIndices = [];

        currentPhotos.forEach((src, index) => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.innerHTML = `
                <img src="${src}">
                <div class="selection-badge">${index + 1}</div>
            `;
            item.onclick = () => {
                if (item.classList.contains('selected')) {
                    item.classList.remove('selected');
                    selectedIndices = selectedIndices.filter(i => i !== index);
                } else {
                    if (selectedIndices.length < 4) {
                        item.classList.add('selected');
                        selectedIndices.push(index);
                    } else {
                        alert("Bạn chỉ được chọn tối đa 4 tấm để chụp lại!");
                    }
                }
            };
            selectionGrid.appendChild(item);
        });
        showScreen('selection-screen');
    }

    btnConfirmRetake.onclick = async () => {
        if (selectedIndices.length === 0) {
            btnSkipRetake.click();
            return;
        }

        showScreen('booth-screen');
        progressContainer.style.display = 'block';

        for (let i = 0; i < selectedIndices.length; i++) {
            const idx = selectedIndices[i];
            progressText.innerText = `Chụp lại tấm số ${idx + 1} (${i + 1}/${selectedIndices.length})...`;
            await runCountdown(10);
            const img = await captureOne();
            if (img) currentPhotos[idx] = img;
        }

        progressContainer.style.display = 'none';
        renderStripe();
        showScreen('template-screen');
    };

    btnSkipRetake.onclick = () => {
        renderStripe();
        showScreen('template-screen');
    };

    // --- TEMPLATE STUDIO ---
    async function renderStripe() {
        const is8 = currentPhotos.length === 8;
        const stripWidth = is8 ? 800 : 400;
        const stripHeight = 1200;
        const margin = 35;
        const spacingX = 25;
        const spacingY = 20;

        templateCanvas.width = stripWidth;
        templateCanvas.height = stripHeight;

        const photoW = (stripWidth - (margin * 2) - (is8 ? spacingX : 0)) / (is8 ? 2 : 1);
        const photoH = 245; // Fixed height to ensure footer room

        // Draw Frame
        tCtx.fillStyle = currentFrameColor;
        tCtx.fillRect(0, 0, stripWidth, stripHeight);

        // Load and Draw Photos
        for (let i = 0; i < currentPhotos.length; i++) {
            const img = new Image();
            await new Promise(r => {
                img.onload = r;
                img.src = currentPhotos[i];
            });

            let x, y;
            if (is8) {
                // 2 columns
                const col = i % 2;
                const row = Math.floor(i / 2);
                x = margin + col * (photoW + spacingX);
                y = margin + row * (photoH + spacingY);
            } else {
                // 1 column
                x = margin;
                y = margin + i * (photoH + spacingY);
            }

            tCtx.drawImage(img, x, y, photoW, photoH);
        }

        // Footer
        tCtx.fillStyle = (currentFrameColor === '#ffffff' || currentFrameColor === '#f8ccd4' || currentFrameColor === '#f8e9d4') ? '#4a4a4a' : '#ffffff';
        tCtx.font = 'bold 32px Outfit';
        tCtx.textAlign = 'center';
        tCtx.fillText('TINIIBOOTH', stripWidth / 2, stripHeight - 70);

        tCtx.font = '20px Outfit';
        tCtx.fillText(new Date().toLocaleDateString() + ' - MEMORIES', stripWidth / 2, stripHeight - 35);
    }

    frameColorBtns.forEach(btn => {
        btn.onclick = () => {
            frameColorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFrameColor = btn.getAttribute('data-color');
            renderStripe();
        };
    });

    btnDownloadStrip.onclick = () => {
        const link = document.createElement('a');
        link.download = `tiniibooth-strip-${Date.now()}.png`;
        link.href = templateCanvas.toDataURL("image/png");
        link.click();
    };

    // --- UTILS ---
    function addToGallery(dataUrl) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${dataUrl}" style="width:100%">`;
        galleryGrid.prepend(item);
    }

    function saveToServer(imageData) {
        fetch('/api/photo/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: imageData })
        });
    }

    // DSLR Polling (Keep existing logic for single shots)
    let lastDslrPhoto = null;
    setInterval(async () => {
        try {
            const response = await fetch('/api/photo/latest-dslr');
            if (response.ok) {
                const fileName = await response.text();
                if (fileName !== lastDslrPhoto) {
                    lastDslrPhoto = fileName;
                    const url = `/api/photo/view-dslr/${fileName}`;
                    addToGallery(url);
                    // If we are in multi-snap DSLR mode, we could add to currentPhotos here
                    if (isCapturing && currentPhotos.length < 8) {
                        currentPhotos.push(url);
                    }
                }
            }
        } catch (e) { }
    }, 1500);

    // Config fetch
    fetch('/api/photo/config').then(r => r.json()).then(config => {
        document.getElementById('header-folder').innerText = config.dslrFolder;
    }).catch(() => { });

    // --- INITIALIZE CAMERA ON LOAD ---
    // Start by listing all available devices
    populateCameraList().then(() => {
        // Wait 1s and then start background init to pre-warm the Canon/Webcam driver
        setTimeout(() => initCamera(), 1000);
    });
});
