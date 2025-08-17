document.addEventListener('DOMContentLoaded', async function() {
    const setupForm = document.getElementById('setupForm');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const shopIdInput = document.getElementById('shopId');
    const saveBtn = document.getElementById('saveBtn');
    const changeShopBtn = document.getElementById('changeShopBtn');
    const stopSoundBtn = document.getElementById('stopSoundBtn');
    const testSoundsBtn = document.getElementById('testSoundsBtn');
    const loading = document.getElementById('loading');
    const status = document.getElementById('status');
    const shopName = document.getElementById('shopName');

    // Check if shop ID is already saved
    const result = await chrome.storage.local.get(['shopId', 'shopName']);
    if (result.shopId) {
        showWelcomeScreen(result.shopName || 'Shop Owner');
    } else {
        showSetupForm();
    }

    // Save shop ID
    saveBtn.addEventListener('click', async function() {
        const shopId = shopIdInput.value.trim();

        if (!shopId) {
            showStatus('Please enter a valid Shop ID', 'error');
            return;
        }

        showLoading(true);

        try {
            // Test the API with the provided shop ID
            const response = await fetch(`https://getshopnotificationcount-snbci4upja-uc.a.run.app?shopid=${shopId}`);
            const data = await response.json();

            if (response.ok && typeof data.count !== 'undefined') {
                // Save shop ID and start the background service
                await chrome.storage.local.set({ 
                    shopId: shopId,
                    shopName: `Shop ${shopId.substring(0, 8)}...` // You can customize this
                });

                // Send message to background script to start monitoring
                chrome.runtime.sendMessage({
                    action: 'startMonitoring',
                    shopId: shopId
                });

                showStatus('Shop ID saved successfully!', 'success');
                setTimeout(() => {
                    showWelcomeScreen(`Shop ${shopId.substring(0, 8)}...`);
                }, 1500);
            } else {
                throw new Error('Invalid Shop ID or API error');
            }
        } catch (error) {
            console.error('Error testing shop ID:', error);
            showStatus('Error: Unable to verify Shop ID. Please check your internet connection and try again.', 'error');
        } finally {
            showLoading(false);
        }
    });

    // Change shop ID
    changeShopBtn.addEventListener('click', function() {
        showSetupForm();
        shopIdInput.value = '';
    });

    // Stop alert sound
    stopSoundBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({
            action: 'stopSound'
        });
        showStatus('Alert sound stopped', 'success');
    });

    // Test sounds
    testSoundsBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({
            action: 'testSounds'
        });
        showStatus('Testing sounds... Listen for notification.mp3 followed by notify.mp3', 'success');
    });

    // Enter key support
    shopIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });

    function showSetupForm() {
        setupForm.classList.remove('hidden');
        welcomeScreen.classList.add('hidden');
        shopIdInput.focus();
    }

    function showWelcomeScreen(name) {
        setupForm.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        shopName.textContent = `Hello ${name}!`;
    }

    function showLoading(show) {
        if (show) {
            loading.style.display = 'flex';
            saveBtn.style.display = 'none';
        } else {
            loading.style.display = 'none';
            saveBtn.style.display = 'inline-block';
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.classList.remove('hidden');

        setTimeout(() => {
            status.classList.add('hidden');
  console.log('Stop sound button clicked');
        }, 4000);
    }
  }, (response) => {
    console.log('Stop sound response:', response);
    if (response && response.success) {
      showStatus('Alert sound stopped', 'success');
    } else {
      showStatus('Failed to stop sound', 'error');
    }
  showStatus('Alert sound stopped', 'success');
});