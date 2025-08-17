let isLoopingAudio = false;
let notificationAudio = null;
let notifyAudio = null;

// Initialize audio elements
document.addEventListener('DOMContentLoaded', () => {
    notificationAudio = document.getElementById('notificationSound');
    notifyAudio = document.getElementById('notifySound');
    
    // Set volume levels
    if (notificationAudio) {
        notificationAudio.volume = 0.7;
    }
    if (notifyAudio) {
        notifyAudio.volume = 0.5;
    }
    
    console.log('Offscreen audio initialized');
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Offscreen received message:', message);
    
    switch (message.action) {
        case 'playNotification':
            playNotificationSound();
            sendResponse({success: true});
            break;
            
        case 'startLoopingNotify':
            startLoopingNotify();
            sendResponse({success: true});
            break;
            
        case 'stopLoopingNotify':
            stopLoopingNotify();
            sendResponse({success: true});
            break;
            
        case 'testSounds':
            testSounds();
            sendResponse({success: true});
            break;
            
        default:
            sendResponse({success: false, error: 'Unknown action'});
    }
    
    return true;
});

// Play notification sound for new orders
async function playNotificationSound() {
    try {
        if (notificationAudio) {
            notificationAudio.currentTime = 0; // Reset to beginning
            await notificationAudio.play();
            console.log('Notification sound played');
        }
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Start looping notify sound for unattended orders
async function startLoopingNotify() {
    if (isLoopingAudio) return;
    
    try {
        isLoopingAudio = true;
        if (notifyAudio) {
            notifyAudio.currentTime = 0; // Reset to beginning
            await notifyAudio.play();
            console.log('Started looping notify sound');
        }
    } catch (error) {
        console.error('Error starting looping notify:', error);
        isLoopingAudio = false;
    }
}

// Stop looping notify sound
function stopLoopingNotify() {
  console.log('stopLoopingNotify called, isLoopingAudio:', isLoopingAudio);
    if (!isLoopingAudio) return;
    
    try {
        isLoopingAudio = false;
        if (notifyAudio) {
            notifyAudio.pause();
            notifyAudio.currentTime = 0;
            console.log('Stopped looping notify sound');
        }
    } catch (error) {
        console.error('Error stopping looping notify:', error);
    }
  
  return Promise.resolve();
}

// Test both sounds
async function testSounds() {
    console.log('Testing sounds...');
    
    // Play notification sound
    await playNotificationSound();
    
    // Wait 2 seconds, then start looping
    setTimeout(() => {
        startLoopingNotify();
        
        // Stop looping after 10 seconds
        setTimeout(() => {
            stopLoopingNotify();
        }, 10000);
    }, 2000);
}