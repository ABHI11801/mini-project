

function initializeProjectTitle() {
    const titleInput = document.getElementById('project-title');
    const editButton = document.getElementById('edit-title-btn');

    titleInput.classList.add('readonly');
    titleInput.setAttribute('readonly', true);

    editButton.addEventListener('click', function () {
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

    titleInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            titleInput.setAttribute('readonly', true);
            titleInput.classList.add('readonly');
        }
    });

    titleInput.addEventListener('blur', function () {
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

    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Parse the JSON string
    const storageKey = currentUser && currentUser.id ? `recentProjects_${currentUser.id}` : 'recentProjects';

    let recentProjects = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Check if this project already exists in recent projects
    const existingProjectIndex = recentProjects.findIndex(p =>
        p.title === projectTitle &&
        JSON.stringify(p.content) === JSON.stringify(projectContent)
    );

    if (existingProjectIndex !== -1) {
        // Project already exists, just move it to the top
        const existingProject = recentProjects.splice(existingProjectIndex, 1)[0];
        recentProjects.unshift(existingProject);
    } else {
        // New project, add to the beginning with file icon
        recentProjects.unshift({
            title: projectTitle,
            content: projectContent,
            date: new Date().toISOString(),
            icon: 'fa-file'  // Use file icon
        });
    }

    if (recentProjects.length > 5) {
        recentProjects = recentProjects.slice(0, 5);
    }

    localStorage.setItem(storageKey, JSON.stringify(recentProjects));

    updateRecentProjectsUI();

    return true;
}

function getRandomIcon() {
    return 'fa-file';
}

function updateRecentProjectsUI() {
    const projectsList = document.querySelector('.projects-list');
    projectsList.innerHTML = '';

    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Get current user
    const storageKey = currentUser && currentUser.id ? `recentProjects_${currentUser.id}` : 'recentProjects';

    const recentProjects = JSON.parse(localStorage.getItem(storageKey)) || [];

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
        return;
    }

    recentProjects.forEach((project, index) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.dataset.index = index; // Use index for local storage

        // Always use the file icon for all projects
        const icon = 'fa-file';

        projectItem.innerHTML = `
            <div class="project-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="project-details">
                <div class="project-title">${project.title}</div>
                <div class="project-date">Created: ${formatDate(project.date)}</div>
            </div>
        `;

        projectItem.addEventListener('click', function () {
            loadProject(index); // Use the local storage loadProject
        });

        projectsList.appendChild(projectItem);
    });
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) {
        return 'Date not available';
    }

    try {
        // Parse the MySQL datetime string
        const date = new Date(dateString);

        // Check if the date is valid
        if (isNaN(date.getTime())) {
            console.error('Invalid date string:', dateString);
            return 'Date not available';
        }

        // Format the date in the desired format: "April 6, 2025 at 09:01 PM"
        const month = date.toLocaleString('en-US', { month: 'long' });
        const day = date.getDate();
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');

        return `${month} ${day}, ${year} at ${formattedHours}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date not available';
    }
}
function loadProject(index) {
    const currentUser = localStorage.getItem('currentUser');
    const storageKey = currentUser && currentUser.id ? `recentProjects_${currentUser.id}` : 'recentProjects';

    const recentProjects = JSON.parse(localStorage.getItem(storageKey)) || [];
    const project = recentProjects[index];

    if (!project) return;

    currentLoadedProjectData = {
        title: project.title,
        content: JSON.parse(JSON.stringify(project.content)),
        icon: project.icon
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
        fileInput.addEventListener('change', function () {
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

    newProjectBtn.addEventListener('click', function () {
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
        fileInput.addEventListener('change', function () {
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
async function generatePageNames() {
    const titles = [];
    const promptBoxes = document.querySelectorAll('.prompt-box');
    for (const box of promptBoxes) {
        const title = box.querySelector('.title-input').value;
        if (title) {
            titles.push(title);
        }
    }
    return titles;
}
function saveProjectAndPages() {
    return new Promise((resolve, reject) => {
        const proj_name = document.getElementById('project-title').value;
        const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Get current user
        const user_id = currentUser ? currentUser.id : null; // Use user ID or null if not logged in

        if (!user_id) {
            const error = new Error('No user logged in; cannot save to database');
            console.log(error.message);
            showNotification('Please log in to save projects.');
            reject(error);
            return;
        }

        const promptBoxes = document.querySelectorAll('.prompt-box');
        const pages = [];

        promptBoxes.forEach(box => {
            const title = box.querySelector('.title-input').value;
            const content = box.querySelector('textarea').value;
            pages.push({ title: title, content: content });
        });

        const requestBody = { proj_name: proj_name, user_id: user_id, pages: pages };
        console.log('Saving project to database:', requestBody); // Debug: Log the data being sent

        fetch('http://localhost:5500/api/save-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
            .then(response => {
                console.log('Response status:', response.status); // Debug: Log the response status
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Database save success:', data); // Debug: Log the response data
                showNotification('Project saved successfully!');
                resolve(data);
            })
            .catch((error) => {
                console.error('Error saving to database:', error); // Debug: Log the error
                showNotification('Error saving project: ' + error.message);
                reject(error);
            });
    });
}


async function generateWebContent() {

    try {
        // Check if we're working with an existing project
        const isExistingProject = currentLoadedProjectData !== null;

        // Save project data first, before starting generation
        try {
            showNotification('Saving project data before generation...');

            if (isExistingProject) {
                // Update existing project
                await updateExistingProject();
                showNotification('Project updated successfully! Starting generation...');
            } else {
                // Save as new project
                await saveProjectAndPages();
                showNotification('Project saved successfully! Starting generation...');

                // Save to recent projects only for new projects
                saveCurrentProject();
            }
        } catch (error) {
            console.error('Error saving project before generation:', error);
            showNotification('Warning: Could not save project before generation: ' + error.message);
            // Continue with generation even if save fails
        }

        const titles = await generatePageNames();
        const selectedLLM = document.getElementById('llm-selection').value;
        const promptBoxes = document.querySelectorAll('.prompt-box');
        const progressBar = document.getElementById('generation-progress');

        // Ensure selectedColors is properly initialized
        if (typeof window.selectedColors === 'undefined') {
            window.selectedColors = [];
        }

        progressBar.style.width = '10%';
        showNotification('Generating pages one by one...');

        const projectTitle = document.getElementById('project-title').value;

        let pageCount = 0;
        let generationSuccessful = true;

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
                const response = await fetch('http://localhost:5500/generate', {
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
                generationSuccessful = false;
                showNotification('Error generating page: ' + error.message);
                console.error('Generation error:', error);
                break;
            }
        }

        if (generationSuccessful) {
            // All pages are generated successfully, now download ZIP
            showNotification('All pages generated! Preparing ZIP...');
            try {
                showNotification('Generation process completed successfully!');
            } catch (error) {
                showNotification('Error preparing ZIP: ' + error.message);
                console.error('ZIP error:', error);
            }
        } else {
            showNotification('Generation was incomplete. Your project data has been saved.');
        }
    } catch (error) {
        showNotification('Error during generation process: ' + error.message);
        console.error('Process error:', error);
    }
}
function savefile(){
    const fileInput = promptBox.querySelector('.file-input');
    const fileName = promptBox.querySelector('.file-name');

    fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
            const file = this.files[0];
            fileName.textContent = file.name;

            // Upload the file to the backend
            const formData = new FormData();
            formData.append('file', file);

            fetch('http://localhost:5500/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(data => {
                    console.log(data);
                    fileName.textContent = file.name + " (Uploaded)";
                })
                .catch(error => {
                    console.error('Error uploading file:', error);
                    fileName.textContent = file.name + " (Upload failed)";
                });
        }
    });
}
function run(){
    generateWebContent();
}

function downloadZip() {
    const link = document.createElement('a');
    link.href = 'http://localhost:5500/download-zip'; // This is your backend zip endpoint
    link.download = 'output.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to handle the generated content
function handleGeneratedContent(data) {
    // This function would process the generated content
    // Example: download files, show preview, etc.
    console.log('Generated content:', data);

    // Save the current project to recent projects
    //saveCurrentProject();
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
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
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
            // Update username display
            document.getElementById('username-display').textContent = data.username || 'User';
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            // Redirect to login if there's an error
            window.location.href = 'login.html';
        });
}
document.addEventListener('DOMContentLoaded', fetchUserData);

document.addEventListener('DOMContentLoaded', () => {
    initializeNightMode();
    initializeProjectTitle();
    initializeNewProjectButton();

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        updateProjectsListFromDatabase();
    }

    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const userObj = JSON.parse(currentUser);
        document.getElementById('username-display').textContent = userObj.username;
    } else {
        document.getElementById('username-display').textContent = 'Guest';
    }

    document.getElementById('logoutButton').addEventListener('click', logout);
});

// Function to fetch user projects from the database
async function fetchUserProjects() {
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'Token exists' : 'No token found');

    if (!token) {
        console.log('No token found, user not logged in');
        return [];
    }

    try {
        console.log('Fetching projects from API...');
        const response = await fetch('http://localhost:5500/api/user-projects', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('API Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('Projects data:', data);
        return data.projects || [];
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

// Function to update the projects list UI
async function updateProjectsListFromDatabase() {
    const projectsList = document.querySelector('.projects-list');
    if (!projectsList) return;

    // Clear existing projects
    projectsList.innerHTML = '';

    // Show loading state
    projectsList.innerHTML = `
        <div class="project-item">
            <div class="project-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="project-details">
                <div class="project-title">Loading projects...</div>
            </div>
        </div>
    `;

    try {
        const projects = await fetchUserProjects();

        if (projects.length === 0) {
            projectsList.innerHTML = `
                <div class="project-item">
                    <div class="project-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="project-details">
                        <div class="project-title">No projects found</div>
                    </div>
                </div>
            `;
            return;
        }

        // Clear loading state
        projectsList.innerHTML = '';

        // Add each project to the list
        projects.forEach(project => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-item';
            projectElement.onclick = () => loadProjectFromDatabase(project.proj_id);

            // Use the formatDate function for consistent date formatting
            const formattedDate = formatDate(project.created_at);

            projectElement.innerHTML = `
                <div class="project-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="project-details">
                    <div class="project-title">${project.proj_name}</div>
                    <div class="project-date">${formattedDate}</div>
                </div>
            `;

            projectsList.appendChild(projectElement);
        });
    } catch (error) {
        console.error('Error updating projects list:', error);
        projectsList.innerHTML = `
            <div class="project-item">
                <div class="project-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="project-details">
                    <div class="project-title">Error loading projects</div>
                </div>
            </div>
        `;
    }
}

// Function to load a specific project
async function loadProjectFromDatabase(projectId) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, user not logged in');
        return;
    }

    try {
        console.log('Loading project with ID:', projectId);
        const response = await fetch(`http://localhost:5500/api/project/${projectId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch project');
        }

        const data = await response.json();
        console.log('Project data:', data);
        const project = data.project;
        const pages = data.pages;

        // Store the project data in currentLoadedProjectData
        currentLoadedProjectData = {
            title: project.proj_name,
            projectId: project.proj_id,
            content: pages.map(page => ({
                title: page.pages_name,
                content: page.pages_description,
                fileName: page.file_name || ''
            }))
        };

        console.log('Stored project data:', currentLoadedProjectData);
        console.log('Project ID stored:', currentLoadedProjectData.projectId);

        // Update project title
        document.getElementById('project-title').value = project.proj_name;

        // Clear existing prompt containers
        const promptContainer = document.getElementById('prompt-container');
        promptContainer.innerHTML = '';

        // Add prompt containers for each page
        pages.forEach((page, index) => {
            const promptBox = document.createElement('div');
            promptBox.className = 'prompt-box';
            promptBox.innerHTML = `
                <input type="text" class="title-input" value="${page.pages_name || ''}" placeholder="Enter page title">
                <textarea placeholder="Enter page content">${page.pages_description || ''}</textarea>
                <label class="file-upload-label">
                    <input type="file" class="file-input">
                    <span>Upload File</span>
                </label>
                <div class="file-name">${page.file_name || ''}</div>
            `;
            promptContainer.appendChild(promptBox);

            // Add the "+" button after the last prompt box
            if (index === pages.length - 1) {
                const addBtnContainer = document.createElement('div');
                addBtnContainer.className = 'add-btn-container';
                addBtnContainer.innerHTML = '<button class="add-btn" onclick="addPrompt()">+</button>';
                promptContainer.appendChild(addBtnContainer);
            }
        });

        // Update file input listeners
        const fileInputs = document.querySelectorAll('.prompt-container .file-input');
        const fileNames = document.querySelectorAll('.prompt-container .file-name');

        fileInputs.forEach((input, index) => {
            input.addEventListener('change', function () {
                if (this.files && this.files.length > 0) {
                    fileNames[index].textContent = this.files[0].name;
                }
            });
        });

        showNotification(`Loaded project: ${project.proj_name}`);
    } catch (error) {
        console.error('Error loading project:', error);
        showNotification('Error loading project');
    }
}

