// Toggle sidebar menu items
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.settings-section');

navItems.forEach(item => {
    if (item.dataset.section) {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the selected section
            const sectionId = this.dataset.section + '-section';
            document.getElementById(sectionId).style.display = 'block';
        });
    }
});

// Toggle night mode with improved animation
function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    
    // Save preference to localStorage
    const isNightMode = document.body.classList.contains('night-mode');
    localStorage.setItem('nightMode', isNightMode);
    
    // Update the switch in appearance settings
    document.getElementById('dark-mode-switch').checked = isNightMode;
    
    // Update the icon based on current mode with animation
    const nightModeIcon = document.getElementById('night-mode-icon');
    const nightModeToggle = document.querySelector('.night-mode-toggle');
    
    // Add rotation animation
    nightModeToggle.style.transition = 'transform 0.5s';
    nightModeToggle.style.transform = 'rotate(180deg)';
    
    setTimeout(() => {
        if (isNightMode) {
            nightModeIcon.className = 'fas fa-sun';
            showNotification('Dark mode enabled');
        } else {
            nightModeIcon.className = 'fas fa-moon';
            showNotification('Light mode enabled');
        }
        
        // Reset the rotation after changing the icon
        setTimeout(() => {
            nightModeToggle.style.transition = 'transform 0.2s';
            nightModeToggle.style.transform = 'rotate(0deg)';
        }, 150);
    }, 250);
}

// Initialize night mode based on saved preference
function initializeNightMode() {
    // Check if night mode was previously enabled
    const isNightMode = localStorage.getItem('nightMode') === 'true';
    
    if (isNightMode) {
        document.body.classList.add('night-mode');
        document.getElementById('night-mode-icon').className = 'fas fa-sun';
        document.getElementById('dark-mode-switch').checked = true;
    }
}

// Toggle dark mode from switch
document.getElementById('dark-mode-switch').addEventListener('change', function() {
    if (this.checked) {
        if (!document.body.classList.contains('night-mode')) {
            toggleNightMode();
        }
    } else {
        if (document.body.classList.contains('night-mode')) {
            toggleNightMode();
        }
    }
});

// Set theme color
function setThemeColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Set a matching secondary color
    let secondaryColor;
    switch(color) {
        case '#6a11cb': secondaryColor = '#2575fc'; break;
        case '#2575fc': secondaryColor = '#0099ff'; break;
        case '#ff4500': secondaryColor = '#ff7f50'; break;
        case '#008000': secondaryColor = '#00cc00'; break;
        case '#ff0000': secondaryColor = '#ff5555'; break;
        default: secondaryColor = '#2575fc';
    }
    
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    document.documentElement.style.setProperty('--background-gradient', `linear-gradient(135deg, ${color}, ${secondaryColor})`);
    document.documentElement.style.setProperty('--button-color', color);
    
    // Update preview selection
    const previews = document.querySelectorAll('.color-preview');
    previews.forEach(preview => {
        preview.style.border = '2px solid transparent';
        if (preview.style.backgroundColor === color || 
            preview.getAttribute('onclick').includes(color)) {
            preview.style.border = '2px solid white';
            if (document.body.classList.contains('night-mode')) {
                preview.style.border = '2px solid #4a5568';
            }
        }
    });
    
    showNotification('Theme color updated');
}

