document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const snap = document.getElementById('snap');
    const multiSnap = document.getElementById('multi-snap');
    const download = document.getElementById('download');
    const flash = document.getElementById('flash');
    const countdown = document.getElementById('countdown');
    const galleryGrid = document.getElementById('gallery-grid');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const filterRadios = document.getElementsByName('filter');
    const context = canvas.getContext('2d');
    const templateCanvas = document.getElementById('template-canvas');
    const tCtx = templateCanvas.getContext('2d');

    const cameraError = document.getElementById('camera-error');
    const errorDetail = document.getElementById('error-detail');

    let currentFilter = 'none';

    // Access Camera - More Robust
    async function initCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError("Your browser does not support camera access.");
            return;
        }

        try {
            // First try with high res
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });
            handleSuccess(stream);
        } catch (err) {
            console.warn("High-res failed, trying basic...", err);
            try {
                // Fallback to basic
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                handleSuccess(stream);
            } catch (err2) {
                showError(err2.name + ": " + err2.message);
            }
        }
    }

    function handleSuccess(stream) {
        video.srcObject = stream;
        cameraError.style.display = 'none';
        video.style.display = 'block';
        video.play();
    }

    function showError(msg) {
        console.error("Camera Error:", msg);
        cameraError.style.display = 'flex';
        video.style.display = 'none';
        errorDetail.innerText = msg;
    }

    initCamera();

    // Filter Change
    filterRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            video.style.filter = currentFilter === 'none' ? '' : currentFilter;
        });
    });

    // Take Picture with Countdown
    snap.addEventListener('click', () => {
        let count = 3;
        countdown.style.display = 'block';
        countdown.innerText = count;

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                countdown.innerText = count;
            } else {
                clearInterval(timer);
                countdown.style.display = 'none';
                const dataUrl = capturePhoto(true);
                saveToServer(dataUrl);
            }
        }, 1000);
    });

    // Multi-Snap Logic
    multiSnap.addEventListener('click', async () => {
        const capturedPhotos = [];
        const totalPhotos = 4;

        progressContainer.style.display = 'block';
        multiSnap.disabled = true;
        snap.disabled = true;

        for (let i = 0; i < totalPhotos; i++) {
            progressFill.style.width = `${(i / totalPhotos) * 100}%`;
            progressText.innerText = `Preparing for Snapshot ${i + 1} of ${totalPhotos}...`;

            // Wait for countdown
            await new Promise(resolve => {
                let count = 3;
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

            // Capture
            const photo = capturePhoto(false);
            capturedPhotos.push(photo);
        }

        progressFill.style.width = '100%';
        progressText.innerText = 'Creating your masterpiece...';

        const compositeDataUrl = await createTemplate(capturedPhotos);
        saveToServer(compositeDataUrl);
        addToGallery(compositeDataUrl);

        // Reset UI
        setTimeout(() => {
            progressContainer.style.display = 'none';
            multiSnap.disabled = false;
            snap.disabled = false;
        }, 2000);
    });

    function capturePhoto(shouldSave) {
        // Flash Effect
        flash.classList.add('animate');
        setTimeout(() => {
            flash.classList.remove('animate');
        }, 500);

        // Draw video frame to canvas
        context.filter = currentFilter === 'none' ? 'none' : currentFilter;
        context.drawImage(video, 0, 0, 640, 480);

        const imageData = canvas.toDataURL("image/png");

        if (shouldSave) {
            addToGallery(imageData);
            enableDownload(imageData);
        }

        return imageData;
    }

    async function createTemplate(photos) {
        // Clear template
        tCtx.fillStyle = '#ffffff';
        tCtx.fillRect(0, 0, templateCanvas.width, templateCanvas.height);

        // Load all photos
        const loadedImages = await Promise.all(photos.map(src => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = src;
            });
        }));

        // Layout: 4 photos vertically + Footer
        const margin = 40;
        const imgWidth = 800 - (margin * 2);
        const imgHeight = (imgWidth * 3) / 4; // 4:3 aspect ratio

        loadedImages.forEach((img, index) => {
            const y = margin + (index * (imgHeight + 20));
            tCtx.drawImage(img, margin, y, imgWidth, imgHeight);
        });

        // Add Text Footer
        tCtx.fillStyle = '#1a1a2e';
        tCtx.font = 'bold 40px Outfit';
        tCtx.textAlign = 'center';
        tCtx.fillText('GLOWBOOTH MEMORIES', 400, 1100);

        const date = new Date().toLocaleDateString();
        tCtx.font = '30px Outfit';
        tCtx.fillText(date, 400, 1150);

        const dataUrl = templateCanvas.toDataURL("image/png");
        enableDownload(dataUrl);
        return dataUrl;
    }

    function enableDownload(dataUrl) {
        download.disabled = false;
        download.onclick = () => {
            const link = document.createElement('a');
            link.download = `glowbooth-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        };
    }

    function addToGallery(dataUrl) {
        const item = document.createElement('div');
        item.classList.add('gallery-item');
        const img = document.createElement('img');
        img.src = dataUrl;
        item.appendChild(img);

        // Add to the beginning of the grid
        if (galleryGrid.firstChild) {
            galleryGrid.insertBefore(item, galleryGrid.firstChild);
        } else {
            galleryGrid.appendChild(item);
        }
    }

    function saveToServer(imageData) {
        fetch('/api/photo/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageData: imageData })
        })
            .then(response => {
                if (response.ok) {
                    return response.text();
                }
                throw new Error('Network response was not ok.');
            })
            .then(filePath => {
                console.log('Saved photo at:', filePath);
            })
            .catch(error => {
                console.error('Save error:', error);
            });
    }
});
