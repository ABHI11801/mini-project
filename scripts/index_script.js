function initializeProjectTitle() {
    const titleInput = document.getElementById('project-title');
    const editButton = document.getElementById('edit-title-btn');
    
    titleInput.classList.add('readonly');
    titleInput.setAttribute('readonly', true);
    
    editButton.addEventListener('click', function() {
        if (titleInput.hasAttribute('readonly')) {
            titleInput.removeAttribute('readonly');
            titleInput.classList.remove('readonly');
            titleInput.focus();
            titleInput.select();
        } else {
            titleInput.setAttribute('readonly', true);
            titleInput.classList.add('readonly');
        }
    });
    
    titleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            titleInput.setAttribute('readonly', true);
            titleInput.classList.add('readonly');
        }
    });
    
    titleInput.addEventListener('blur', function() {
        titleInput.setAttribute('readonly', true);
        titleInput.classList.add('readonly');
        
        if (!titleInput.value.trim()) {
            titleInput.value = "Untitled";
        }
    });
}

let currentLoadedProjectData = null;

function saveCurrentProject() {
    const projectTitle = document.getElementById('project-title').value || 'Untitled';
    const promptBoxes = document.querySelectorAll('.prompt-box');
    
    const projectContent = [];
    promptBoxes.forEach(box => {
        const title = box.querySelector('.title-input').value;
        const content = box.querySelector('textarea').value;
        const fileName = box.querySelector('.file-name').textContent;
        
        projectContent.push({
            title: title,
            content: content,
            fileName: fileName
        });
    });
    
    if (projectContent.length === 0 || (projectContent.length === 1 && 
        !projectContent[0].title && !projectContent[0].content && !projectContent[0].fileName)) {
        return false;
    }
    
    if (currentLoadedProjectData && 
        projectTitle === currentLoadedProjectData.title && 
        JSON.stringify(projectContent) === JSON.stringify(currentLoadedProjectData.content)) {
        return false;
    }
    
    const currentUser = localStorage.getItem('currentUser');
    const storageKey = currentUser ? `recentProjects_${currentUser}` : 'recentProjects';
    
    let recentProjects = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    recentProjects.unshift({
        title: projectTitle,
        content: projectContent,
        date: new Date().toISOString(),
        icon: getRandomIcon()
    });
    
    if (recentProjects.length > 5) {
        recentProjects = recentProjects.slice(0, 5);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(recentProjects));
    
    updateRecentProjectsUI();
    
    return true;
}

function getRandomIcon() {
    const icons = [
        'fa-file-code', 'fa-shopping-cart', 'fa-blog', 'fa-chart-line', 
        'fa-mobile-alt', 'fa-palette', 'fa-image', 'fa-store', 
        'fa-envelope', 'fa-calendar'
    ];
    return icons[Math.floor(Math.random() * icons.length)];
}

function updateRecentProjectsUI() {
    const projectsList = document.querySelector('.projects-list');
    
    const currentUser = localStorage.getItem('currentUser');
    const storageKey = currentUser ? `recentProjects_${currentUser}` : 'recentProjects';
    
    const recentProjects = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    projectsList.innerHTML = '';
    
    recentProjects.forEach((project, index) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.dataset.index = index;
        
        projectItem.innerHTML = `
            <div class="project-icon">
                <i class="fas ${project.icon}"></i>
            </div>
            <div class="project-title">${project.title}</div>
        `;
        
        projectItem.addEventListener('click', function() {
            loadProject(index);
        });
        
        projectsList.appendChild(projectItem);
    });
    
    if (recentProjects.length === 0) {
        const noProjects = document.createElement('div');
        noProjects.className = 'project-item';
        noProjects.innerHTML = `
            <div class="project-icon">
                <i class="fas fa-info-circle"></i>
            </div>
            <div class="project-title">No recent projects</div>
        `;
        projectsList.appendChild(noProjects);
    }
}

function loadProject(index) {
    const currentUser = localStorage.getItem('currentUser');
    const storageKey = currentUser ? `recentProjects_${currentUser}` : 'recentProjects';
    
    const recentProjects = JSON.parse(localStorage.getItem(storageKey)) || [];
    const project = recentProjects[index];
    
    if (!project) return;
    
    currentLoadedProjectData = {
        title: project.title,
        content: JSON.parse(JSON.stringify(project.content))
    };
    
    const projectTitleInput = document.getElementById('project-title');
    projectTitleInput.value = project.title;
    
    const promptContainer = document.getElementById('prompt-container');
    promptContainer.innerHTML = '';
    
    const addBtnContainer = document.createElement('div');
    addBtnContainer.className = 'add-btn-container';
    addBtnContainer.innerHTML = `<button class="add-btn" onclick="addPrompt()">+</button>`;
    
    project.content.forEach(item => {
        const promptBox = document.createElement('div');
        promptBox.className = 'prompt-box';
        promptBox.innerHTML = `
            <input type="text" class="title-input" placeholder="Enter page title" value="${item.title || ''}">
            <textarea placeholder="Enter page content">${item.content || ''}</textarea>
            <label class="file-upload-label">
                <input type="file" class="file-input">
                <span>Upload File</span>
            </label>
            <div class="file-name">${item.fileName || ''}</div>
            ${project.content.length > 1 ? '<button class="remove-btn" onclick="removePrompt(this)">✖</button>' : ''}
        `;
        
        const fileInput = promptBox.querySelector('.file-input');
        const fileName = promptBox.querySelector('.file-name');
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                fileName.textContent = this.files[0].name;
            }
        });
        
        promptContainer.appendChild(promptBox);
    });
    
    promptContainer.appendChild(addBtnContainer);
    
    showNotification(`Loaded project: ${project.title}`);
}

