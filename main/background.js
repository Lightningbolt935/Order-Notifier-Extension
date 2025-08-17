let monitoringInterval = null;
let lastNotificationTime = 0;
let currentOrderCount = 0;
let isLooping = false;
let offscreenCreated = false;
let userStoppedSound = false; // Flag to track if user manually stopped the sound

// Create offscreen document for audio playback
async function createOffscreen() {
    if (offscreenCreated) return;
    
    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play notification sounds for new orders'
        });
        offscreenCreated = true;
        console.log('Offscreen document created');
    } catch (error) {
        console.error('Error creating offscreen document:', error);
    }
}

// Send message to offscreen document
async function sendToOffscreen(message) {
    try {
        if (!offscreenCreated) {
            await createOffscreen();
        }
        
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response);
            });
        });
    } catch (error) {
        console.error('Error sending to offscreen:', error);
        return {success: false, error: error.message};
    }
}

// Play notification sound for new orders
async function playNotificationSound() {
    try {
        console.log('Playing notification sound...');
        await sendToOffscreen({action: 'playNotification'});
        console.log('Notification sound played');
    } catch (error) {
        console.error('Error playing notification:', error);
    }
}

// Start looping notify sound for unattended orders
async function startLoopingNotify() {
    if (isLooping) return;
    
    isLooping = true;
    console.log('Starting looping notification...');
    
    try {
        await sendToOffscreen({action: 'startLoopingNotify'});
    } catch (error) {
        console.error('Error starting looping notify:', error);
        isLooping = false;
    }
}

// Stop looping notification
async function stopLoopingNotify() {
    if (!isLooping) return;
    
    isLooping = false;
    console.log('Stopping looping notification...');
    
    try {
        await sendToOffscreen({action: 'stopLoopingNotify'});
    console.log('Successfully stopped looping notification');
    } catch (error) {
        console.error('Error stopping looping notify:', error);
    }
}

// Check for new orders
async function checkOrders(shopId) {
    try {
        console.log(`Checking orders for shop: ${shopId}`);
        const response = await fetch(`https://getshopnotificationcount-snbci4upja-uc.a.run.app?shopid=${shopId}`);
        const data = await response.json();
        
        console.log(`Order check result: count = ${data.count}`);
        
        const newOrderCount = data.count;
        
        if (newOrderCount > 0) {
            // If this is a new order (count increased or first time detecting orders)
            if (newOrderCount > currentOrderCount) {
                const currentTime = Date.now();
                // Only play initial notification if it's been more than 5 seconds since last notification
                if (currentTime - lastNotificationTime > 5000) {
                    await playNotificationSound();
                    lastNotificationTime = currentTime;
                    console.log(`🔔 NEW ORDERS DETECTED! Count: ${newOrderCount}`);
                }
            }
            
            // Start looping notify sound for unattended orders (only if user hasn't manually stopped it)
            if (!isLooping && !userStoppedSound) {
                await startLoopingNotify();
            }
            
            currentOrderCount = newOrderCount;
        } else {
            // No orders - stop looping sound
            if (isLooping) {
                await stopLoopingNotify();
            }
            // Reset the user stopped flag when there are no orders
            userStoppedSound = false;
            currentOrderCount = 0;
            console.log('✅ No pending orders');
        }
    } catch (error) {
        console.error('❌ Error checking orders:', error);
    }
}

// Start monitoring
async function startMonitoring(shopId) {
    console.log(`🚀 Starting monitoring for shop: ${shopId}`);
    
    // Ensure offscreen document is created
    await createOffscreen();
    
    // Clear any existing interval
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    // Stop any existing loop
    await stopLoopingNotify();
    currentOrderCount = 0;
    userStoppedSound = false; // Reset flag when starting new monitoring
    
    // Initial check
    await checkOrders(shopId);
    
    // Set up interval for every 5 seconds (testing)
    monitoringInterval = setInterval(() => {
        checkOrders(shopId);
    }, 5000);
}

// Stop monitoring
async function stopMonitoring() {
    console.log('🛑 Stopping monitoring');
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
    await stopLoopingNotify();
    currentOrderCount = 0;
    userStoppedSound = false; // Reset flag when stopping monitoring
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Received message:', message);
    
    if (message.action === 'startMonitoring') {
        startMonitoring(message.shopId).then(() => {
            sendResponse({success: true});
        }).catch((error) => {
            console.error('Error starting monitoring:', error);
            sendResponse({success: false, error: error.message});
        });
    } else if (message.action === 'stopMonitoring') {
        stopMonitoring().then(() => {
            sendResponse({success: true});
        }).catch((error) => {
            console.error('Error stopping monitoring:', error);
            sendResponse({success: false, error: error.message});
        });
    } else if (message.action === 'stopSound') {
        console.log('Processing stopSound request');
        userStoppedSound = true; // Set flag to prevent auto-restart
        stopLoopingNotify().then(() => {
            console.log('stopLoopingNotify completed');
            sendResponse({success: true});
        }).catch((error) => {
            console.error('Error stopping sound:', error);
            sendResponse({success: false, error: error.message});
        });
    } else if (message.action === 'testSounds') {
        console.log('🔧 Testing sounds manually...');
        sendToOffscreen({action: 'testSounds'}).then(() => {
            sendResponse({success: true});
        }).catch((error) => {
            console.error('Error testing sounds:', error);
            sendResponse({success: false, error: error.message});
        });
    }
    
    return true; // Keep message channel open
});

// Start monitoring when extension starts (if shop ID is already saved)
chrome.runtime.onStartup.addListener(async () => {
    console.log('🔄 Extension startup');
    await createOffscreen();
    const result = await chrome.storage.local.get(['shopId']);
    if (result.shopId) {
        console.log('Found saved shop ID, starting monitoring...');
        await startMonitoring(result.shopId);
    }
});

// Also start when extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
    console.log('⚡ Extension installed/enabled');
    await createOffscreen();
    const result = await chrome.storage.local.get(['shopId']);
    if (result.shopId) {
        console.log('Found saved shop ID, starting monitoring...');
        await startMonitoring(result.shopId);
    }
});

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔗 Port connected');
});

console.log('🎯 Background script loaded and ready');