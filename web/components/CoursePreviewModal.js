export const showCoursePreviewModal = (course) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; height: 80vh; display: flex; flex-direction: column; padding: 0;">
            <header style="padding: 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 1rem 1rem 0 0;">
                <div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em;">Instructor Preview</span>
                    <h2 style="margin: 0; font-size: 1.25rem;">${course.title || 'Untitled Course'}</h2>
                </div>
                <button id="closePreview" style="width: auto; padding: 0.5rem 1rem; background: #64748b;">Exit Preview</button>
            </header>
            
            <div style="flex: 1; display: flex; overflow: hidden;">
                <!-- Sidebar -->
                <div style="width: 300px; border-right: 1px solid var(--border); overflow-y: auto; background: #fff; padding: 1rem;">
                    <h3 style="font-size: 0.875rem; color: #64748b; text-transform: uppercase; margin-bottom: 1rem; letter-spacing: 0.025em;">Course Modules</h3>
                    <div id="previewModuleList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${(course.modules || []).map((mod, i) => `
                            <button class="preview-mod-item" data-index="${i}" style="text-align: left; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; transition: all 0.2s; cursor: pointer; width: 100%;">
                                <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.25rem;">Module ${i + 1}</div>
                                <div style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">${mod.title || 'Untitled Module'}</div>
                            </button>
                        `).join('')}
                        ${(!course.modules || course.modules.length === 0) ? '<p style="font-size: 0.875rem; color: #94a3b8; text-align: center; padding: 1rem;">No modules added yet.</p>' : ''}
                    </div>
                </div>

                <!-- Content Area -->
                <div id="previewContentArea" style="flex: 1; overflow-y: auto; padding: 2rem; background: #f1f5f9;">
                    <div id="previewInitialView">
                        <h1 style="font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem;">${course.title || 'Untitled Course'}</h1>
                        <p style="font-size: 1.125rem; color: #475569; line-height: 1.6; margin-bottom: 2rem;">${course.description || 'No description provided.'}</p>
                        <div style="padding: 1.5rem; background: #fff; border-radius: 0.75rem; border: 1px solid var(--border);">
                            <h3 style="margin-top: 0; font-size: 1rem; margin-bottom: 0.5rem;">Ready to start?</h3>
                            <p style="color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem;">Select a module from the sidebar to begin the preview.</p>
                        </div>
                    </div>
                    <div id="previewModuleView" style="display: none;">
                        <div style="margin-bottom: 2rem;">
                            <span id="previewModLabel" style="font-size: 0.875rem; font-weight: 600; color: #6366f1; text-transform: uppercase;"></span>
                            <h2 id="previewModTitle" style="font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-top: 0.25rem;"></h2>
                        </div>
                        <div id="previewModContent" style="background: white; padding: 2rem; border-radius: 1rem; border: 1px solid var(--border); line-height: 1.7; color: #334155; font-size: 1.05rem; min-height: 300px; white-space: pre-wrap;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const moduleItems = modal.querySelectorAll('.preview-mod-item');
    const initialView = modal.querySelector('#previewInitialView');
    const moduleView = modal.querySelector('#previewModuleView');
    const modLabel = modal.querySelector('#previewModLabel');
    const modTitle = modal.querySelector('#previewModTitle');
    const modContent = modal.querySelector('#previewModContent');

    moduleItems.forEach(item => {
        item.onclick = () => {
            const index = parseInt(item.dataset.index);
            const mod = course.modules[index];

            // Update active state
            moduleItems.forEach(i => {
                i.style.background = 'transparent';
                i.style.borderColor = 'transparent';
            });
            item.style.background = '#f1f5f9';
            item.style.borderColor = '#e2e8f0';

            // Show content
            initialView.style.display = 'none';
            moduleView.style.display = 'block';
            modLabel.innerText = `Module ${index + 1}`;
            modTitle.innerText = mod.title || 'Untitled Module';
            modContent.innerText = mod.content || 'No content provided for this module.';
        };
    });

    modal.querySelector('#closePreview').onclick = () => modal.remove();
};
