// Function to fetch user's projects from the database
async function fetchUserProjects() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, user not logged in');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/user-projects', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        return data.projects;
    } catch (error) {
        console.error('Error fetching projects:', error);
        showNotification('Error fetching projects');
        return [];
    }
}

// Function to update the projects list UI
function updateProjectsListUI(projects) {
    const projectsList = document.querySelector('.grid.gap-4');
    if (!projectsList) return;

    if (projects.length === 0) {
        projectsList.innerHTML = `
            <div class="project-card bg-white shadow-md rounded-lg p-4 hover:bg-blue-50 relative">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-bold text-gray-600 text-lg">No projects yet</div>
                        <div class="text-gray-600 text-sm mt-1">Create a new project to get started</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    projectsList.innerHTML = projects.map(project => {
        // Log the project data to see what fields are available
        console.log('Project data:', project);
        
        // Get the creation date
        const createdDate = project.created_at;
        const formattedDate = createdDate ? formatDate(createdDate) : 'Date not available';
        
        return `
            <div class="project-card bg-white shadow-md rounded-lg p-4 hover:bg-blue-50 relative">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-bold text-blue-600 text-lg">${project.proj_name}</div>
                        <div class="text-gray-500 text-sm mt-1">Created: ${formattedDate}</div>
                    </div>
                    <div class="flex flex-col items-end">
                        <div class="flex mt-2">
                            <button class="text-blue-600 hover:text-blue-800 mr-2" onclick="loadProject(${project.proj_id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="text-gray-400 hover:text-gray-600 project-options-btn relative" onclick="toggleProjectOptions(${project.proj_id})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <!-- Project Options Menu -->
                            <div class="project-options" id="projectOptions${project.proj_id}">
                                <div class="option-item" onclick="deleteProject(${project.proj_id})">
                                    <i class="fas fa-trash-alt mr-2 text-red-500"></i>
                                    <span>Delete</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
        
        // Format the date in a user-friendly way
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date not available';
    }
}

// Function to show notifications
function showNotification(message) {
    // You can implement your preferred notification system here
    alert(message);
}

// Function to load a project
function loadProject(projectId) {
    // Store the project ID in localStorage so index.html can load it
    localStorage.setItem('currentProjectId', projectId);
    window.location.href = 'index.html';
}

// Function to toggle project options menu
function toggleProjectOptions(projectId) {
    const optionsMenu = document.getElementById('projectOptions' + projectId);
    
    // Close all other project option menus
    const projectOptions = document.querySelectorAll('.project-options');
    projectOptions.forEach(menu => {
        if (menu.id !== 'projectOptions' + projectId) {
            menu.style.display = 'none';
        }
    });
    
    // Toggle the clicked menu
    optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
}

// Function to delete a project
async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to delete projects');
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/project/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete project');
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Failed to delete project: Server returned an error');
            }
        }

        showNotification('Project deleted successfully');
        // Refresh the projects list
        const projects = await fetchUserProjects();
        updateProjectsListUI(projects);
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Error deleting project: ' + error.message);
    }
}

// Function to create a new project
function createNewProject() {
    // Clear any stored project ID
    localStorage.removeItem('currentProjectId');
    window.location.href = 'index.html';
}

// Function to toggle profile menu
function toggleProfileMenu() {
    const profileDropdown = document.getElementById('profileDropdown');
    profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
}

// Initialize the page
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

    // Fetch and display projects
    const projects = await fetchUserProjects();
    updateProjectsListUI(projects);
}

// Add event listener for logout
document.getElementById('logoutButton').addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
});

// Close dropdown when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.profile-avatar') && !event.target.matches('.profile-avatar *') && 
        !event.target.matches('.project-options-btn') && !event.target.matches('.project-options-btn *')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        }
        
        // Hide all project option menus
        const projectOptions = document.querySelectorAll('.project-options');
        projectOptions.forEach(menu => {
            menu.style.display = 'none';
        });
    }
}

// Initialize the page when it loads
document.addEventListener('DOMContentLoaded', initializePage); 