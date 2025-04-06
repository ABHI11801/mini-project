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

// Function to fetch user data
function fetchUserData() {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Fetch user data from the server
    fetch('http://localhost:5500/api/user-profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        return response.json();
    })
    .then(data => {
        // Update profile display
        document.getElementById('display-name').textContent = data.username || 'User';
        document.getElementById('display-email').textContent = data.email || '';
        
        // Update form fields
        document.getElementById('fullname').value = data.username || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('username').value = data.username || '';
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        // Redirect to login if there's an error
        window.location.href = 'login.html';
    });
}

// Function to save changes
function saveChanges() {
    const token = localStorage.getItem('token');
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    
    // Get the currently active section
    const activeSection = document.querySelector('.nav-item.active').dataset.section;
    
    // Initialize promises array
    let promises = [];
    let passwordUpdated = false;
    
    // Only update profile info if in account section
    if (activeSection === 'account') {
        if (!username || !email) {
            showNotification('Username and email are required', 'error');
            return;
        }
        
        // Update profile info
        const profileUpdatePromise = fetch('http://localhost:5500/api/update-profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            return response.json();
        })
        .then(data => {
            // Update the display name and email
            document.getElementById('display-name').textContent = username;
            document.getElementById('display-email').textContent = email;
            
            // Also update the username in the index page if it exists
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = username;
            }
            return 'Profile updated successfully!';
        });
        
        promises.push(profileUpdatePromise);
    }
    
    // Only update password if in privacy section and there's a pending password change
    if (activeSection === 'privacy') {
        const pendingPasswordChange = localStorage.getItem('pendingPasswordChange');
        
        if (pendingPasswordChange) {
            const { currentPassword, newPassword } = JSON.parse(pendingPasswordChange);
            
            // Update password
            const passwordUpdatePromise = fetch('http://localhost:5500/api/update-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update password');
                }
                return response.json();
            })
            .then(data => {
                // Clear the pending password change
                localStorage.removeItem('pendingPasswordChange');
                passwordUpdated = true;
                return 'Password updated successfully!';
            });
            
            promises.push(passwordUpdatePromise);
        }
    }
    
    // If no updates to perform, show a message
    if (promises.length === 0) {
        showNotification('No changes to save in the current section', 'error');
        return;
    }
    
    // Wait for all operations to complete
    Promise.all(promises)
        .then(messages => {
            // Filter out null messages and join the rest
            const successMessage = messages.filter(msg => msg).join(' ');
            
            // Show success message
            if (successMessage) {
                showNotification(successMessage, 'success');
            }
        })
        .catch(error => {
            showNotification('Failed to update settings', 'error');
        });
}

// Function to show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    // Make sure the notification element exists
    if (!notification || !notificationMessage) {
        console.error('Notification elements not found');
        return;
    }
    
    notificationMessage.textContent = message;
    
    if (type === 'error') {
        notification.querySelector('i').className = 'fas fa-exclamation-circle';
    } else {
        notification.querySelector('i').className = 'fas fa-check-circle';
    }
    
    // Make sure the notification is visible
    notification.style.display = 'flex';
    notification.style.opacity = '1';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// Function to close notification
function closeNotification() {
    document.getElementById('notification').style.display = 'none';
}

// Handle navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        if (this.dataset.section) {
            // Hide all sections
            document.querySelectorAll('.settings-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // Show selected section
            document.getElementById(`${this.dataset.section}-section`).style.display = 'block';
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            this.classList.add('active');
        }
    });
});

// Load user data when page loads
document.addEventListener('DOMContentLoaded', fetchUserData);

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
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    fetch('http://localhost:5500/api/delete-account', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete account');
        }
        return response.json();
    })
    .then(data => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    })
    .catch(error => {
        console.error('Error deleting account:', error);
        showNotification('Failed to delete account', 'error');
    });
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

// Store user data in session storage when form fields change
document.getElementById('fullname').addEventListener('change', function() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    userData.fullname = this.value;
    sessionStorage.setItem('userData', JSON.stringify(userData));
});

document.getElementById('email').addEventListener('change', function() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    userData.email = this.value;
    sessionStorage.setItem('userData', JSON.stringify(userData));
});

document.getElementById('username').addEventListener('change', function() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    userData.username = this.value;
    sessionStorage.setItem('userData', JSON.stringify(userData));
});

// Function to show password change modal
function showPasswordChangeModal() {
    document.getElementById('password-modal').style.display = 'flex';
}

// Function to hide password change modal
function hidePasswordChangeModal() {
    document.getElementById('password-modal').style.display = 'none';
    // Clear the password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

// Function to handle password change confirmation
function confirmPasswordChange() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('All password fields are required', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    // Store password data in localStorage for later saving
    localStorage.setItem('pendingPasswordChange', JSON.stringify({
        currentPassword,
        newPassword
    }));

    // Show notification that password will be updated when clicking "Save Changes"
    showNotification('Password will be updated when you click "Save Changes"', 'success');
    
    // Hide the modal - make sure it's completely hidden
    document.getElementById('password-modal').style.display = 'none';
    
    // Clear the password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Navigate back to the privacy section
    document.querySelectorAll('.settings-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('privacy-section').style.display = 'block';
    
    // Update active state in navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector('.nav-item[data-section="privacy"]').classList.add('active');
}