function updateExistingProject() {
    return new Promise((resolve, reject) => {
        const proj_name = document.getElementById('project-title').value;
        const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Get current user
        const user_id = currentUser ? currentUser.id : null; // Use user ID or null if not logged in

        if (!user_id) {
            const error = new Error('No user logged in; cannot update project');
            console.log(error.message);
            showNotification('Please log in to update projects.');
            reject(error);
            return;
        }

        const promptBoxes = document.querySelectorAll('.prompt-box');
        const pages = [];

        promptBoxes.forEach(box => {
            const title = box.querySelector('.title-input').value;
            const content = box.querySelector('textarea').value;
            const fileName = box.querySelector('.file-name').textContent;
            pages.push({
                title: title,
                content: content,
                fileName: fileName
            });
        });

        // Get the project ID from the currentLoadedProjectData
        const projectId = currentLoadedProjectData.projectId;

        if (!projectId) {
            const error = new Error('Project ID not found');
            console.log(error.message);
            showNotification('Error: Project ID not found');
            reject(error);
            return;
        }

        const requestBody = {
            proj_id: projectId,
            proj_name: proj_name,
            user_id: user_id,
            pages: pages
        };

        fetch('http://localhost:5500/api/update-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(requestBody)
        })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                showNotification('Project updated successfully!');
                resolve(data);
            })
            .catch((error) => {
                showNotification('Error updating project: ' + error.message);
                reject(error);
            });
    });
}

