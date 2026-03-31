import { showCoursePreviewModal } from './CoursePreviewModal.js';

export const showCourseModal = (course = null, token, onSuccess) => {
    let modules = course ? (course.modules || []) : [];

    const modal = document.createElement('div');
    modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
    modal.innerHTML = `
        <div class="auth-container" style="margin: 0; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <h2>${course ? 'Edit Course' : 'Add New Course'}</h2>
            <form id="courseForm">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="m-title" value="${course ? course.title : ''}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="m-desc" style="width: 100%; padding: 0.625rem; border: 1px solid var(--border); border-radius: 0.375rem; min-height: 80px;">${course ? course.description : ''}</textarea>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0; font-size: 1rem;">Modules</h3>
                        <button type="button" id="addModuleBtn" style="width: auto; padding: 0.25rem 0.75rem; font-size: 0.875rem; background: #10b981;">+ Add Module</button>
                    </div>
                    <div id="moduleInputs" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <!-- Module inputs will be rendered here -->
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button type="submit">Save Course</button>
                    <button type="button" id="previewCourseBtn" style="background: #6366f1;">Preview Course</button>
                    <button type="button" id="closeModal" style="background: #64748b;">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const moduleInputsDiv = modal.querySelector('#moduleInputs');

    const updateModulesFromInputs = () => {
        const modTitles = Array.from(moduleInputsDiv.querySelectorAll('.mod-title'));
        const modContents = Array.from(moduleInputsDiv.querySelectorAll('.mod-content'));
        
        modules = modules.map((mod, i) => ({
            ...mod,
            title: modTitles[i] ? modTitles[i].value : mod.title,
            content: modContents[i] ? modContents[i].value : mod.content
        }));
    };

    const renderModules = () => {
        moduleInputsDiv.innerHTML = modules.map((mod, index) => `
            <div style="padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.375rem; background: #f8fafc; position: relative;">
                <button type="button" class="remove-module" data-index="${index}" style="position: absolute; top: 0.5rem; right: 0.5rem; width: auto; padding: 0.125rem 0.5rem; background: #ef4444; font-size: 0.75rem;">×</button>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <input type="text" class="mod-title" placeholder="Module Title" value="${mod.title || ''}" required style="font-size: 0.875rem;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <textarea class="mod-content" placeholder="Module Content" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem; font-size: 0.875rem; min-height: 60px;">${mod.content || ''}</textarea>
                </div>
            </div>
        `).join('');

        moduleInputsDiv.querySelectorAll('.remove-module').forEach(btn => {
            btn.onclick = () => {
                updateModulesFromInputs();
                modules.splice(parseInt(btn.dataset.index), 1);
                renderModules();
            };
        });
    };

    renderModules();

    modal.querySelector('#addModuleBtn').onclick = () => {
        updateModulesFromInputs();
        modules.push({ title: '', content: '', order: modules.length + 1 });
        renderModules();
    };

    modal.querySelector('#previewCourseBtn').onclick = () => {
        updateModulesFromInputs();
        const title = modal.querySelector('#m-title').value;
        const description = modal.querySelector('#m-desc').value;
        
        showCoursePreviewModal({
            title,
            description,
            modules: modules.map((mod, i) => ({ ...mod, order: i + 1 }))
        });
    };

    modal.querySelector('#closeModal').onclick = () => modal.remove();
    modal.querySelector('#courseForm').onsubmit = async (e) => {
        e.preventDefault();
        
        updateModulesFromInputs();
        
        const finalModules = modules.map((mod, i) => ({
            ...mod,
            order: i + 1
        }));

        const title = modal.querySelector('#m-title').value;
        const description = modal.querySelector('#m-desc').value;

        const method = course ? 'PUT' : 'POST';
        const url = course ? `/api/courses/${course.id}` : '/api/courses';

        const res = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description, modules: finalModules })
        });

        if (res.ok) {
            modal.remove();
            if (onSuccess) onSuccess();
        } else {
            alert('Failed to save course');
        }
    };
};
