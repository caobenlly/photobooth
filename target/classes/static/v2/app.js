document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Screens
    const startScreen = document.getElementById('start-screen');
    const boothScreen = document.getElementById('booth-screen');
    const templateScreen = document.getElementById('template-screen');

    // Buttons
    const btnStartProcess = document.getElementById('btn-start-process');
    const btnDownloadStrip = document.getElementById('btn-download-strip');
    const btnRetake = document.getElementById('btn-retake');
    const btnPrintStrip = document.getElementById('btn-print-strip');
    const btnPrintModal = document.getElementById('btn-print-modal');
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
    const BEAUTY_FILTER = 'brightness(1.08) contrast(0.9) saturate(1.1) blur(0.5px)';
    let currentFilter = 'none';
    let currentPhotos = [];
    let currentFrameColor = '#ffffff';
    let currentLayout = 'vertical-strip'; // 'vertical-strip', 'horizontal-grid', 'portrait-grid'
    let isCapturing = false;
    let selectedIndices = [];

    function getCombinedFilter() {
        return currentFilter === 'none' ? BEAUTY_FILTER : `${BEAUTY_FILTER} ${currentFilter}`;
    }

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
        showScreen('layout-screen');
    };

    const btnConfirmLayout = document.getElementById('btn-confirm-layout');
    if(btnConfirmLayout) {
        btnConfirmLayout.onclick = () => {
            currentPhotos = [];
            const liveContainer = document.getElementById('live-preview-container');
            if(liveContainer) liveContainer.style.display = 'none'; // Hide initially
            updateSnapButtonLabel();
            showScreen('booth-screen');
        };
    }

    btnRetake.onclick = () => {
        currentPhotos = [];
        updateLivePreview();
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
        let foundCanon = false;
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            let label = device.label || `Camera ${index + 1}`;
            option.text = label;

            logToUI(`Phát hiện: ${label}`);

            // Auto-select Canon if detected
            if (label.toLowerCase().includes('eos') || label.toLowerCase().includes('canon')) {
                logToUI("<span style='color:#00ff00; font-weight:bold;'>✅ Đã tìm thấy máy Canon!</span>");
                option.selected = true;
                foundCanon = true;
            }

            videoSelect.appendChild(option);
        });

        if (!foundCanon && videoDevices.length > 0) {
            logToUI("<span style='color:#ff4d00; font-weight:bold;'>⚠️ CẢNH BÁO: Không tìm thấy driver EOS Webcam Utility.</span>");
            logToUI("<span style='color:#888; font-size:0.8rem;'>Bạn cần cài phần mềm 'EOS Webcam Utility' (bản 1.1 hoặc 2.0) của Canon để trình duyệt nhận diện được máy ảnh.</span>");
        }
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
                errorMsg = `<div style='color:red; margin-bottom:5px; font-weight:bold;'>⚠️ MÁY ẢNH ĐANG BẬN!</div>
                            <div style='font-size:0.85rem; color:#444; background:#fff9e6; padding:8px; border-radius:8px; border:1px solid #ffeeba;'>
                                1. Tìm cửa sổ <b>Remote Live View</b> của Canon trên màn hình.<br>
                                2. <b>TẮT</b> cửa sổ đó đi (Nhấn X).<br>
                                3. Sau đó nhấn <b>"Quét lại"</b> ở phía trên.
                            </div>`;
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
            video.style.filter = getCombinedFilter();
        });
    });

    // Initial filter apply
    video.style.filter = getCombinedFilter();

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
            context.filter = getCombinedFilter();
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
        
        // Show empty template frame immediately when capture starts
        await updateLivePreview();

        multiSnap.disabled = true;
        if (snap8) snap8.disabled = true;

        for (let i = 0; i < total; i++) {
            progressFill.style.width = `${(i / total) * 100}%`;
            progressText.innerText = `Chuẩn bị chụp ảnh ${i + 1}/${total}...`;
            await runCountdown(total === 8 ? 5 : 3);
            const img = await captureOne();
            if (img) {
                currentPhotos.push(img);
                await updateLivePreview();
            }
            else {
                // Mock for DSLR
                currentPhotos.push("https://placehold.co/640x480?text=DSLR+Photo+" + (i + 1));
                logToUI(`Chụp DSLR tấm ${i + 1}. Đang chờ file...`);
                await updateLivePreview();
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
    if (snap8) snap8.onclick = () => handleMultiSnap(6);

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
            await runCountdown(5);
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

    // --- TEMPLATE STUDIO & LIVE PREVIEW ---
    async function renderStripe() {
        await renderLayout(templateCanvas, tCtx);
    }

    async function updateLivePreview() {
        const liveCanvas = document.getElementById('live-preview-canvas');
        const container = document.getElementById('live-preview-container');
        if (liveCanvas && container) {
            container.style.display = 'flex';
            const lCtx = liveCanvas.getContext('2d');
            await renderLayout(liveCanvas, lCtx);
        }
    }

    async function renderLayout(targetCanvas, targetCtx) {
        // Safe check for currentLayout initialization
        if (!currentLayout) currentLayout = 'vertical-strip';

        // Fake photo count constraints logic just for layout dimensions if empty
        const fakeLength = 4; // ALWAYS assume 4 slots for dimension calculation here
        
        // Settings based on layout
        let stripWidth, stripHeight, margin, spacingX, spacingY, photoW, photoH;
        let is2Col = false;

        // Default constraints for vertical strip
        stripWidth = 400;
        stripHeight = 1200;
        margin = 35;
        spacingX = 25;
        spacingY = 20;

        // 4 photos - Layout choices
        if (currentLayout === 'vertical-strip') {
            photoW = (stripWidth - (margin * 2));
            photoH = 245;
        } else if (currentLayout === 'horizontal-grid') {
            is2Col = true;
            stripWidth = 1200;
            stripHeight = 840;
            margin = 40;
            spacingX = 20;
            spacingY = 20;
            
            // Space for title on the right
            const titleSpaceX = 300; 
            photoW = ((stripWidth - titleSpaceX) - (margin * 2) - spacingX) / 2;
            photoH = (stripHeight - (margin * 2) - spacingY) / 2;
        } else if (currentLayout === 'horizontal-2') {
            is2Col = false; // Vertical stack of horizontal photos
            stripWidth = 800;
            stripHeight = 1200;
            margin = 50;
            spacingX = 0;
            spacingY = 40;

            const titleSpaceY = 300;
            photoW = stripWidth - (margin * 2);
            photoH = (stripHeight - titleSpaceY - (margin * 2) - spacingY) / 2;
        } else if (currentLayout === 'portrait-grid') {
            is2Col = true;
            stripWidth = 840;
            stripHeight = 1200;
            margin = 40;
            spacingX = 20;
            spacingY = 20;

            // Title space at bottom
            const titleSpaceY = 250;
            photoW = (stripWidth - (margin * 2) - spacingX) / 2;
            photoH = (stripHeight - titleSpaceY - (margin * 2) - spacingY) / 2;
        }

        targetCanvas.width = stripWidth;
        targetCanvas.height = stripHeight;

        // Draw Frame Background
        targetCtx.fillStyle = currentFrameColor;
        targetCtx.fillRect(0, 0, stripWidth, stripHeight);

        // Calculate and Draw photo slots
        const slotBorderColor = (currentFrameColor === '#ffffff' || currentFrameColor === '#f8ccd4' || currentFrameColor === '#f8e9d4') ? '#e0e0e0' : 'rgba(255,255,255,0.2)';
        const totalSlots = 4;
        
        const photoCoordinates = []; // Precalculate where to draw

        for (let i = 0; i < totalSlots; i++) {
            let sx, sy;
            if (is2Col) {
                const col = i % 2;
                const row = Math.floor(i / 2);
                sx = margin + col * (photoW + spacingX);
                sy = margin + row * (photoH + spacingY);
            } else {
                sx = margin;
                sy = margin + i * (photoH + spacingY);
            }
            photoCoordinates.push({x: sx, y: sy});
            
            // Draw empty slot border
            targetCtx.strokeStyle = slotBorderColor;
            targetCtx.lineWidth = 2;
            targetCtx.strokeRect(sx, sy, photoW, photoH);
        }

        // Load and Draw Photos
        for (let i = 0; i < currentPhotos.length; i++) {
            const img = new Image();
            await new Promise(r => {
                img.onload = r;
                img.onerror = r;
                img.src = currentPhotos[i];
            });

            const coords = photoCoordinates[i];
            if(coords) {
                targetCtx.drawImage(img, coords.x, coords.y, photoW, photoH);
            }
        }

        // Footer / Title
        targetCtx.fillStyle = (currentFrameColor === '#ffffff' || currentFrameColor === '#f8ccd4' || currentFrameColor === '#f8e9d4') ? '#4a4a4a' : '#ffffff';
        
        if (currentLayout === 'horizontal-grid') {
            // Horizontal grid: title on the right side space
            targetCtx.textAlign = 'center';
            targetCtx.font = 'bold 48px Outfit';
            const textX = stripWidth - 150; 
            const textY = stripHeight / 2 - 20;
            targetCtx.fillText('TINII', textX, textY);
            targetCtx.fillText('BOOTH', textX, textY + 55);
            
            targetCtx.font = '22px Outfit';
            targetCtx.fillText(new Date().toLocaleDateString(), textX, textY + 110);
            targetCtx.fillText('MEMORIES', textX, textY + 140);
        } else if (currentLayout === 'horizontal-2') {
            // Horizontal 2: title at the bottom space
            targetCtx.textAlign = 'center';
            targetCtx.font = 'bold 54px Outfit';
            const textX = stripWidth / 2;
            const textY = stripHeight - 180;
            targetCtx.fillText('TINIIBOOTH', textX, textY);
            
            targetCtx.font = '24px Outfit';
            targetCtx.fillText(new Date().toLocaleDateString() + ' - MEMORIES', textX, textY + 55);
        } else if (currentLayout === 'portrait-grid') {
            // Portrait grid layout title at bottom
            targetCtx.textAlign = 'center';
            targetCtx.font = 'bold 48px Outfit';
            targetCtx.fillText('TINIIBOOTH', stripWidth / 2, stripHeight - 120);
            targetCtx.font = '24px Outfit';
            targetCtx.fillText(new Date().toLocaleDateString() + ' - MEMORIES', stripWidth / 2, stripHeight - 70);
        } else {
            // Vertical strip title at bottom
            targetCtx.font = 'bold 32px Outfit';
            targetCtx.textAlign = 'center';
            targetCtx.fillText('TINIIBOOTH', stripWidth / 2, stripHeight - 70);
            targetCtx.font = '20px Outfit';
            targetCtx.fillText(new Date().toLocaleDateString() + ' - MEMORIES', stripWidth / 2, stripHeight - 35);
        }
    }

    // Frame Layout Selection
    const layoutBtns = document.querySelectorAll('.layout-btn');
    layoutBtns.forEach(btn => {
        btn.onclick = () => {
            layoutBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLayout = btn.getAttribute('data-layout');
            // If we're changing layout on the layout-screen, don't redraw the final stripe until later
        };
    });

    frameColorBtns.forEach(btn => {
        btn.onclick = () => {
            frameColorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFrameColor = btn.getAttribute('data-color');
            renderStripe();
        };
    });

    /*
    btnDownloadStrip.onclick = () => {
        const link = document.createElement('a');
        link.download = `tiniibooth-strip-${Date.now()}.png`;
        link.href = templateCanvas.toDataURL("image/png");
        link.click();
    };
    */

    async function printPhoto(filename) {
        logToUI(`Đang gửi lệnh in cho: ${filename}...`);
        try {
            const response = await fetch(`/api/photo/print/${filename}`, { method: 'POST' });
            if (response.ok) {
                logToUI("<span style='color:#00ff00'>Đã gửi lệnh in thành công!</span>");
                alert("Đã gửi lệnh in! Vui lòng kiểm tra máy in.");
            } else {
                const error = await response.text();
                logToUI(`<span style='color:red'>Lỗi in: ${error}</span>`);
                alert("Lỗi in: " + error);
            }
        } catch (e) {
            logToUI(`<span style='color:red'>Lỗi kết nối máy in: ${e.message}</span>`);
        }
    }

    if (btnPrintStrip) {
        btnPrintStrip.onclick = async () => {
            // To print the strip, we first need to save it as a file
            const dataUrl = templateCanvas.toDataURL("image/png");
            logToUI("Đang chuẩn bị ảnh để in...");

            try {
                const saveRes = await fetch('/api/photo/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageData: dataUrl })
                });

                if (saveRes.ok) {
                    const filePath = await saveRes.text(); // Returns "/assets/photos/uuid.png"
                    const filename = filePath.split('/').pop();
                    await printPhoto(filename);
                }
            } catch (e) {
                logToUI(`<span style='color:red'>Lỗi chuẩn bị in: ${e.message}</span>`);
            }
        };
    }

    if (btnPrintModal) {
        btnPrintModal.onclick = () => {
            const imgSrc = document.getElementById('modal-img').src;
            if (imgSrc.includes('/api/photo/view-dslr/')) {
                const filename = imgSrc.split('/').pop();
                printPhoto(filename);
            } else {
                alert("Chỉ hỗ trợ in ảnh từ DSLR trong chế độ xem trước.");
            }
        };
    }

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