// Avatar upload preview
document.getElementById('avatar-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatar = document.querySelector('.profile-avatar');
            avatar.innerHTML = '';
            avatar.style.background = 'none';
            avatar.style.backgroundImage = `url(${e.target.result})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            
            // Add the change avatar button back
            const changeAvatarBtn = document.createElement('div');
            changeAvatarBtn.className = 'change-avatar';
            changeAvatarBtn.innerHTML = '<i class="fas fa-camera"></i>';
            changeAvatarBtn.onclick = function() {
                document.getElementById('avatar-upload').click();
            };
            avatar.appendChild(changeAvatarBtn);
        };
        reader.readAsDataURL(file);
    }
});

// Save changes function
function saveChanges() {
    // Get form values
    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    
    // Update display name and email
    document.getElementById('display-name').textContent = fullname;
    document.getElementById('display-email').textContent = email;
    
    // Show notification
    showNotification('Settings saved successfully!');
}

// Reset form function
function resetForm() {
    // Get original display values
    const displayName = document.getElementById('display-name').textContent;
    const displayEmail = document.getElementById('display-email').textContent;
    
    // Reset form values
    document.getElementById('fullname').value = displayName;
    document.getElementById('email').value = displayEmail;
    
    showNotification('Changes discarded');
}

// Show notification function
function showNotification(message) {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notification-message');
    
    messageEl.textContent = message;
    notification.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Close notification function
function closeNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeNightMode();
    
    // Highlight the first theme color as selected
    const firstColorPreview = document.querySelector('.color-preview');
    if (firstColorPreview) {
        firstColorPreview.style.border = '2px solid white';
        if (document.body.classList.contains('night-mode')) {
            firstColorPreview.style.border = '2px solid #4a5568';
        }
    }
});
// Delete account functionality
document.getElementById('delete-account-btn').addEventListener('click', function() {
// Show the confirmation modal
const deleteModal = document.getElementById('delete-modal');
deleteModal.style.display = 'flex';
});

// Cancel delete
document.getElementById('cancel-delete').addEventListener('click', function() {
document.getElementById('delete-modal').style.display = 'none';
});

// Confirm delete
document.getElementById('confirm-delete').addEventListener('click', function() {
// In a real app, you would make an API call to delete the account
// For this demo, we'll simulate success and redirect to login

// Show deletion notification
showNotification('Account successfully deleted');

// Hide modal
document.getElementById('delete-modal').style.display = 'none';

// Redirect to login page after brief delay
setTimeout(() => {
window.location.href = 'login.html'; // Change to your login page URL
}, 2000);
});

// Update night mode styling for delete modal
function updateDeleteModalNightMode() {
const isNightMode = document.body.classList.contains('night-mode');
const deleteModal = document.getElementById('delete-modal');
const modalContent = deleteModal.querySelector('div');

if (isNightMode) {
modalContent.style.background = '#2d3748';
modalContent.style.color = '#e2e8f0';
} else {
modalContent.style.background = 'white';
modalContent.style.color = '#333';
}
}

// Add this to your toggleNightMode function
const originalToggleNightMode = toggleNightMode;
toggleNightMode = function() {
originalToggleNightMode();
updateDeleteModalNightMode();
};

// Load user data from session storage when page loads
function loadUserData() {
// Try to load user data from session storage
const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');

if (userData.username) {
// Update form fields
document.getElementById('fullname').value = userData.fullname || 'John Doe';
document.getElementById('email').value = userData.email || 'john.doe@example.com';
document.getElementById('username').value = userData.username || 'johndoe';

// Update display elements
document.getElementById('display-name').textContent = userData.fullname || 'John Doe';
document.getElementById('display-email').textContent = userData.email || 'john.doe@example.com';
}
}

// Initialize user data on page load
document.addEventListener('DOMContentLoaded', function() {
initializeNightMode();
loadUserData();
updateDeleteModalNightMode();

// Highlight the first theme color as selected
const firstColorPreview = document.querySelector('.color-preview');
if (firstColorPreview) {
firstColorPreview.style.border = '2px solid white';
if (document.body.classList.contains('night-mode')) {
    firstColorPreview.style.border = '2px solid #4a5568';
}
}
});

// Update saveChanges function to store data in session storage
const originalSaveChanges = saveChanges;
saveChanges = function() {
// Get form values
const fullname = document.getElementById('fullname').value;
const email = document.getElementById('email').value;
const username = document.getElementById('username').value;

// Save to session storage
const userData = {
fullname: fullname,
email: email,
username: username
};
sessionStorage.setItem('userData', JSON.stringify(userData));

// Call original function
originalSaveChanges();
};