function initializeNewProjectButton() {
    const newProjectBtn = document.getElementById('new-project-btn');
    
    newProjectBtn.addEventListener('click', function() {
        const saved = saveCurrentProject();
        
        const projectTitleInput = document.getElementById('project-title');
        if (projectTitleInput) {
            projectTitleInput.value = "Untitled";
        }
        
        const promptContainer = document.getElementById('prompt-container');
        promptContainer.innerHTML = '';
        
        const promptBox = document.createElement('div');
        promptBox.className = 'prompt-box';
        promptBox.innerHTML = `
            <input type="text" class="title-input" placeholder="Enter page title">
            <textarea placeholder="Enter page content"></textarea>
            <label class="file-upload-label">
                <input type="file" class="file-input">
                <span>Upload File</span>
            </label>
            <div class="file-name"></div>
        `;
        
        const fileInput = promptBox.querySelector('.file-input');
        const fileName = promptBox.querySelector('.file-name');
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                fileName.textContent = this.files[0].name;
            }
        });
        
        const addBtnContainer = document.createElement('div');
        addBtnContainer.className = 'add-btn-container';
        addBtnContainer.innerHTML = `<button class="add-btn" onclick="addPrompt()">+</button>`;
        
        promptContainer.appendChild(promptBox);
        promptContainer.appendChild(addBtnContainer);
        
        const progressBar = document.getElementById('generation-progress');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        
        // Reset the currentLoadedProjectData
        currentLoadedProjectData = null;
        
        // Show notification
        if (saved) {
            showNotification('Previous project saved and new project created');
        } else {
            showNotification('New project created');
        }
    });
}
// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('expanded');
}

// Toggle profile menu dropdown
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
    
    // Close dropdown when clicking outside
    if (dropdown.classList.contains('active')) {
        document.addEventListener('click', closeDropdownOnClickOutside);
    } else {
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

// Function to toggle night mode with improved animation
function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    
    // Save preference to localStorage
    const isNightMode = document.body.classList.contains('night-mode');
    localStorage.setItem('nightMode', isNightMode);
    
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

// Function to initialize night mode based on saved preference
function initializeNightMode() {
    // Check if night mode was previously enabled
    const isNightMode = localStorage.getItem('nightMode') === 'true';
    
    if (isNightMode) {
        document.body.classList.add('night-mode');
        document.getElementById('night-mode-icon').className = 'fas fa-sun';
    }
}

// Function to close dropdown when clicking outside
function closeDropdownOnClickOutside(event) {
    const dropdown = document.getElementById('profileDropdown');
    const avatar = document.querySelector('.profile-avatar');
    
    // If click is outside the dropdown and not on the avatar
    if (!dropdown.contains(event.target) && !avatar.contains(event.target)) {
        dropdown.classList.remove('active');
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

// Logout function
function logout() {
    window.location.href = "login.html";
}

function addPrompt() {
    const container = document.getElementById("prompt-container");
    const addBtnContainer = container.querySelector('.add-btn-container');
    
    const promptBox = document.createElement("div");
    promptBox.className = "prompt-box";
    promptBox.innerHTML = `
        <input type="text" class="title-input" placeholder="Enter page title">
        <textarea placeholder="Enter page content"></textarea>
        <label class="file-upload-label">
            <input type="file" class="file-input">
            <span>Upload File</span>
        </label>
        <div class="file-name"></div>
        <button class="remove-btn" onclick="removePrompt(this)">✖</button>
    `;
    

    const fileInput = promptBox.querySelector('.file-input');
    const fileName = promptBox.querySelector('.file-name');

    fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
            const file = this.files[0];
            fileName.textContent = file.name;

        // Upload the file to the backend
            const formData = new FormData();
            formData.append('file', file);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(data => console.log(data))
            .catch(error => console.error('Error uploading file:', error));
        }
    });

    
    // Insert the new prompt box before the add button container
    container.insertBefore(promptBox, addBtnContainer);
}