// Function to initialize the page
async function initializePage() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        document.getElementById('username-display').textContent = currentUser.username;
    }

    // Check if we need to load a specific project
    const currentProjectId = localStorage.getItem('currentProjectId');
    if (currentProjectId) {
        // Load the project from the database
        await loadProjectFromDatabase(currentProjectId);
        // Clear the project ID from localStorage after loading
        localStorage.removeItem('currentProjectId');
    } else {
        // Initialize a new project
        initializeNewProjectButton();
    }
}

// Initialize the page when it loads
document.addEventListener('DOMContentLoaded', initializePage);

// Function to update the recent projects list UI
function updateRecentProjectsListUI(projects) {
    const recentProjectsList = document.querySelector('.recent-projects-list');
    if (!recentProjectsList) return;

    if (projects.length === 0) {
        recentProjectsList.innerHTML = `
            <div class="text-gray-500 text-sm">No recent projects</div>
        `;
        return;
    }

    recentProjectsList.innerHTML = projects.map(project => {
        // Format the date using the same format as loginfirst.html
        const createdDate = project.created_at;
        const formattedDate = createdDate ? formatDate(createdDate) : 'Date not available';

        return `
            <div class="recent-project-item flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer" onclick="loadProjectFromDatabase(${project.proj_id})">
                <div class="flex items-center">
                    <i class="fas fa-file text-blue-500 mr-2"></i>
                    <span class="text-sm">${project.proj_name}</span>
                </div>
                <div class="text-xs text-gray-500">${formattedDate}</div>
            </div>
        `;
    }).join('');
}


function showPreview() {
    const preview = document.getElementById('previewContainer');
    preview.style.display = 'block';
    preview.scrollIntoView({ behavior: 'smooth' });
}

function closePreview() {
    const preview = document.getElementById('previewContainer');
    preview.style.display = 'none';
}