function removePrompt(button) {
    const container = document.getElementById("prompt-container");
    const promptBoxes = container.querySelectorAll('.prompt-box');
    
    // Prevent removing the last prompt box
    if (promptBoxes.length > 1) {
        button.parentElement.remove();
    }
}
async function generatePageNames(){
    const titles=[];
    const promptBoxes = document.querySelectorAll('.prompt-box');
    for (const box of promptBoxes) {
        const title = box.querySelector('.title-input').value;
        if(title){
            titles.push(title);
        }
    }
    return titles;
}
function saveProjectAndPages() {
    const proj_name = document.getElementById('project-title').value;
    const user_id = 1; // ???

    
    const promptBoxes = document.querySelectorAll('.prompt-box');
    const pages = [];

    promptBoxes.forEach(box => {
        const title = box.querySelector('.title-input').value;
        const content = box.querySelector('textarea').value;
        pages.push({ title: title, content: content });
    });

    fetch('http://localhost:5000/api/save-project', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ proj_name: proj_name, user_id: user_id, pages: pages })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        showNotification('Project saved successfully!');
    })
    .catch((error) => {
        console.error('Error:', error);
        showNotification('Error saving project.');
    });
}
async function generateWebContent() {
    const titles = await generatePageNames();
    const selectedLLM = document.getElementById('llm-selection').value;
    const promptBoxes = document.querySelectorAll('.prompt-box');
    const progressBar = document.getElementById('generation-progress');
    
    progressBar.style.width = '10%';
    showNotification('Generating pages one by one...');

    const projectTitle = document.getElementById('project-title').value;

    let pageCount = 0;
    
    for (const box of promptBoxes) {
        const title = box.querySelector('.title-input').value;
        const content = box.querySelector('textarea').value;
        const fileName = box.querySelector('.file-name').textContent;

        const requestBody = {
            llm: selectedLLM,
            prompt: content,
            pagename: title,
            filename: fileName,
            pages: titles,
            theme: selectedColors
        };

        try {
            const response = await fetch('http://localhost:5000/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Server responded with status: ' + response.status);
            }

            const data = await response.json();
            handleGeneratedContent(data);
            pageCount++;

            // Update progress dynamically
            const progressPercentage = Math.round((pageCount / promptBoxes.length) * 100);
            progressBar.style.width = progressPercentage + '%';
        } catch (error) {
            showNotification('Error generating page: ' + error.message);
            console.error('Generation error:', error);
        }
    }

    // All pages are generated, now download ZIP
    showNotification('All pages generated! Preparing ZIP...');
    saveProjectAndPages();
    downloadZip();
}

// Function to download ZIP after all pages are generated
function downloadZip() {
    fetch("http://localhost:5000/download-zip")
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to download ZIP file.");
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "generated_files.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification("ZIP file downloaded!");
    })
    .catch(error => {
        showNotification("Error downloading ZIP: " + error.message);
        console.error("Download error:", error);
    });
}


// Function to handle the generated content
function handleGeneratedContent(data) {
    // This function would process the generated content
    // Example: download files, show preview, etc.
    console.log('Generated content:', data);
    
    // Save the current project to recent projects
    saveCurrentProject();
}

// Store selected colors
const selectedColors = [];
const MAX_COLORS = 3;

function toggleColor(element, colorValue) {
    // Check if element is already selected
    const isSelected = element.classList.contains('selected');
    
    // If it's already selected, just toggle it off
    if (isSelected) {
        element.classList.remove('selected');
        const colorIndex = selectedColors.indexOf(colorValue);
        if (colorIndex !== -1) {
            selectedColors.splice(colorIndex, 1);
        }
        return;
    }
    
    // If not selected and we're at the limit, show notification
    if (selectedColors.length >= MAX_COLORS) {
        showNotification(`Maximum ${MAX_COLORS} colors allowed!`);
        return;
    }
    
    // Otherwise, toggle it on
    element.classList.add('selected');
    selectedColors.push(colorValue);
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
function logout() {
    localStorage.removeItem('currentUser');
    
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    initializeNightMode();
    initializeProjectTitle();
    
    initializeNewProjectButton();
    
    updateRecentProjectsUI();

    const currentUser = localStorage.getItem('currentUser');

    if (currentUser) {
    const userObj = JSON.parse(currentUser);
    const fullName = `${userObj.firstName} ${userObj.lastName}`;
    document.getElementById('username-display').textContent = fullName;
    } else {
    document.getElementById('username-display').textContent = 'Guest';
    }

    const initialFileInput = document.querySelector('.prompt-container .file-input');
    const initialFileName = document.querySelector('.prompt-container .file-name');
    
    if (initialFileInput && initialFileName) {
        initialFileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                initialFileName.textContent = this.files[0].name;
            }
        });
    }
    document.getElementById('logoutButton').addEventListener('click', logout);
});